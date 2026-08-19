import type { ComputedRef } from 'vue';

type LibraryComponentRenderingData = {
    rendering?: {
        conditionalRendering?: {
            raw?: unknown;
            value?: unknown;
        };
    };
};

export function createLibraryComponentRenderingData({
    raw,
    value,
}: {
    raw: ComputedRef<unknown>;
    value: ComputedRef<unknown>;
}) {
    return {
        rendering: {
            conditionalRendering: { raw, value },
        },
    };
}

export function resolveLibraryComponentConditionalRendering(
    libraryComponentData: LibraryComponentRenderingData | null | undefined,
    fallback: () => unknown
) {
    const conditionalRendering = libraryComponentData?.rendering?.conditionalRendering;
    if (conditionalRendering?.raw === undefined || conditionalRendering.value === undefined) {
        return fallback();
    }

    return conditionalRendering.value;
}
