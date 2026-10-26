import './styleCompiler/ww-style-page-b088d4cd-7121-4c2e-a86d-06a9f39b7ffc.css';
/*__WW_PAGE_COMPONENT_IMPORTS_START__*/

// eslint-disable-next-line no-undef
import element_1b1e2173_9b78_42cc_a8ee_a6167caea340 from "@weweb-internal/ext-element-1b1e2173-9b78-42cc-a8ee-a6167caea340";
import element_1ba25bdf_dee9_4e0e_a0b8_b3f3128c3b65 from "@weweb-internal/ext-element-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65";
import element_2dff5957_3bd8_46f9_afa3_a5c5bab91931 from "@weweb-internal/ext-element-2dff5957-3bd8-46f9-afa3-a5c5bab91931";
import element_3a7d6379_12d3_4387_98ff_b332bb492a63 from "@weweb-internal/ext-element-3a7d6379-12d3-4387-98ff-b332bb492a63";
import element_59dca300_db78_42e4_a7a6_0cbf22d3cc82 from "@weweb-internal/ext-element-59dca300-db78-42e4-a7a6-0cbf22d3cc82";
import element_6047b8df_81b7_45a7_a6b3_7355fb2fa3cd from "@weweb-internal/ext-element-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd";
import element_6145eb60_0af8_4e52_bcc6_dc0f6743654e from "@weweb-internal/ext-element-6145eb60-0af8-4e52-bcc6-dc0f6743654e";
import element_97a63460_5c25_4d74_ac1f_86693c2e4a08 from "@weweb-internal/ext-element-97a63460-5c25-4d74-ac1f-86693c2e4a08";
import element_9ecb2cfc_cef7_4be8_b736_3e17a3b7e9ff from "@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff";
import element_aa29a661_07ce_484e_8abb_456186211282 from "@weweb-internal/ext-element-aa29a661-07ce-484e-8abb-456186211282";
import element_b783dc65_d528_4f74_8c14_e27c934c39b1 from "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1";
import element_c6c0c00e_49fd_4cb9_bd78_5bc09945721e from "@weweb-internal/ext-element-c6c0c00e-49fd-4cb9-bd78-5bc09945721e";
import element_d2eeb897_ad95_49e4_8394_fe3f5c9a81fb from "@weweb-internal/ext-element-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb";
import element_d7904e9d_fc9a_4d80_9e32_728e097879ad from "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad";
import element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0 from "@weweb-internal/ext-element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0";

