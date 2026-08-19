import { get } from 'lodash-es';
import { computed } from 'vue';

import {
    getComponentBaseConfiguration,
    getDisplayAllowedValues as getConfigurationDisplayAllowedValues,
} from '@/_common/helpers/component/component';
import { useComponentBasesStore } from '@/pinia/componentBases';
import {
    createElementSelector,
    createSectionContainerSelector,
    normalizeConfiguredStyleStates,
    PARENT_STYLE_STATE_PREFIX,
} from '@/_common/helpers/styleCompiler';
import type {
    StyleBreakpointName,
    StyleClassReader,
    StyleCompileScope,
    StyleComponentCapabilities,
    StyleCssFactory,
    StyleElementReader,
    StyleInheritanceCapability,
    StyleLibraryComponentReader,
    StyleParentStateDescriptor,
    StylePropertyDomain,
    StylePropertyTreeReader,
    StyleReader,
    StyleSectionReader,
    StyleStateDescriptor,
    StyleStateReader,
} from '@/_common/helpers/styleCompiler';
import { usePopupStore } from '@/pinia/popup';

const BASE_STATE = 'base';
const DEFAULT_STATE = 'default';
const BREAKPOINT_NAMES: StyleBreakpointName[] = ['default', 'tablet', 'mobile'];

type StyleSourceData = Record<string, any>;
type EditorLibraryComponentSourceIndex = {
    elements: StyleSourceData[];
    childLibraryComponentIds: string[];
};
type EditorStyleSourceIndex = {
    allWwObjects: StyleSourceData[];
    popupInstances: StyleSourceData[];
    libraryComponentsById: Map<string, EditorLibraryComponentSourceIndex>;
    knownParentStateUids: string[];
};
type EditorStyleSourceIndexAccessor = () => EditorStyleSourceIndex;

/**
 * Creates the reactive editor scope and reader over one shared source index.
 */
export function createEditorStyleCompilerSources() {
    const sourceIndex = computed(createEditorStyleSourceIndex);

    return {
        scope: computed(() => createEditorStyleCompileScope(sourceIndex.value)),
        reader: createEditorStyleReader(() => sourceIndex.value),
    };
}

function createEditorStyleSourceIndex(): EditorStyleSourceIndex {
    const wwObjectsByUid = getWwObjects();
    const popupInstancesByUid = usePopupStore().instances || {};
    const sections = getSections();
    const wwObjectEntries = Object.entries(wwObjectsByUid) as [string, StyleSourceData][];
    const allWwObjects = wwObjectEntries.map(([, element]) => element);
    const popupInstances = Object.values(popupInstancesByUid) as StyleSourceData[];
    const libraryComponentsById = new Map<string, EditorLibraryComponentSourceIndex>();

    for (const element of allWwObjects) {
        const parentLibraryComponentId = element.parentLibraryComponentId;
        if (!parentLibraryComponentId) continue;

        const libraryComponent = libraryComponentsById.get(parentLibraryComponentId) || {
            elements: [],
            childLibraryComponentIds: [],
        };
        libraryComponent.elements.push(element);
        libraryComponentsById.set(parentLibraryComponentId, libraryComponent);

        if (!element.libraryComponentBaseId) continue;

        if (!libraryComponent.childLibraryComponentIds.includes(element.libraryComponentBaseId)) {
            libraryComponent.childLibraryComponentIds.push(element.libraryComponentBaseId);
        }
    }

    return {
        allWwObjects,
        popupInstances,
        libraryComponentsById,
        knownParentStateUids: uniqueStrings([
            ...wwObjectEntries.map(([uid]) => uid),
            ...Object.keys(popupInstancesByUid),
            ...Object.keys(sections),
        ]).sort((uidA, uidB) => uidB.length - uidA.length),
    };
}

/**
 * Creates the editor reader used by the shared compiler.
 */
function createEditorStyleReader(getSourceIndex: EditorStyleSourceIndexAccessor): StyleReader {
    return {
        element(uid) {
            const data = getElementData(uid);
            if (!data) return null;

            return createSourceReader(data, 'element', getSourceIndex);
        },
        section(uid) {
            const data = getSections()[uid];
            if (!data) return null;

            return createSourceReader(data, 'section', getSourceIndex);
        },
        libraryComponent(id) {
            return createLibraryComponentReader(id, getSourceIndex);
        },
        styleClass(id) {
            const data = getClasses()[id];
            if (!data) return null;

            return createClassReader(data);
        },
    };
}

