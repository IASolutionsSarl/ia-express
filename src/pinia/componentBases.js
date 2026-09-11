import { defineStore } from 'pinia';
import { getInheritedConfiguration } from '@/_common/helpers/configuration/configuration';
 
/* wwFront:start */
// eslint-disable-next-line no-undef
import plugin2bd1c68831c5443eae2559aa5b6431fb from '@weweb-internal/ext-plugin-2bd1c688-31c5-443e-ae25-59aa5b6431fb/config';
import pluginf9ef41c31c534857855bf2f6a40b7186 from '@weweb-internal/ext-plugin-f9ef41c3-1c53-4857-855b-f2f6a40b7186/config';
import plugin1fa0dd685069436c9a7d3b54c340f1fa from '@weweb-internal/ext-plugin-1fa0dd68-5069-436c-9a7d-3b54c340f1fa/config';
import section99586bd32b154d6ba0256a50d07ca845 from '@weweb-internal/ext-section-99586bd3-2b15-4d6b-a025-6a50d07ca845/config';
import wwobjectfd8c482f532c4aeba7ae6904a6b62a1b from '@weweb-internal/ext-element-fd8c482f-532c-4aeb-a7ae-6904a6b62a1b/config';
import wwobject83d890fb84f94386b459fb4be89a8e15 from '@weweb-internal/ext-element-83d890fb-84f9-4386-b459-fb4be89a8e15/config';
import wwobject6f8796b18273498d95fc7013b7c63214 from '@weweb-internal/ext-element-6f8796b1-8273-498d-95fc-7013b7c63214/config';
import wwobject70a5385853ca40a5ad88c1cd33b5cc9f from '@weweb-internal/ext-element-70a53858-53ca-40a5-ad88-c1cd33b5cc9f/config';
import wwobjectd2eeb897ad9549e48394fe3f5c9a81fb from '@weweb-internal/ext-element-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb/config';
import wwobject3082cb3f30334e6e82221fba3af145fe from '@weweb-internal/ext-element-3082cb3f-3033-4e6e-8222-1fba3af145fe/config';
import wwobjecta823467cbdc74ceca38c71875c4c214a from '@weweb-internal/ext-element-a823467c-bdc7-4cec-a38c-71875c4c214a/config';
import wwobject2c8e3e543ea348eab8c8e7580e3362a2 from '@weweb-internal/ext-element-2c8e3e54-3ea3-48ea-b8c8-e7580e3362a2/config';
import wwobject1b1e21739b7842cca8eea6167caea340 from '@weweb-internal/ext-element-1b1e2173-9b78-42cc-a8ee-a6167caea340/config';
import wwobject9ae1fce82e314bfda4d20450235bdfd5 from '@weweb-internal/ext-element-9ae1fce8-2e31-4bfd-a4d2-0450235bdfd5/config';
import wwobjectaa27b26f06864c2998c58217044045b7 from '@weweb-internal/ext-element-aa27b26f-0686-4c29-98c5-8217044045b7/config';
import wwobject97a634605c254d74ac1f86693c2e4a08 from '@weweb-internal/ext-element-97a63460-5c25-4d74-ac1f-86693c2e4a08/config';
import wwobject9ecb2cfccef74be8b7363e17a3b7e9ff from '@weweb-internal/ext-element-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff/config';
import wwobject2dff59573bd846f9afa3a5c5bab91931 from '@weweb-internal/ext-element-2dff5957-3bd8-46f9-afa3-a5c5bab91931/config';
import wwobject1ba25bdfdee94e0ea0b8b3f3128c3b65 from '@weweb-internal/ext-element-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65/config';
import wwobjectaa29a66107ce484e8abb456186211282 from '@weweb-internal/ext-element-aa29a661-07ce-484e-8abb-456186211282/config';
import wwobject985570fcb3c04566800482ab3b30a11d from '@weweb-internal/ext-element-985570fc-b3c0-4566-8004-82ab3b30a11d/config';
import wwobject0d3e75d19e7744cba2728b0825fbc5da from '@weweb-internal/ext-element-0d3e75d1-9e77-44cb-a272-8b0825fbc5da/config';
import wwobjectdeb10a015eef4aa190171b51c2ad6fd0 from '@weweb-internal/ext-element-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0/config';
import wwobjectaeb78b9a6fb64c49931dfaedcfad67ba from '@weweb-internal/ext-element-aeb78b9a-6fb6-4c49-931d-faedcfad67ba/config';
import wwobjectd7904e9dfc9a4d809e32728e097879ad from '@weweb-internal/ext-element-d7904e9d-fc9a-4d80-9e32-728e097879ad/config';
import wwobject59dca300db7842e4a7a60cbf22d3cc82 from '@weweb-internal/ext-element-59dca300-db78-42e4-a7a6-0cbf22d3cc82/config';
import wwobjectb783dc65d5284f748c14e27c934c39b1 from '@weweb-internal/ext-element-b783dc65-d528-4f74-8c14-e27c934c39b1/config';
import wwobject3a7d637912d3438798ffb332bb492a63 from '@weweb-internal/ext-element-3a7d6379-12d3-4387-98ff-b332bb492a63/config';
import wwobject99ea5bf7b91e43ea8ec3dbaf2b171e34 from '@weweb-internal/ext-element-99ea5bf7-b91e-43ea-8ec3-dbaf2b171e34/config';
import wwobject69d0b3efb265494c8cd1874da4aa1834 from '@weweb-internal/ext-element-69d0b3ef-b265-494c-8cd1-874da4aa1834/config';
import wwobject53401515b6944c79a88dabeecb1de562 from '@weweb-internal/ext-element-53401515-b694-4c79-a88d-abeecb1de562/config';
import wwobject7179ba70c5d749a59828f85704fd1efc from '@weweb-internal/ext-element-7179ba70-c5d7-49a5-9828-f85704fd1efc/config';
import wwobjectc6c0c00e49fd4cb9bd785bc09945721e from '@weweb-internal/ext-element-c6c0c00e-49fd-4cb9-bd78-5bc09945721e/config';
import wwobject6145eb600af84e52bcc6dc0f6743654e from '@weweb-internal/ext-element-6145eb60-0af8-4e52-bcc6-dc0f6743654e/config';
import wwobject6047b8df81b745a7a6b37355fb2fa3cd from '@weweb-internal/ext-element-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd/config';
/* wwFront:end */

