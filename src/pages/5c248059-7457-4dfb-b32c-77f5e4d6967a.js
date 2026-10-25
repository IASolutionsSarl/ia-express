import './styleCompiler/ww-style-page-5c248059-7457-4dfb-b32c-77f5e4d6967a.css';
/*__WW_PAGE_COMPONENT_IMPORTS_START__*/

// eslint-disable-next-line no-undef
import element_3a7d6379_12d3_4387_98ff_b332bb492a63 from "@weweb-internal/ext-element-3a7d6379-12d3-4387-98ff-b332bb492a63";
import element_6d692ca2_6cdc_4805_aa0c_211102f335d0 from "@weweb-internal/ext-element-6d692ca2-6cdc-4805-aa0c-211102f335d0";
import element_6f8796b1_8273_498d_95fc_7013b7c63214 from "@weweb-internal/ext-element-6f8796b1-8273-498d-95fc-7013b7c63214";
import element_9ecb2cfc_cef7_4be8_b736_3e17a3b7e9ff from "@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff";
import element_b783dc65_d528_4f74_8c14_e27c934c39b1 from "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1";
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
        "baseId": "3a7d6379-12d3-4387-98ff-b332bb492a63",
        "importPath": "@weweb-internal/ext-element-3a7d6379-12d3-4387-98ff-b332bb492a63",
        "name": "wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63",
        "type": "element"
    },
    {
        "baseId": "6d692ca2-6cdc-4805-aa0c-211102f335d0",
        "importPath": "@weweb-internal/ext-element-6d692ca2-6cdc-4805-aa0c-211102f335d0",
        "name": "wwobject-6d692ca2-6cdc-4805-aa0c-211102f335d0",
        "type": "element"
    },
    {
        "baseId": "6f8796b1-8273-498d-95fc-7013b7c63214",
        "importPath": "@weweb-internal/ext-element-6f8796b1-8273-498d-95fc-7013b7c63214",
        "name": "wwobject-6f8796b1-8273-498d-95fc-7013b7c63214",
        "type": "element"
    },
    {
        "baseId": "9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "importPath": "@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "name": "wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff",
        "type": "element"
    },
    {
        "baseId": "b783dc65-d528-4f74-8c14-e27c934c39b1",
        "importPath": "@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1",
        "name": "wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1",
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
        app.component("wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63", element_3a7d6379_12d3_4387_98ff_b332bb492a63);
app.component("wwobject-6d692ca2-6cdc-4805-aa0c-211102f335d0", element_6d692ca2_6cdc_4805_aa0c_211102f335d0);
app.component("wwobject-6f8796b1-8273-498d-95fc-7013b7c63214", element_6f8796b1_8273_498d_95fc_7013b7c63214);
app.component("wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff", element_9ecb2cfc_cef7_4be8_b736_3e17a3b7e9ff);
app.component("wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1", element_b783dc65_d528_4f74_8c14_e27c934c39b1);
app.component("wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad", element_d7904e9d_fc9a_4d80_9e32_728e097879ad);
app.component("wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0", element_deb10a01_5eef_4aa1_9017_1b51c2ad6fd0);

        // eslint-disable-next-line no-undef
        app.component("section-99586bd3-2b15-4d6b-a025-6a50d07ca845", section_99586bd3_2b15_4d6b_a025_6a50d07ca845);
    }

    isRegistered = true;
}