/**
 * Creates the current page compile scope from store ownership fields.
 */
function createEditorStyleCompileScope(sourceIndex: EditorStyleSourceIndex): StyleCompileScope {
    const page = wwLib.$store.getters['websiteData/getPage'];
    const pageSectionUids = (page?.sections || []).map((section: { uid: string }) => section.uid).filter(Boolean);
    const pageSectionUidSet = new Set(pageSectionUids);
    const componentBasesStore = useComponentBasesStore(wwLib.$pinia);
    const sections = getSections();
    const { allWwObjects, popupInstances, libraryComponentsById } = sourceIndex;
    const pageElements = allWwObjects.filter(element => pageSectionUidSet.has(element.parentSectionId));
    const rootElements = [...pageElements, ...popupInstances];
    const libraryElements = collectDeepLibraryComponentElements(libraryComponentsById, rootElements);
    const scopedElements = [...libraryElements, ...rootElements];
    const readyRootElements = rootElements.filter(element => isElementStyleSourceReady(element, componentBasesStore));
    const readyLibraryElements = libraryElements.filter(element =>
        isElementStyleSourceReady(element, componentBasesStore)
    );

    return {
        sectionUids: pageSectionUids.filter(uid => isSectionStyleSourceReady(sections[uid], componentBasesStore)),
        elementUids: uniqueStrings(readyRootElements.map(element => element.uid)),
        libraryElementUids: uniqueStrings(readyLibraryElements.map(element => element.uid)),
        libraryComponentIds: uniqueStrings(scopedElements.map(element => element.libraryComponentBaseId)).filter(
            libraryComponentId => isLibraryComponentStyleSourceReady(libraryComponentId, componentBasesStore)
        ),
    };
}

function createSourceReader(
    data: StyleSourceData,
    kind: 'element',
    getSourceIndex: EditorStyleSourceIndexAccessor
): StyleElementReader;
function createSourceReader(
    data: StyleSourceData,
    kind: 'section',
    getSourceIndex: EditorStyleSourceIndexAccessor
): StyleSectionReader;
function createSourceReader(
    data: StyleSourceData,
    kind: 'element' | 'section',
    getSourceIndex: EditorStyleSourceIndexAccessor
): StyleElementReader | StyleSectionReader {
    if (kind === 'element') {
        return {
            ...createBaseSourceReader(data, kind, getSourceIndex),
            kind() {
                return 'element' as const;
            },
            isLibraryComponentInstance() {
                return isLibraryComponentInstance(data);
            },
            isDirectSectionChild() {
                return isDirectSectionChild(data);
            },
        };
    }

    return {
        ...createBaseSourceReader(data, kind, getSourceIndex),
        kind() {
            return 'section' as const;
        },
    };
}

function createBaseSourceReader(
    data: StyleSourceData,
    kind: 'element' | 'section',
    getSourceIndex: EditorStyleSourceIndexAccessor
) {
    return {
        uid() {
            return data.uid;
        },
        baseId() {
            return getSourceBaseId(data, kind);
        },
        capabilities() {
            return createSourceCapabilities(data, kind);
        },
        states() {
            return getSourceStates(data, kind, getSourceIndex);
        },
        emitDefaultDeclarations() {
            return shouldEmitSourceDefaultDeclarations(data, kind);
        },
        parentRef() {
            return getSourceParentRef(data, kind);
        },
        style() {
            return createPropertyTreeReader(data, 'style');
        },
        content() {
            return createPropertyTreeReader(data, 'content');
        },
    };
}

function createSourceCapabilities(data: StyleSourceData, kind: 'element' | 'section'): StyleComponentCapabilities {
    const configuration = getSourceConfiguration(data, kind);
    const inherits = normalizeInheritedCapabilities(configuration?.inherit);
    const baseId = getSourceBaseId(data, kind);

    return {
        inherits,
        autoByContent: !!configuration?.options?.autoByContent,
        displayAllowedValues: getSourceDisplayAllowedValues(configuration, data),
        omitUndefinedDynamicValues: kind === 'element' && isLibraryComponentInstance(data),
        ignoredStyleProperties: getStringArray(configuration?.options?.ignoredStyleProperties),
        css: createSourceCssFactories({
            configuration,
            inherits,
            kind,
            baseId,
        }),
    };
}