export const useComponentBasesStore = defineStore('componentBases', () => {
    let configurations;
    /* wwFront:start */
    // eslint-disable-next-line no-undef
    configurations = {'plugin-2bd1c688-31c5-443e-ae25-59aa5b6431fb': getInheritedConfiguration({ ...plugin2bd1c68831c5443eae2559aa5b6431fb, name: 'plugin-2bd1c688-31c5-443e-ae25-59aa5b6431fb' }),
'plugin-f9ef41c3-1c53-4857-855b-f2f6a40b7186': getInheritedConfiguration({ ...pluginf9ef41c31c534857855bf2f6a40b7186, name: 'plugin-f9ef41c3-1c53-4857-855b-f2f6a40b7186' }),
'plugin-1fa0dd68-5069-436c-9a7d-3b54c340f1fa': getInheritedConfiguration({ ...plugin1fa0dd685069436c9a7d3b54c340f1fa, name: 'plugin-1fa0dd68-5069-436c-9a7d-3b54c340f1fa' }),
'section-99586bd3-2b15-4d6b-a025-6a50d07ca845': getInheritedConfiguration({ ...section99586bd32b154d6ba0256a50d07ca845, name: 'section-99586bd3-2b15-4d6b-a025-6a50d07ca845' }),
'wwobject-fd8c482f-532c-4aeb-a7ae-6904a6b62a1b': getInheritedConfiguration({ ...wwobjectfd8c482f532c4aeba7ae6904a6b62a1b, name: 'wwobject-fd8c482f-532c-4aeb-a7ae-6904a6b62a1b' }),
'wwobject-83d890fb-84f9-4386-b459-fb4be89a8e15': getInheritedConfiguration({ ...wwobject83d890fb84f94386b459fb4be89a8e15, name: 'wwobject-83d890fb-84f9-4386-b459-fb4be89a8e15' }),
'wwobject-6f8796b1-8273-498d-95fc-7013b7c63214': getInheritedConfiguration({ ...wwobject6f8796b18273498d95fc7013b7c63214, name: 'wwobject-6f8796b1-8273-498d-95fc-7013b7c63214' }),
'wwobject-70a53858-53ca-40a5-ad88-c1cd33b5cc9f': getInheritedConfiguration({ ...wwobject70a5385853ca40a5ad88c1cd33b5cc9f, name: 'wwobject-70a53858-53ca-40a5-ad88-c1cd33b5cc9f' }),
'wwobject-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb': getInheritedConfiguration({ ...wwobjectd2eeb897ad9549e48394fe3f5c9a81fb, name: 'wwobject-d2eeb897-ad95-49e4-8394-fe3f5c9a81fb' }),
'wwobject-3082cb3f-3033-4e6e-8222-1fba3af145fe': getInheritedConfiguration({ ...wwobject3082cb3f30334e6e82221fba3af145fe, name: 'wwobject-3082cb3f-3033-4e6e-8222-1fba3af145fe' }),
'wwobject-a823467c-bdc7-4cec-a38c-71875c4c214a': getInheritedConfiguration({ ...wwobjecta823467cbdc74ceca38c71875c4c214a, name: 'wwobject-a823467c-bdc7-4cec-a38c-71875c4c214a' }),
'wwobject-2c8e3e54-3ea3-48ea-b8c8-e7580e3362a2': getInheritedConfiguration({ ...wwobject2c8e3e543ea348eab8c8e7580e3362a2, name: 'wwobject-2c8e3e54-3ea3-48ea-b8c8-e7580e3362a2' }),
'wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340': getInheritedConfiguration({ ...wwobject1b1e21739b7842cca8eea6167caea340, name: 'wwobject-1b1e2173-9b78-42cc-a8ee-a6167caea340' }),
'wwobject-9ae1fce8-2e31-4bfd-a4d2-0450235bdfd5': getInheritedConfiguration({ ...wwobject9ae1fce82e314bfda4d20450235bdfd5, name: 'wwobject-9ae1fce8-2e31-4bfd-a4d2-0450235bdfd5' }),
'wwobject-aa27b26f-0686-4c29-98c5-8217044045b7': getInheritedConfiguration({ ...wwobjectaa27b26f06864c2998c58217044045b7, name: 'wwobject-aa27b26f-0686-4c29-98c5-8217044045b7' }),
'wwobject-97a63460-5c25-4d74-ac1f-86693c2e4a08': getInheritedConfiguration({ ...wwobject97a634605c254d74ac1f86693c2e4a08, name: 'wwobject-97a63460-5c25-4d74-ac1f-86693c2e4a08' }),
'wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff': getInheritedConfiguration({ ...wwobject9ecb2cfccef74be8b7363e17a3b7e9ff, name: 'wwobject-9ecb2cfc-cef7-4be8-b736-3e17a3b7e9ff' }),
'wwobject-2dff5957-3bd8-46f9-afa3-a5c5bab91931': getInheritedConfiguration({ ...wwobject2dff59573bd846f9afa3a5c5bab91931, name: 'wwobject-2dff5957-3bd8-46f9-afa3-a5c5bab91931' }),
'wwobject-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65': getInheritedConfiguration({ ...wwobject1ba25bdfdee94e0ea0b8b3f3128c3b65, name: 'wwobject-1ba25bdf-dee9-4e0e-a0b8-b3f3128c3b65' }),
'wwobject-aa29a661-07ce-484e-8abb-456186211282': getInheritedConfiguration({ ...wwobjectaa29a66107ce484e8abb456186211282, name: 'wwobject-aa29a661-07ce-484e-8abb-456186211282' }),
'wwobject-985570fc-b3c0-4566-8004-82ab3b30a11d': getInheritedConfiguration({ ...wwobject985570fcb3c04566800482ab3b30a11d, name: 'wwobject-985570fc-b3c0-4566-8004-82ab3b30a11d' }),
'wwobject-0d3e75d1-9e77-44cb-a272-8b0825fbc5da': getInheritedConfiguration({ ...wwobject0d3e75d19e7744cba2728b0825fbc5da, name: 'wwobject-0d3e75d1-9e77-44cb-a272-8b0825fbc5da' }),
'wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0': getInheritedConfiguration({ ...wwobjectdeb10a015eef4aa190171b51c2ad6fd0, name: 'wwobject-deb10a01-5eef-4aa1-9017-1b51c2ad6fd0' }),
'wwobject-aeb78b9a-6fb6-4c49-931d-faedcfad67ba': getInheritedConfiguration({ ...wwobjectaeb78b9a6fb64c49931dfaedcfad67ba, name: 'wwobject-aeb78b9a-6fb6-4c49-931d-faedcfad67ba' }),
'wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad': getInheritedConfiguration({ ...wwobjectd7904e9dfc9a4d809e32728e097879ad, name: 'wwobject-d7904e9d-fc9a-4d80-9e32-728e097879ad' }),
'wwobject-59dca300-db78-42e4-a7a6-0cbf22d3cc82': getInheritedConfiguration({ ...wwobject59dca300db7842e4a7a60cbf22d3cc82, name: 'wwobject-59dca300-db78-42e4-a7a6-0cbf22d3cc82' }),
'wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1': getInheritedConfiguration({ ...wwobjectb783dc65d5284f748c14e27c934c39b1, name: 'wwobject-b783dc65-d528-4f74-8c14-e27c934c39b1' }),
'wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63': getInheritedConfiguration({ ...wwobject3a7d637912d3438798ffb332bb492a63, name: 'wwobject-3a7d6379-12d3-4387-98ff-b332bb492a63' }),
'wwobject-99ea5bf7-b91e-43ea-8ec3-dbaf2b171e34': getInheritedConfiguration({ ...wwobject99ea5bf7b91e43ea8ec3dbaf2b171e34, name: 'wwobject-99ea5bf7-b91e-43ea-8ec3-dbaf2b171e34' }),
'wwobject-69d0b3ef-b265-494c-8cd1-874da4aa1834': getInheritedConfiguration({ ...wwobject69d0b3efb265494c8cd1874da4aa1834, name: 'wwobject-69d0b3ef-b265-494c-8cd1-874da4aa1834' }),
'wwobject-53401515-b694-4c79-a88d-abeecb1de562': getInheritedConfiguration({ ...wwobject53401515b6944c79a88dabeecb1de562, name: 'wwobject-53401515-b694-4c79-a88d-abeecb1de562' }),
'wwobject-7179ba70-c5d7-49a5-9828-f85704fd1efc': getInheritedConfiguration({ ...wwobject7179ba70c5d749a59828f85704fd1efc, name: 'wwobject-7179ba70-c5d7-49a5-9828-f85704fd1efc' }),
'wwobject-c6c0c00e-49fd-4cb9-bd78-5bc09945721e': getInheritedConfiguration({ ...wwobjectc6c0c00e49fd4cb9bd785bc09945721e, name: 'wwobject-c6c0c00e-49fd-4cb9-bd78-5bc09945721e' }),
'wwobject-6145eb60-0af8-4e52-bcc6-dc0f6743654e': getInheritedConfiguration({ ...wwobject6145eb600af84e52bcc6dc0f6743654e, name: 'wwobject-6145eb60-0af8-4e52-bcc6-dc0f6743654e' }),
'wwobject-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd': getInheritedConfiguration({ ...wwobject6047b8df81b745a7a6b37355fb2fa3cd, name: 'wwobject-6047b8df-81b7-45a7-a6b3-7355fb2fa3cd' })};
    /* wwFront:end */
 
    return {
        configurations,
     };
});