// eslint-disable-next-line no-undef
import section_99586bd3_2b15_4d6b_a025_6a50d07ca845 from "@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845";

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
        "importPath": "@weweb-internal/ext-element-1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "name": "wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340",
        "type": "element"
    },
    {
        "baseId": "1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65",
        "importPath": "@weweb-internal/ext-element-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65",
        "name": "wwobject-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65",
        "type": "element"
    },
    {
        "baseId": "2dff5957-3bd8-46f9-afa3-a5c5bab91931",
        "importPath": "@weweb-internal/ext-element-2dff5957-3bd8-46f9-afa3-a5c5bab91931",
        "name": "wwobject-2dff5957-3bd8-46f9-afa3-a5c5bab91931",
        "type": "element"
    },
    {
        "baseId": "3a7d6379-12d3-4387-98ff-b332bb492a63",
        "importPath": "@weweb-internal/ext-element-3a7d6379-12d3-4387-98ff-b332bb492a63",
        "name": "wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63",
        "type": "element"
    },
    {
        "baseId": "59dca300-db78-42e4-a7a6-0cbf22d3cc82",
        "importPath": "@weweb-internal/ext-element-59dca300-db78-42e4-a7a6-0cbf22d3cc82",
        "name": "wwobject-59dca300-db78-42e4-a7a6-0cbf22d3cc82",
        "type": "element"
    },
    {
        "baseId": "6047b8df-81b7-45a7-a6b3-7355fb2fa3cd",
        "importPath": "@weweb-internal/ext-element-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd",
        "name": "wwobject-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd",
        "type": "element"
    },
    {
        "baseId": "6145eb60-0af8-4e52-bcc6-dc0f6743654e",
        "importPath": "@weweb-internal/ext-element-6145eb60-0af8-4e52-bcc6-dc0f6743654e",
        "name": "wwobject-6145eb60-0af8-4e52-bcc6-dc0f6743654e",
        "type": "element"
    },
    {
        "baseId": "97a63460-5c25-4d74-ac1f-86693c2e4a08",
        "importPath": "@weweb-internal/ext-element-97a63460-5c25-4d74-ac1f-86693c2e4a08",
        "name": "wwobject-97a63460-5c25-4d74-ac1f-86693c2e4a08",
        "type": "element"
    },
    {
        "baseId": "9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "importPath": "@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "name": "wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "type": "element"
    },
    {
        "baseId": "aa29a661-07ce-484e-8abb-456186211282",
        "importPath": "@weweb-internal/ext-element-aa29a661-07ce-484e-8abb-456186211282",
        "name": "wwobject-aa29a661-07ce-484e-8abb-456186211282",
        "type": "element"
    },
    {
        "baseId": "b783dc65-d528-4f74-8c14-e27c934c39b1",
        "importPath": "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "name": "wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "type": "element"
    },
    {
        "baseId": "c6c0c00e-49fd-4cb9-bd78-5bc09945721e",
        "importPath": "@weweb-internal/ext-element-c6c0c00e-49fd-4cb9-bd78-5bc09945721e",
        "name": "wwobject-c6c0c00e-49fd-4cb9-bd78-5bc09945721e",
        "type": "element"
    },
    {
        "baseId": "d2eeb897-ad95-49e4-8394-fe3f5c9a81fb",
        "importPath": "@weweb-internal/ext-element-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb",
        "name": "wwobject-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb",
        "type": "element"
    },
    {
        "baseId": "d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "importPath": "@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "name": "wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad",
        "type": "element"
    },
    {
        "baseId": "deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "importPath": "@weweb-internal/ext-element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "name": "wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0",
        "type": "element"
    },
    {
        "baseId": "99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "importPath": "@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "name": "section-99586bd3-2b15-4d6b-a025-6a50d07ca845",
        "type": "section"
    }
]
/*__WW_SSR_PAGE_COMPONENT_DESCRIPTORS_END__*/
        );
    } else {
        // eslint-disable-next-line no-undef
        app.component("wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340", element_1b1e2173_9b78_42cc_a8ee_a6167caea340);
app.component("wwobject-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65", element_1ba25bdf_dee9_4e0e_a0b8_b3f3128c3b65);
app.component("wwobject-2dff5957-3bd8-46f9-afa3-a5c5bab91931", element_2dff5957_3bd8_46f9_afa3_a5c5bab91931);
app.component("wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63", element_3a7d6379_12d3_4387_98ff_b332bb492a63);
app.component("wwobject-59dca300-db78-42e4-a7a6-0cbf22d3cc82", element_59dca300_db78_42e4_a7a6_0cbf22d3cc82);
app.component("wwobject-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd", element_6047b8df_81b7_45a7_a6b3_7355fb2fa3cd);
app.component("wwobject-6145eb60-0af8-4e52-bcc6-dc0f6743654e", element_6145eb60_0af8_4e52_bcc6_dc0f6743654e);
app.component("wwobject-97a63460-5c25-4d74-ac1f-86693c2e4a08", element_97a63460_5c25_4d74_ac1f_86693c2e4a08);
app.component("wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff", element_9ecb2cfc_cef7_4be8_b736_3e17a3b7e9ff);
app.component("wwobject-aa29a661-07ce-484e-8abb-456186211282", element_aa29a661_07ce_484e_8abb_456186211282);
app.component("wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1", element_b783dc65_d528_4f74_8c14_e27c934c39b1);
app.component("wwobject-c6c0c00e-49fd-4cb9-bd78-5bc09945721e", element_c6c0c00e_49fd_4cb9_bd78_5bc09945721e);
app.component("wwobject-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb", element_d2eeb897_ad95_49e4_8394_fe3f5c9a81fb);
app.component("wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad", element_d7904e9d_fc9a_4d80_9e32_728e097879ad);
app.component("wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0", element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0);

        // eslint-disable-next-line no-undef
        app.component("section-99586bd3-2b15-4d6b-a025-6a50d07ca845", section_99586bd3_2b15_4d6b_a025_6a50d07ca845);
    }

    isRegistered = true;
}