function getSourceConfiguration(data: StyleSourceData, kind: 'element' | 'section') {
    const baseId = getSourceBaseId(data, kind);
    if (!baseId) return {};

    if (kind === 'section') return getComponentBaseConfiguration('section', baseId);
    if (data.libraryComponentBaseId && !data.wwObjectBaseId) {
        return getComponentBaseConfiguration('libraryComponent', baseId);
    }

    return getComponentBaseConfiguration('element', baseId);
}

function getSourceBaseId(data: StyleSourceData, kind: 'element' | 'section') {
    return kind === 'section' ? data.sectionBaseId : data.wwObjectBaseId || data.libraryComponentBaseId;
}

function createSourceCssFactories({
    configuration,
    inherits,
    kind,
    baseId,
}: {
    configuration: StyleSourceData;
    inherits: readonly StyleInheritanceCapability[];
    kind: 'element' | 'section';
    baseId: string | undefined;
}) {
    const cssFactories: StyleCssFactory[] = [];

    if (
        kind === 'element' &&
        baseId !== 'ww-text' &&
        inherits.some(inheritance => getInheritanceType(inheritance) === 'ww-text')
    ) {
        const inheritedTextCss = getComponentBaseConfiguration('element', 'ww-text')?.css;
        if (typeof inheritedTextCss === 'function') cssFactories.push(inheritedTextCss);
    }

    if (typeof configuration?.css === 'function') cssFactories.push(configuration.css);

    return cssFactories.length ? cssFactories : undefined;
}

function getInheritanceType(inheritance: StyleInheritanceCapability) {
    return typeof inheritance === 'string' ? inheritance : inheritance.type;
}

function shouldEmitSourceDefaultDeclarations(data: StyleSourceData, kind: 'element' | 'section') {
    if (kind !== 'element') return true;

    return !isLibraryComponentInstance(data);
}

function isLibraryComponentInstance(data: StyleSourceData) {
    return !!data.libraryComponentBaseId && !data.wwObjectBaseId;
}

function getSourceDisplayAllowedValues(configuration: StyleSourceData, data: StyleSourceData) {
    const rootSource = isLibraryComponentInstance(data)
        ? getConcreteLibraryComponentRootSource(data.libraryComponentBaseId)
        : null;
    const displayConfiguration = rootSource?.configuration || configuration;
    const displayData = rootSource?.data || data;
    const displayAllowedValues = getConfigurationDisplayAllowedValues(displayConfiguration, {
        content: getDefaultContentSlot(displayData),
        wwProps: {},
    });

    return Array.isArray(displayAllowedValues) ? displayAllowedValues : undefined;
}

/**
 * Resolves the concrete element rendered by a library component instance.
 *
 * The legacy inline engine merged instance style values into the concrete root before normalizing
 * them. Following nested renderless library roots preserves that behavior for values such as
 * `display: true`, which means "use the concrete component's default display".
 */
function getConcreteLibraryComponentRootSource(
    libraryComponentId: string,
    visitedLibraryComponentIds = new Set<string>()
): { configuration: StyleSourceData; data: StyleSourceData } | null {
    if (!libraryComponentId || visitedLibraryComponentIds.has(libraryComponentId)) return null;

    visitedLibraryComponentIds.add(libraryComponentId);

    const rootElementUid = getLibraryComponents()[libraryComponentId]?.rootElementId;
    const rootElement = rootElementUid ? getElementData(rootElementUid) : undefined;
    if (!rootElement) return null;

    if (rootElement.wwObjectBaseId) {
        return {
            configuration: getComponentBaseConfiguration('element', rootElement.wwObjectBaseId) || {},
            data: rootElement,
        };
    }

    if (!isLibraryComponentInstance(rootElement)) return null;

    return getConcreteLibraryComponentRootSource(rootElement.libraryComponentBaseId, visitedLibraryComponentIds);
}

function getDefaultContentSlot(data: StyleSourceData) {
    return data.content?.default || {};
}

