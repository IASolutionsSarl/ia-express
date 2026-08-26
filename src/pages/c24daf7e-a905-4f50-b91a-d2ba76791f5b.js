import './styleCompiler/ww-style-page-c24daf7e-a905-4f50-b91a-d2ba76791f5b.css';
/*__WW_PAGE_COMPONENT_IMPORTS_START__*/

// eslint-disable-next-line no-undef
import element_1b1e2173_9b78_42cc_a8ee_a6167caea340 from "@/components/elements/element-1b1e2173-9b78-42cc-a8ee-a6167caea340/src/wwElement.vue";
import element_3a7d6379_12d3_4387_98ff_b332bb492a63 from "@/components/elements/element-3a7d6379-12d3-4387-98ff-b332bb492a63/src/wwElement.vue";
import element_69d0b3ef_b265_494c_8cd1_874da4aa1834 from "@/components/elements/element-69d0b3ef-b265-494c-8cd1-874da4aa1834/src/wwElement.vue";
import element_6f8796b1_8273_498d_95fc_7013b7c63214 from "@/components/elements/element-6f8796b1-8273-498d-95fc-7013b7c63214/src/wwElement.vue";
import element_83d890fb_84f9_4386_b459_fb4be89a8e15 from "@/components/elements/element-83d890fb-84f9-4386-b459-fb4be89a8e15/src/wwElement.vue";
import element_b783dc65_d528_4f74_8c14_e27c934c39b1 from "@/components/elements/element-b783dc65-d528-4f74-8c14-e27c934c39b1/src/wwElement.vue";
import element_c6c0c00e_49fd_4cb9_bd78_5bc09945721e from "@/components/elements/element-c6c0c00e-49fd-4cb9-bd78-5bc09945721e/src/wwElement.vue";
import element_d7904e9d_fc9a_4d80_9e32_728e097879ad from "@/components/elements/element-d7904e9d-fc9a-4d80-9e32-728e097879ad/src/wwElement.vue";
import element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0 from "@/components/elements/element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0/src/wwElement.vue";

// eslint-disable-next-line no-undef
import section_99586bd3_2b15_4d6b_a025_6a50d07ca845 from "@/components/sections/section-99586bd3-2b15-4d6b-a025-6a50d07ca845/src/wwSection.vue";

/*__WW_PAGE_COMPONENT_IMPORTS_END__*/

import { registerSsrPageComponents } from '@/_front/rendering/ssrPageComponents';

let isRegistered = false;

export default async function registerPageComponents(app) {
    if (isRegistered) return;

    if (import.meta.env.SSR) {
        await registerSsrPageComponents(
            app,
            // eslint-disable-next-line no-undef
            /*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_START__*/
[
    {
        "baseId": "1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "importPath": "@/components/elements/element-1b1e2173-9b78-42cc-a8ee-a6167caea340/src/wwElement.vue",
        "name": "wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "type": "element"
    },
    {
        "baseId": "3a7d6379-12d3-4387-98ff-b332bb492a63",
        "importPath": "@/components/elements/element-3a7d6379-12d3-4387-98ff-b332bb492a63/src/wwElement.vue",
        "name": "wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63",
        "type": "element"
    },
    {
        "baseId": "69d0b3ef-b265-494c-8cd1-874da4aa1834",
        "importPath": "@/components/elements/element-69d0b3ef-b265-494c-8cd1-874da4aa1834/src/wwElement.vue",
        "name": "wwobject-69d0b3ef-b265-494c-8cd1-874da4aa1834",
        "type": "element"
    },
    {
        "baseId": "6f8796b1-8273-498d-95fc-7013b7c63214",
        "importPath": "@/components/elements/element-6f8796b1-8273-498d-95fc-7013b7c63214/src/wwElement.vue",
        "name": "wwobject-6f8796b1-8273-498d-95fc-7013b7c63214",
        "type": "element"
    },
    {
        "baseId": "83d890fb-84f9-4386-b459-fb4be89a8e15",
        "importPath": "@/components/elements/element-83d890fb-84f9-4386-b459-fb4be89a8e15/src/wwElement.vue",
        "name": "wwobject-83d890fb-84f9-4386-b459-fb4be89a8e15",
        "type": "element"
    },
    {
        "baseId": "b783dc65-d528-4f74-8c14-e27c934c39b1",
        "importPath": "@/components/elements/element-b783dc65-d528-4f74-8c14-e27c934c39b1/src/wwElement.vue",
        "name": "wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "type": "element"
    },
    {
        "baseId": "c6c0c00e-49fd-4cb9-bd78-5bc09945721e",
        "importPath": "@/components/elements/element-c6c0c00e-49fd-4cb9-bd78-5bc09945721e/src/wwElement.vue",
        "name": "wwobject-c6c0c00e-49fd-4cb9-bd78-5bc09945721e",
        "type": "element"
    },
    {
        "baseId": "d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "importPath": "@/components/elements/element-d7904e9d-fc9a-4d80-9e32-728e097879ad/src/wwElement.vue",
        "name": "wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "type": "element"
    },
    {
        "baseId": "deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "importPath": "@/components/elements/element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0/src/wwElement.vue",
        "name": "wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "type": "element"
    },
    {
        "baseId": "99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "importPath": "@/components/sections/section-99586bd3-2b15-4d6b-a025-6a50d07ca845/src/wwSection.vue",
        "name": "section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "type": "section"
    }
]
/*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_END__*/
        );
    } else {
        // eslint-disable-next-line no-undef
        app.component("wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340", element_1b1e2173_9b78_42cc_a8ee_a6167caea340);
app.component("wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63", element_3a7d6379_12d3_4387_98ff_b332bb492a63);
app.component("wwobject-69d0b3ef-b265-494c-8cd1-874da4aa1834", element_69d0b3ef_b265_494c_8cd1_874da4aa1834);
app.component("wwobject-6f8796b1-8273-498d-95fc-7013b7c63214", element_6f8796b1_8273_498d_95fc_7013b7c63214);
app.component("wwobject-83d890fb-84f9-4386-b459-fb4be89a8e15", element_83d890fb_84f9_4386_b459_fb4be89a8e15);
app.component("wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1", element_b783dc65_d528_4f74_8c14_e27c934c39b1);
app.component("wwobject-c6c0c00e-49fd-4cb9-bd78-5bc09945721e", element_c6c0c00e_49fd_4cb9_bd78_5bc09945721e);
app.component("wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad", element_d7904e9d_fc9a_4d80_9e32_728e097879ad);
app.component("wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0", element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0);

        // eslint-disable-next-line no-undef
        app.component("section-99586bd3-2b15-4d6b-a025-6a50d07ca845", section_99586bd3_2b15_4d6b_a025_6a50d07ca845);
    }

    isRegistered = true;
}