function getSourceParentRef(data: StyleSourceData, kind: 'element' | 'section') {
    if (kind !== 'element') return null;

    const sectionUid = data.parentSectionId;
    if (!sectionUid || !getSections()[sectionUid]) return null;

    return {
        uid: sectionUid,
        selector: createSectionContainerSelector(sectionUid),
    };
}

function isDirectSectionChild(data: StyleSourceData) {
    const sectionUid = data.parentSectionId;
    if (!sectionUid) return false;

    const sectionRootElements = getSections()[sectionUid]?.content?.default?.wwObjects;
    if (!Array.isArray(sectionRootElements)) return false;

    return sectionRootElements.some(element => element?.uid === data.uid);
}

function normalizeInheritedCapabilities(value: unknown): StyleInheritanceCapability[] {
    if (Array.isArray(value)) {
        return value.flatMap(item => normalizeInheritedCapabilities(item));
    }

    if (typeof value === 'string') return [value];
    if (!isPlainRecord(value) || typeof value.type !== 'string') return [];

    const exclude = getStringArray(value.exclude);
    return exclude.length ? [{ type: value.type, exclude }] : [{ type: value.type }];
}

function createLibraryComponentReader(
    id: string,
    getSourceIndex: EditorStyleSourceIndexAccessor
): StyleLibraryComponentReader | null {
    const component = wwLib.$store.getters['libraries/getComponents'][id];
    if (!component) return null;

    return {
        rootElementUid() {
            return component.rootElementId;
        },
        childLibraryComponentIds() {
            return getSourceIndex().libraryComponentsById.get(id)?.childLibraryComponentIds || [];
        },
    };
}

function createClassReader(data: StyleSourceData): StyleClassReader {
    return {
        style() {
            return createPropertyTreeReader(data, 'style');
        },
        content() {
            return createPropertyTreeReader(data, 'content');
        },
        subClass(id) {
            const subClass = data.subClasses?.[id];
            return subClass ? createClassReader(subClass) : null;
        },
    };
}

function createPropertyTreeReader(data: StyleSourceData, domain: StylePropertyDomain): StylePropertyTreeReader {
    return {
        state(name) {
            return createStateReader(data, domain, name);
        },
    };
}

function createStateReader(data: StyleSourceData, domain: StylePropertyDomain, state: string): StyleStateReader {
    return {
        classIds() {
            return getStringArray(data._state?.classes?.[toStorageState(state)]);
        },
        subClassIds(classId) {
            return getStringArray(data._state?.subClasses?.[toStorageState(state)]?.[classId]);
        },
        breakpoint(name) {
            return {
                property(propertyName) {
                    return getPropertySlot(data, domain, state, name)?.[propertyName];
                },
                customCss() {
                    return getPropertySlot(data, domain, state, name)?.customCss;
                },
                customCssProperty(propertyName) {
                    return getPropertySlot(data, domain, state, name)?.customCss?.[propertyName];
                },
                customCssEntries() {
                    const customCss = getPropertySlot(data, domain, state, name)?.customCss;
                    if (
                        !customCss ||
                        typeof customCss !== 'object' ||
                        Array.isArray(customCss) ||
                        '__wwtype' in customCss
                    ) {
                        return [];
                    }

                    return Object.entries(customCss);
                },
            };
        },
    };
}

function getPropertySlot(
    data: StyleSourceData,
    domain: StylePropertyDomain,
    state: string,
    breakpoint: StyleBreakpointName
) {
    const slotKey = createSlotKey(state, breakpoint);
    return domain === 'style' ? get(data, `_state.style.${slotKey}`) : get(data, `content.${slotKey}`);
}

function createSlotKey(state: string, breakpoint: StyleBreakpointName) {
    const storageState = toStorageState(state);
    if (storageState === DEFAULT_STATE) return breakpoint;

    return `${storageState}_${breakpoint}`;
}

function toStorageState(state: string) {
    return state === BASE_STATE ? DEFAULT_STATE : state;
}

function getSourceStates(
    data: StyleSourceData,
    kind: 'element' | 'section',
    getSourceIndex: EditorStyleSourceIndexAccessor
) {
    const states = new Map<string, StyleStateDescriptor>();
    const selectorsByLabel = getConfiguredSelectorsByStateLabel(data, kind);

    for (const state of data._state?.states || []) {
        if (!state?.id) continue;

        const label = typeof state.label === 'string' ? state.label : undefined;
        states.set(state.id, createStateDescriptor(state.id, selectorsByLabel, getSourceIndex, label));
    }

    collectStateNamesFromSlotKeys(states, Object.keys(data._state?.style || {}), selectorsByLabel, getSourceIndex);
    collectStateNamesFromSlotKeys(states, Object.keys(data.content || {}), selectorsByLabel, getSourceIndex);
    collectStateNamesFromClassKeys(states, Object.keys(data._state?.classes || {}), selectorsByLabel, getSourceIndex);
    collectStateNamesFromClassKeys(
        states,
        Object.keys(data._state?.subClasses || {}),
        selectorsByLabel,
        getSourceIndex
    );

    states.delete(BASE_STATE);
    states.delete(DEFAULT_STATE);
    return [...states.values()];
}

function getConfiguredSelectorsByStateLabel(data: StyleSourceData, kind: 'element' | 'section') {
    const selectorsByLabel = new Map<string, readonly string[]>();
    const configuration = getSourceConfiguration(data, kind);

    for (const state of normalizeConfiguredStyleStates(configuration?.states)) {
        if (state.selectors?.length) selectorsByLabel.set(state.label, state.selectors);
    }

    return selectorsByLabel;
}

function collectStateNamesFromSlotKeys(
    states: Map<string, StyleStateDescriptor>,
    keys: string[],
    selectorsByLabel: Map<string, readonly string[]>,
    getSourceIndex: EditorStyleSourceIndexAccessor
) {
    for (const key of keys) {
        for (const breakpoint of BREAKPOINT_NAMES) {
            const suffix = `_${breakpoint}`;
            if (!key.endsWith(suffix)) continue;

            const state = key.slice(0, -suffix.length);
            if (state && !states.has(state)) {
                states.set(state, createStateDescriptor(state, selectorsByLabel, getSourceIndex));
            }
        }
    }
}

function collectStateNamesFromClassKeys(
    states: Map<string, StyleStateDescriptor>,
    keys: string[],
    selectorsByLabel: Map<string, readonly string[]>,
    getSourceIndex: EditorStyleSourceIndexAccessor
) {
    for (const key of keys) {
        if (key !== DEFAULT_STATE && key !== BASE_STATE && !states.has(key)) {
            states.set(key, createStateDescriptor(key, selectorsByLabel, getSourceIndex));
        }
    }
}

function createStateDescriptor(
    id: string,
    selectorsByLabel: Map<string, readonly string[]>,
    getSourceIndex: EditorStyleSourceIndexAccessor,
    label?: string
): StyleStateDescriptor {
    const parent = createParentStateDescriptor(id, getSourceIndex);
    if (parent) return { id, parent };

    const stateLabel = label || id;
    const selectors = selectorsByLabel.get(stateLabel);

    return selectors ? { id, label: stateLabel, selectors } : { id, label };
}

function createParentStateDescriptor(
    id: string,
    getSourceIndex: EditorStyleSourceIndexAccessor
): StyleParentStateDescriptor | null {
    const parentStateReference = parseParentStateReference(id, () => getSourceIndex().knownParentStateUids);
    if (!parentStateReference) return null;

    const parentSource = getParentStateSource(parentStateReference.uid);
    if (!parentSource) {
        return {
            uid: parentStateReference.uid,
            stateId: parentStateReference.stateId,
        };
    }

    const parentState = findSourceState(parentSource.data, parentStateReference.stateId);
    const parentStateLabel = getSourceStateLabel(parentState, parentStateReference.stateId);
    const parentSelectors = getConfiguredSelectorsByStateLabel(parentSource.data, parentSource.kind).get(
        parentStateLabel
    );

    return {
        uid: parentStateReference.uid,
        stateId: parentStateReference.stateId,
        selector: parentSource.selector,
        selectors: parentSelectors,
    };
}

function parseParentStateReference(id: string, getKnownParentStateUids: () => string[]) {
    if (!id.startsWith(PARENT_STYLE_STATE_PREFIX)) return null;

    const payload = id.slice(PARENT_STYLE_STATE_PREFIX.length);
    for (const uid of getKnownParentStateUids()) {
        const prefix = `${uid}_`;
        if (!payload.startsWith(prefix)) continue;

        const stateId = payload.slice(prefix.length);
        return stateId ? { uid, stateId } : null;
    }

    return null;
}

function getParentStateSource(uid: string) {
    const element = getElementData(uid);
    if (element) {
        return {
            data: element,
            kind: 'element' as const,
            selector: createElementSelector(uid),
        };
    }

    const section = getSections()[uid];
    if (section) {
        return {
            data: section,
            kind: 'section' as const,
            selector: createSectionContainerSelector(uid),
        };
    }

    return null;
}

function findSourceState(data: StyleSourceData, stateId: string) {
    return (data._state?.states || []).find(
        (state: StyleSourceData) => state?.id === stateId || state?.label === stateId
    );
}

function getSourceStateLabel(state: StyleSourceData | undefined, fallback: string) {
    return typeof state?.label === 'string' ? state.label : fallback;
}

function collectDeepLibraryComponentElements(
    libraryComponentsById: Map<string, EditorLibraryComponentSourceIndex>,
    rootElements: StyleSourceData[]
) {
    const result: StyleSourceData[] = [];
    const seenElementUids = new Set<string>();
    const pendingLibraryIds = uniqueStrings(rootElements.map(element => element.libraryComponentBaseId));
    const seenLibraryIds = new Set<string>();

    while (pendingLibraryIds.length) {
        const libraryComponentId = pendingLibraryIds.shift();
        if (!libraryComponentId || seenLibraryIds.has(libraryComponentId)) continue;

        seenLibraryIds.add(libraryComponentId);

        for (const element of libraryComponentsById.get(libraryComponentId)?.elements || []) {
            if (seenElementUids.has(element.uid)) continue;

            seenElementUids.add(element.uid);
            result.push(element);

            if (element.libraryComponentBaseId) pendingLibraryIds.push(element.libraryComponentBaseId);
        }
    }

    return result;
}

function getWwObjects(): Record<string, StyleSourceData> {
    return wwLib.$store.getters['websiteData/getWwObjects'] || {};
}

function getElementData(uid: string): StyleSourceData | undefined {
    return getWwObjects()[uid] || usePopupStore().instances?.[uid];
}

function getSections(): Record<string, StyleSourceData> {
    return wwLib.$store.getters['websiteData/getSections'] || {};
}

function getClasses(): Record<string, StyleSourceData> {
    return wwLib.$store.getters['libraries/getClasses'] || {};
}

function getLibraryComponents(): Record<string, StyleSourceData> {
    return wwLib.$store.getters['libraries/getComponents'] || {};
}

function isSectionStyleSourceReady(
    data: StyleSourceData | undefined,
    componentBasesStore: ReturnType<typeof useComponentBasesStore>
) {
    if (!data) return false;

    return isRegisteredComponentBaseReady('section', data.sectionBaseId, componentBasesStore);
}

function isElementStyleSourceReady(
    data: StyleSourceData | undefined,
    componentBasesStore: ReturnType<typeof useComponentBasesStore>
) {
    if (!data) return false;
    if (!data.wwObjectBaseId) return true;

    return isRegisteredComponentBaseReady('wwobject', data.wwObjectBaseId, componentBasesStore);
}

function isLibraryComponentStyleSourceReady(
    libraryComponentId: string,
    componentBasesStore: ReturnType<typeof useComponentBasesStore>
) {
    const rootElementUid = getLibraryComponents()[libraryComponentId]?.rootElementId;
    if (!rootElementUid) return true;

    return isElementStyleSourceReady(getElementData(rootElementUid), componentBasesStore);
}

function isRegisteredComponentBaseReady(
    type: 'section' | 'wwobject',
    baseId: string | undefined,
    componentBasesStore: ReturnType<typeof useComponentBasesStore>
) {
    if (!baseId) return true;

    return !!componentBasesStore.configurations[`${type}-${baseId}`];
}

function getStringArray(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function uniqueStrings(values: unknown[]) {
    return [...new Set(values.filter((value): value is string => typeof value === 'string' && !!value))];
}

function isPlainRecord(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
