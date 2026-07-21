import { createRouter, createWebHistory } from 'vue-router';

import wwPage from './views/wwPage.vue';

import {
    initializeData,
    initializePlugins,
    initializeIntegrationInstances,
    onPageUnload,
} from '@/_common/helpers/data';
import { convertPathToRouterFormat } from '@/_common/helpers/urlParametersParsing';
import { getRuntimeEnvironment } from '@/helpers/frontEnv.js';
import { useBackAuthStore } from '@/pinia/backAuth.js';

/**
 * @typedef {import('vue-router').Router} Router
 * @typedef {import('vue-router').RouteRecordRaw} RouteRecordRaw
 * @typedef {import('vue-router').RouterOptions} RouterOptions
 * @typedef {import('vue-router').RouterScrollBehavior} RouterScrollBehavior
 */

/**
 * @typedef {Object} Lang
 * @property {string} lang
 * @property {boolean} [default]
 * @property {boolean} [isDefaultPath]
 */

/**
 * @typedef {Object} PageSecurity
 * @property {'authenticated' | string} [accessRule]
 * @property {string[]} [accessRoles]
 * @property {'AND' | 'OR'} [accessRolesCondition]
 */

/**
 * @typedef {Object} Page
 * @property {string} id
 * @property {Record<string, string> & { default: string }} paths
 * @property {string[]} langs
 * @property {PageSecurity} [security]
 * @property {{ userGroup: string }[]} [pageUserGroups]
 */

/**
 * @typedef {Object} DesignInfo
 * @property {string} homePageId
 * @property {Page[]} pages
 * @property {Lang[]} langs
 * @property {unknown} [auth]
 * @property {{ href?: string }} [baseTag]
 */

/** @type {Router} */
let router;
/** @type {RouteRecordRaw[]} */
const routes = [];

/** @type {RouterScrollBehavior} */
const scrollBehavior = to => {
    if (to.hash) {
        return {
            el: to.hash,
            behavior: 'smooth',
        };
    } else {
        return { top: 0 };
    }
};

 
/* wwFront:start */
import pluginsSettings from '../../plugins-settings.json';

window.wwg_designInfo = {"id":"7f56aeaa-5dfc-47e6-8a64-3206717702d1","homePageId":"f56bf691-aac9-4bdc-88f4-52ee0e94eaf7","authPluginId":"1fa0dd68-5069-436c-9a7d-3b54c340f1fa","baseTag":null,"defaultTheme":"light","langs":[{"lang":"en","default":true,"isDefaultPath":false},{"lang":"de","default":false,"isDefaultPath":false},{"lang":"fr","default":false,"isDefaultPath":false}],"background":{},"workflows":[{"id":"27e6dea6-36e1-495e-9fee-4fa92427822a","name":"Load data","type":"front","actions":{"0124c949-550a-48ae-a56e-4416f8e0ed3f":{"id":"0124c949-550a-48ae-a56e-4416f8e0ed3f","next":"5f57fee7-3917-4cb5-9ad2-10915d9bee75","type":"update-variable","varId":"dc0b7809-0e72-48ae-b451-e8a9e9fce3d4","varValue":{"code":"collections['f1ed9d76-28a2-4d00-8be1-900e632e0203']?.['data']?.[0]","__wwtype":"f"}},"0fc347ef-838b-4bc2-b8ee-239586d056ae":{"id":"0fc347ef-838b-4bc2-b8ee-239586d056ae","next":"22f2a564-ae8b-482a-b9f4-7921de0c2986","type":"update-variable","varId":"a10e58f6-87ba-4389-a4a3-7d0bc8832a26","varValue":{"code":"context.workflow?.['5a91069d-8e14-4a9a-b5d7-c22bdd864c6b']?.result","__wwtype":"f"}},"191be7a7-24bb-426b-bdd3-7a3c45669bcc":{"id":"191be7a7-24bb-426b-bdd3-7a3c45669bcc","type":"update-variable","varId":"a72808b1-9b0b-43eb-b1c7-7f7702153a38","disabled":true,"varValue":{"code":"context.workflow?.['ad6b57ee-eb9a-451c-902a-cc9c2ceffe14']?.result","__wwtype":"f"}},"19f7c84c-8b93-4952-aa54-6b6a107f62fb":{"id":"19f7c84c-8b93-4952-aa54-6b6a107f62fb","next":"0124c949-550a-48ae-a56e-4416f8e0ed3f","type":"fetch-collection","collectionId":"f1ed9d76-28a2-4d00-8be1-900e632e0203"},"216950bf-5a1d-43ad-97c3-ad53958d39a6":{"id":"216950bf-5a1d-43ad-97c3-ad53958d39a6","next":"6e24eaf1-67b6-49fa-b177-ef0ea312c2b1","type":"update-variable","varId":"b2741336-a288-4036-a753-7e767b0b81f2","varValue":{"code":"variables['62bb377c-a846-4aaf-a343-c22062d2769b'] ?.[0]?.['langue']","__wwtype":"f","defaultValue":""}},"22f2a564-ae8b-482a-b9f4-7921de0c2986":{"id":"22f2a564-ae8b-482a-b9f4-7921de0c2986","args":{"0":"m","1":"o","2":"d","3":"i","4":"f","5":"i","6":"e","7":"r","8":"s","params":[{"key":"limite","value":"50"}],"functionName":"get_transactions_org"},"next":"88564513-dfd0-433a-9e07-cc4de4f8dda0","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"2f5b8afb-8201-4914-8b97-5d225cfc93b2":{"id":"2f5b8afb-8201-4914-8b97-5d225cfc93b2","args":{"params":[],"functionName":"get_notifs"},"type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"3d333fa1-1c86-4256-9f76-d16ed809b662":{"id":"3d333fa1-1c86-4256-9f76-d16ed809b662","code":"const parts = window.location.hostname.split('.');\r\nreturn parts.length >= 3 ? parts[0] : null;","next":"d66e60e1-3cf4-40c1-b059-53b30ee22ff1","type":"custom-js"},"3df8f520-ac3e-463e-8733-6f5073ee7ce3":{"id":"3df8f520-ac3e-463e-8733-6f5073ee7ce3","next":"813be779-fd28-4efb-bd3c-5210400b8767","type":"fetch-collection","collectionId":"3bb45e9c-c022-4c69-b3ab-6dcf1cf186ff"},"40ce33a5-f328-46a9-84e7-cd03a8043d24":{"id":"40ce33a5-f328-46a9-84e7-cd03a8043d24","next":"4f062b0f-0d04-499a-888f-85daa944a140","type":"update-variable","varId":"35af76e8-eb23-47d6-a236-67af2b24d69f","varValue":{"code":"variables[/* monProfil */'62bb377c-a846-4aaf-a343-c22062d2769b']?.[0]?.profil_ia?.poste ?? \"\"","__wwtype":"js","defaultValue":""}},"4249a844-6f33-45bb-87ee-723f7fcd05c7":{"id":"4249a844-6f33-45bb-87ee-723f7fcd05c7","next":"19f7c84c-8b93-4952-aa54-6b6a107f62fb","type":"update-variable","varId":"04793238-4838-4d12-987b-0ac692c92a81","varValue":{"code":"context.workflow?.['4b5a81ce-0212-4801-92b3-aa97f65db393']?.result","__wwtype":"f"}},"426c6518-c826-4392-8fa8-8ea886f205b5":{"id":"426c6518-c826-4392-8fa8-8ea886f205b5","next":"e84d2bff-f941-46d0-ba47-71d89e602619","type":"1fa0dd68-5069-436c-9a7d-3b54c340f1fa-signOut"},"4b5a81ce-0212-4801-92b3-aa97f65db393":{"id":"4b5a81ce-0212-4801-92b3-aa97f65db393","args":{"functionName":"get_mes_favoris_ids"},"next":"4249a844-6f33-45bb-87ee-723f7fcd05c7","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"4d18ebd2-e8af-47d9-8fa8-d2ac21c8bc4f":{"id":"4d18ebd2-e8af-47d9-8fa8-d2ac21c8bc4f","lang":{"code":"variables['193d2270-d126-41a5-bb40-d1e23a922f7d']","__wwtype":"f","defaultValue":""},"next":"9c1951da-649a-4f5c-80b7-38bdbf55ab67","type":"change-lang"},"4d68d3ce-0739-4a80-91f4-633accc8efb5":{"id":"4d68d3ce-0739-4a80-91f4-633accc8efb5","next":"70453d5c-1a71-46e4-8c88-8f033ed91e2e","type":"update-variable","varId":"cbe1ba26-15f6-420c-9dda-64184c3d3eea","varValue":{"code":"context.workflow?.['58f59abd-721b-42a2-b76c-309f80f41926']?.result","__wwtype":"f"}},"4f062b0f-0d04-499a-888f-85daa944a140":{"id":"4f062b0f-0d04-499a-888f-85daa944a140","next":"a5634df3-1c92-4e34-869d-3a5078108d2c","type":"update-variable","varId":"d4a3a3b7-8d26-44ee-be44-6e1efa2ecc6f","varValue":{"code":"variables[/* monProfil */'62bb377c-a846-4aaf-a343-c22062d2769b']?.[0]?.profil_ia?.secteur ?? \"\"","__wwtype":"js","defaultValue":""}},"4f8536d6-7026-4cb6-8d77-4d818d2e8de4":{"id":"4f8536d6-7026-4cb6-8d77-4d818d2e8de4","next":"3df8f520-ac3e-463e-8733-6f5073ee7ce3","type":"update-variable","varId":"341667ef-3248-46e4-87dc-85aebda76660","disabled":false,"varValue":true},"58f59abd-721b-42a2-b76c-309f80f41926":{"id":"58f59abd-721b-42a2-b76c-309f80f41926","args":{"functionName":"get_conso_users_org"},"next":"4d68d3ce-0739-4a80-91f4-633accc8efb5","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"5a91069d-8e14-4a9a-b5d7-c22bdd864c6b":{"id":"5a91069d-8e14-4a9a-b5d7-c22bdd864c6b","args":{"functionName":"get_wallet_org"},"next":"0fc347ef-838b-4bc2-b8ee-239586d056ae","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"5bd51fba-4c72-4db7-97a0-82ed7019971e":{"id":"5bd51fba-4c72-4db7-97a0-82ed7019971e","next":"4b5a81ce-0212-4801-92b3-aa97f65db393","type":"update-variable","varId":"f084322a-57c4-496b-b918-f72db5510a8e","varValue":{"code":"context.workflow?.['2f5b8afb-8201-4914-8b97-5d225cfc93b2']?.result","__wwtype":"f"}},"5f57fee7-3917-4cb5-9ad2-10915d9bee75":{"id":"5f57fee7-3917-4cb5-9ad2-10915d9bee75","args":{"functionName":"get_mon_profil"},"next":"fb7e8520-613e-4fa3-ad95-e3476851272f","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"6e24eaf1-67b6-49fa-b177-ef0ea312c2b1":{"id":"6e24eaf1-67b6-49fa-b177-ef0ea312c2b1","next":"40ce33a5-f328-46a9-84e7-cd03a8043d24","type":"update-variable","varId":"e6ea0037-d45e-4f21-ad60-8095d001a170","varValue":{"code":"variables['62bb377c-a846-4aaf-a343-c22062d2769b'] ?.[0]?.dark_mode","__wwtype":"f","defaultValue":true}},"70453d5c-1a71-46e4-8c88-8f033ed91e2e":{"id":"70453d5c-1a71-46e4-8c88-8f033ed91e2e","args":{"functionName":"get_dashboard_overview"},"next":"b18232e8-11ee-4600-b52f-ef3d61540219","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"79ba0c10-9fca-400e-8a28-11a3ebb77071":{"id":"79ba0c10-9fca-400e-8a28-11a3ebb77071","next":"fb0b0e5d-10e8-45c0-9ee5-02b9a63c311f","type":"update-variable","varId":"aaadacba-ce1e-4827-9554-94087a366804","varValue":{"code":"variables['62bb377c-a846-4aaf-a343-c22062d2769b']?.[0] ?.profil_ia?.instructions_libres ?? \"\"","__wwtype":"f","defaultValue":""}},"813be779-fd28-4efb-bd3c-5210400b8767":{"id":"813be779-fd28-4efb-bd3c-5210400b8767","next":"ad6b57ee-eb9a-451c-902a-cc9c2ceffe14","type":"update-variable","varId":"a72808b1-9b0b-43eb-b1c7-7f7702153a38","varValue":{"code":"collections['3bb45e9c-c022-4c69-b3ab-6dcf1cf186ff']?.['data']","__wwtype":"f"}},"88564513-dfd0-433a-9e07-cc4de4f8dda0":{"id":"88564513-dfd0-433a-9e07-cc4de4f8dda0","next":"58f59abd-721b-42a2-b76c-309f80f41926","type":"update-variable","varId":"235ea9a3-f81d-444d-a237-81c88cd6b9b0","varValue":{"code":"context.workflow?.['22f2a564-ae8b-482a-b9f4-7921de0c2986']?.result","__wwtype":"f"}},"8b8dab76-75be-4450-b20c-271e45f8beea":{"id":"8b8dab76-75be-4450-b20c-271e45f8beea","next":"5bd51fba-4c72-4db7-97a0-82ed7019971e","type":"trycatch","branches":[{"id":"2f5b8afb-8201-4914-8b97-5d225cfc93b2","value":"try"},{"value":"catch"}]},"9256dd2f-41fe-4602-abed-9ccae99a339d":{"id":"9256dd2f-41fe-4602-abed-9ccae99a339d","next":"3d333fa1-1c86-4256-9f76-d16ed809b662","type":"update-variable","varId":"cbe1ba26-15f6-420c-9dda-64184c3d3eea","varValue":{"code":"context.workflow?.['9d768c63-b4f4-4c73-91b7-985d40e6c21b']?.result","__wwtype":"f"}},"9478ddbf-8027-45f9-a7a9-8239a7f286bd":{"id":"9478ddbf-8027-45f9-a7a9-8239a7f286bd","args":{"functionName":"get_users_org"},"next":"b48fc1a9-a664-489f-9fec-d99eb46649cd","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"9c1951da-649a-4f5c-80b7-38bdbf55ab67":{"id":"9c1951da-649a-4f5c-80b7-38bdbf55ab67","next":"b122f16d-33c8-47f1-80ce-2508bd4ea0ee","type":"update-variable","varId":"341667ef-3248-46e4-87dc-85aebda76660","varValue":false},"9d768c63-b4f4-4c73-91b7-985d40e6c21b":{"id":"9d768c63-b4f4-4c73-91b7-985d40e6c21b","args":{"functionName":"get_conso_users_org"},"next":"9256dd2f-41fe-4602-abed-9ccae99a339d","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"a5634df3-1c92-4e34-869d-3a5078108d2c":{"id":"a5634df3-1c92-4e34-869d-3a5078108d2c","next":"79ba0c10-9fca-400e-8a28-11a3ebb77071","type":"update-variable","varId":"a6cce1ca-670a-46a7-acf4-c691967a66e2","varValue":{"code":"variables[/* monProfil */'62bb377c-a846-4aaf-a343-c22062d2769b']?.[0]?.profil_ia?.ton ?? \"formel\"","__wwtype":"js","defaultValue":""}},"ad6b57ee-eb9a-451c-902a-cc9c2ceffe14":{"id":"ad6b57ee-eb9a-451c-902a-cc9c2ceffe14","args":{"params":[{"key":"p_org_id","value":{"code":"variables['098b30c5-c028-4965-a1e6-1bed93baabc0']?.[0] ?.id","__wwtype":"f","defaultValue":""}}],"functionName":"get_mon_menu"},"next":"191be7a7-24bb-426b-bdd3-7a3c45669bcc","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction","disabled":true},"b122f16d-33c8-47f1-80ce-2508bd4ea0ee":{"id":"b122f16d-33c8-47f1-80ce-2508bd4ea0ee","args":{"functionName":"get_mon_org"},"next":"f6c41eab-d922-4ea3-9883-ae8fb1296b1a","type":"f9ef41c3-1c53-4857-855b-f2f6a40b7186-callPostgresFunction"},"b18232e8-11ee-4600-b52f-ef3d61540219":{"id":"b18232e8-11ee-4600-b52f-ef3d61540219","next":"9478ddbf-8027-45f9-a7a9-8239a7f286bd","type":"update-variable","varId":"4759d647-0a73-4022-8d80-d8bc17503ac2","varValue":{"code":"context.workflow?.['70453d5c-1a71-46e4-8c88-8f033ed91e2e']?.result","__wwtype":"f"}},"b48fc1a9-a664-489f-9fec-d99eb46649cd":{"id":"b48fc1a9-a664-489f-9fec-d99eb46649cd","next":"9d768c63-b4f4-4c73-91b7-985d40e6c21b","type":"update-variable","varId":"a4d5fe49-780c-47a8-92d4-9a27bd2e2c95","varValue":{"code":"context.workflow?.['9478ddbf-8027-45f9-a7a9-8239a7f286bd']?.result","__wwtype":"f"}},"d66e60e1-3cf4-40c1-b059-53b30ee22ff1":{"id":"d66e60e1-3cf4-40c1-b059-53b30ee22ff1","next":"f6ffdbab-282c-49fe-99d2-3aee8bef3664","type":"update-variable","varId":"69aea143-0dfc-4c33-abeb-15c5af6b48de","varValue":{"code":"context.workflow?.['3d333fa1-1c86-4256-9f76-d16ed809b662']?.result","__wwtype":"f","defaultValue":""}},"dbc20493-0fee-4e3a-b57c-ef0be6801fa0":{"id":"dbc20493-0fee-4e3a-b57c-ef0be6801fa0","next":"4d18ebd2-e8af-47d9-8fa8-d2ac21c8bc4f","type":"change-theme","theme":{"code":"variables['e6ea0037-d45e-4f21-ad60-8095d001a170']","__wwtype":"f","defaultValue":""}},"e84d2bff-f941-46d0-ba47-71d89e602619":{"id":"e84d2bff-f941-46d0-ba47-71d89e602619","args":{"mode":"page","navigateMode":"internal"},"mode":"page","type":"change-page","pageId":"c24daf7e-a905-4f50-b91a-d2ba76791f5b","navigateMode":"internal"},"ec9b72d3-e797-424e-96e4-163fe9e51d49":{"id":"ec9b72d3-e797-424e-96e4-163fe9e51d49","next":"8b8dab76-75be-4450-b20c-271e45f8beea","type":"update-variable","varId":"202f081e-67f6-487a-8434-9e4526fe6f4f","varValue":{"code":"variables['098b30c5-c028-4965-a1e6-1bed93baabc0'] ?.[0]?.provider","__wwtype":"f","defaultValue":""}},"f6c41eab-d922-4ea3-9883-ae8fb1296b1a":{"id":"f6c41eab-d922-4ea3-9883-ae8fb1296b1a","next":"ec9b72d3-e797-424e-96e4-163fe9e51d49","type":"update-variable","varId":"098b30c5-c028-4965-a1e6-1bed93baabc0","varValue":{"code":"context.workflow?.['b122f16d-33c8-47f1-80ce-2508bd4ea0ee']?.result","__wwtype":"f"}},"f6ffdbab-282c-49fe-99d2-3aee8bef3664":{"id":"f6ffdbab-282c-49fe-99d2-3aee8bef3664","type":"if","value":{"code":"variables['69aea143-0dfc-4c33-abeb-15c5af6b48de'] != \"\" && variables['69aea143-0dfc-4c33-abeb-15c5af6b48de'].includes(\"weweb.io\") == false && variables['69aea143-0dfc-4c33-abeb-15c5af6b48de'] != variables['098b30c5-c028-4965-a1e6-1bed93baabc0']?.[0]?.sous_domaine","__wwtype":"js","defaultValue":true},"branches":[{"id":"426c6518-c826-4392-8fa8-8ea886f205b5","value":true},{"id":"4f8536d6-7026-4cb6-8d77-4d818d2e8de4","value":false}],"disabled":false},"fb0b0e5d-10e8-45c0-9ee5-02b9a63c311f":{"id":"fb0b0e5d-10e8-45c0-9ee5-02b9a63c311f","next":"5a91069d-8e14-4a9a-b5d7-c22bdd864c6b","type":"update-variable","varId":"28886569-4a31-4385-ae6e-e08505f0258b","varValue":{"code":"variables[/* monProfil */'62bb377c-a846-4aaf-a343-c22062d2769b']?.[0]?.profil_ia?.actif ?? true","__wwtype":"js","defaultValue":true}},"fb7e8520-613e-4fa3-ad95-e3476851272f":{"id":"fb7e8520-613e-4fa3-ad95-e3476851272f","next":"216950bf-5a1d-43ad-97c3-ad53958d39a6","type":"update-variable","varId":"62bb377c-a846-4aaf-a343-c22062d2769b","varValue":{"code":"context.workflow?.['5f57fee7-3917-4cb5-9ad2-10915d9bee75']?.result","__wwtype":"f"}}},"trigger":"onload","version":2,"firstAction":"dbc20493-0fee-4e3a-b57c-ef0be6801fa0","triggerConditions":null},{"id":"0d391c28-d8a8-4aad-ae41-918ed823c3b4","name":"Reset chat input","actions":{"7e34c3ad-7bd6-497a-8da3-e1f4b7a6540f":{"id":"7e34c3ad-7bd6-497a-8da3-e1f4b7a6540f","type":"reset-variables","varsId":["35bab648-803e-47bd-90ca-3560c4238171-value"]}},"trigger":"onload-app","version":2,"firstAction":"7e34c3ad-7bd6-497a-8da3-e1f4b7a6540f"},{"id":"9562af98-d899-49ac-8207-2723a456e41a","name":"Set transcript","actions":{"97ea717f-ef1b-4f07-a29a-e4269a7d3963":{"id":"97ea717f-ef1b-4f07-a29a-e4269a7d3963","type":"update-variable","varId":"df5d0f9e-0ef7-46b9-ab0f-4da229d9ad21","varValue":{"code":"variables['f490701e-2cd5-4108-b2bc-dc89a2d16778']","__wwtype":"f","defaultValue":""}}},"trigger":"onload-app","version":2,"firstAction":"97ea717f-ef1b-4f07-a29a-e4269a7d3963"}],"back":{"isServerSetup":{"staging":false,"production":false}},"auth":null,"pages":[{"id":"07f0d6b8-8e72-4f81-856e-970092699739","linkId":"07f0d6b8-8e72-4f81-856e-970092699739","name":"Fiche RH","folder":null,"paths":{"en":"ficherh","default":"ficherh"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"f0959e88-48a8-4896-ba46-f262d4d4974f","sectionTitle":"Main Content Section","linkId":"65aa054a-227c-44c7-9c7e-70ff23d05246"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"87f6f9cc-4194-49ed-b40f-79399090ebaa","linkId":"87f6f9cc-4194-49ed-b40f-79399090ebaa","name":"Assistants","folder":null,"paths":{"en":"assistants","default":"assistants"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"2c3562bc-521b-46a6-8348-73c48e3ca935","sectionTitle":"Main Content Section","linkId":"5c7147df-24ed-42cb-abc4-042a91d79013"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"27a42d33-e3a4-4d7e-b967-3c5949c76e87","linkId":"27a42d33-e3a4-4d7e-b967-3c5949c76e87","name":"Compte","folder":null,"paths":{"fr":"compte","default":"compte"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"bedac8e5-1eb8-4057-beff-0bea51c8dae9","sectionTitle":"Main Content Section","linkId":"d925edc8-5fc9-4e8a-8cc3-46b49da6d3e1"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"0a0c2359-a88e-4b7c-98e9-a11d9b68fc3c","linkId":"0a0c2359-a88e-4b7c-98e9-a11d9b68fc3c","name":"Reset Password","folder":null,"paths":{"en":"reset-password","default":"reset-password"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"09c3e4cf-6a10-4324-860d-dfcbd9018889","sectionTitle":"Login","linkId":"a989024d-f48b-45aa-aaa2-5ec151cc09e3"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"7bad431a-58cc-4b48-9df9-d18e63435ff1","linkId":"7bad431a-58cc-4b48-9df9-d18e63435ff1","name":"SwissNote","folder":null,"paths":{"en":"swissnote","default":"swissnote"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"aed2ac60-32e7-4d83-9a25-6708492a3273","sectionTitle":"Main Content Section","linkId":"365f0289-4f9c-4c54-bed4-ec1d13378c29"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"b54ae448-7966-4ef4-b461-93925c99d8ba","linkId":"b54ae448-7966-4ef4-b461-93925c99d8ba","name":"Utilisation","folder":null,"paths":{"en":"utilisation","default":"utilisation"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"ec8ef611-852d-4f44-9e22-af2c2784b1df","sectionTitle":"Main Content Section","linkId":"6f20c17f-66c5-4b8f-bbb9-59aaef53b09c"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":""},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"c9abc8e9-03fb-4574-b5b2-9ee7171ec84b","linkId":"c9abc8e9-03fb-4574-b5b2-9ee7171ec84b","name":"Confidentialité","folder":null,"paths":{"en":"confidentialite","default":"confidentialite"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"3fc1cac1-7c46-496e-a9b0-e5fb14257a71","sectionTitle":"Main Content Section","linkId":"99e7bd04-24c0-4f2d-9da0-8bd3e81cb3a1"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":""},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"63c3b88d-5caa-4227-9dc4-d47014d64e4d","linkId":"63c3b88d-5caa-4227-9dc4-d47014d64e4d","name":"Veille","folder":null,"paths":{"en":"veille","default":"veille"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"60422865-6aae-4598-9760-f8590938d0d6","sectionTitle":"Main Content Section","linkId":"7705c3a8-192d-4145-ad3b-eda0656f0fb2"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"b088d4cd-7121-4c2e-a86d-06a9f39b7ffc","linkId":"b088d4cd-7121-4c2e-a86d-06a9f39b7ffc","name":"Dashboard","folder":null,"paths":{"en":"dashboard","default":"dashboard"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"f36cb94f-632e-4836-b5df-520d2ea06f71","sectionTitle":"Main Content Section","linkId":"59dfae3f-80a3-4120-b78a-a29049863759"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"4c887791-6898-410d-a516-fe14d6ab3af4","linkId":"4c887791-6898-410d-a516-fe14d6ab3af4","name":"Tutoriels","folder":null,"paths":{"en":"tutoriels","default":"tutoriels"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"02b1d201-32c0-458c-b6be-e8fe66787812","sectionTitle":"Main Content Section","linkId":"b893bb4f-0cd6-4198-a478-3c73e8194be4"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"3567f283-8672-42f5-8746-decb8bfe3511","linkId":"3567f283-8672-42f5-8746-decb8bfe3511","name":"Chat","folder":null,"paths":{"en":"chat","default":"chat"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"10c7aa2a-566e-4528-8532-ae236888b66c","sectionTitle":"Main Content Section","linkId":"fb057747-0ac6-4f13-8ff0-05592137a480"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"4ef2fead-a5bd-474c-bf82-dadc642d27b9","linkId":"4ef2fead-a5bd-474c-bf82-dadc642d27b9","name":"A propos","folder":null,"paths":{"en":"apropos","default":"apropos"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"7da814ac-01d8-4575-bab5-cf29b20b22aa","sectionTitle":"Main Content Section","linkId":"03010b64-bfbe-4b99-9340-cd8f75354411"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":""},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"f56bf691-aac9-4bdc-88f4-52ee0e94eaf7","linkId":"f56bf691-aac9-4bdc-88f4-52ee0e94eaf7","name":"Home","folder":null,"paths":{"default":"home"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"c8da146e-7ab3-4211-9e0a-3f20296e23e8","sectionTitle":"Sidebar Section","linkId":"76a02917-4777-4254-8762-17f990a100d6"},{"uid":"f13e20e3-3992-435b-bd9e-3b8c238d1e69","sectionTitle":"Mobile Header Section","linkId":"d9a0a9e0-c668-4197-8c7b-d77fbfcc6032"},{"uid":"af6bebfe-ad5c-4d66-9619-8c84de26a997","sectionTitle":"Main Content Section","linkId":"b27aa3fd-aea0-450b-93b8-3bf8d1a2f6a1"},{"uid":"19fed32a-a7c8-468f-92eb-cc2c18f01bbf","sectionTitle":"Footer Section","linkId":"c946f401-8877-4f1f-9c82-cf97543a7f4d"}],"pageUserGroups":[{}],"title":{"en":"","fr":""},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"00003bdb-e20a-43f4-88bd-f7b81bcc14b9","linkId":"00003bdb-e20a-43f4-88bd-f7b81bcc14b9","name":"Forgot Password message","folder":null,"paths":{"en":"forgot-password-message","default":"forgot-password-message"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"920c889f-ed48-4c81-84a7-bc52a9eab3de","sectionTitle":"Login","linkId":"9abd1cc0-1741-4bcb-bda5-abe7d92a7478"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"c24daf7e-a905-4f50-b91a-d2ba76791f5b","linkId":"c24daf7e-a905-4f50-b91a-d2ba76791f5b","name":"Login","folder":null,"paths":{"en":"login","default":"login"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"17febb87-bcfb-4162-a637-0864f1fc508c","sectionTitle":"Login","linkId":"aff98569-d5d0-43c8-a742-2a2d0d344fef"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"3c8ea940-091e-48cf-8b91-57fc94e9355f","linkId":"3c8ea940-091e-48cf-8b91-57fc94e9355f","name":"Forgot Password","folder":null,"paths":{"en":"forgot-password","default":"forgot-password"},"langs":["en","de","fr"],"cmsDataSetPath":null,"sections":[{"uid":"01d09b4f-679a-4a19-bebf-f968ea5275a3","sectionTitle":"Login","linkId":"f02338fe-2fad-4c80-8d12-7d84b4a0d721"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}}],"plugins":[{"id":"f9ef41c3-1c53-4857-855b-f2f6a40b7186","name":"Supabase","namespace":"supabase"},{"id":"1fa0dd68-5069-436c-9a7d-3b54c340f1fa","name":"Supabase Auth","namespace":"supabaseAuth"},{"id":"2bd1c688-31c5-443e-ae25-59aa5b6431fb","name":"REST API","namespace":"restApi"}]};
window.wwg_cacheVersion = 455;
window.wwg_pluginsSettings = pluginsSettings;
window.wwg_disableManifest = false;

/** @type {Lang} */
const defaultLang = window.wwg_designInfo.langs.find(({ default: isDefault }) => isDefault) || {
    lang: 'en',
    default: true,
};

/**
 * @param {Page} page
 * @param {Lang} lang
 * @param {string} [forcedPath]
 */
const registerRoute = (page, lang, forcedPath) => {
    const langSlug = !lang.default || lang.isDefaultPath ? `/${lang.lang}` : '';
    let path =
        forcedPath ||
        (page.id === window.wwg_designInfo.homePageId ? '/' : `/${page.paths[lang.lang] || page.paths.default}`);

    path = convertPathToRouterFormat(path);

    routes.push({
        path: langSlug + path,
        component: wwPage,
        name: `page-${page.id}-${lang.lang}`,
        meta: {
            pageId: page.id,
            lang,
            isPrivate: !!page.pageUserGroups?.length,
        },
        async beforeEnter(to, from) {
            if (to.name === from.name) return;
            //Set page lang
            wwLib.wwLang.defaultLang = defaultLang.lang;
            wwLib.$store.dispatch('front/setLang', lang.lang);

            const backAuthStore = useBackAuthStore(wwLib.$pinia);
            if (!wwLib.wwAuth.plugin) {
                if (!backAuthStore.projectAuth && window.wwg_designInfo.auth) {
                    backAuthStore.setProjectAuth(window.wwg_designInfo.auth);
                }
            }

            //Init plugins
            await initializePlugins();

            //Init integration instances
            await initializeIntegrationInstances();

            if (!wwLib.wwAuth.plugin) {
                await backAuthStore.refresh();
                const projectAuth = backAuthStore.projectAuth || {};

                //Check if private page
                if (page.security?.accessRule === 'authenticated') {
                    if (!backAuthStore.isAuthenticated) {
                        window.location.href = `${wwLib.wwPageHelper.getPagePath(
                            projectAuth.unauthenticatedPageId
                        )}?_source=${to.path}`;
                        return null;
                    } else if (page.security?.accessRoles?.length) {
                        const hasAccess =
                            page.security.accessRolesCondition === 'AND'
                                ? backAuthStore.matchAllRoles(page.security.accessRoles)
                                : backAuthStore.matchAnyRoles(page.security.accessRoles);
                        if (!hasAccess) {
                            window.location.href = `${wwLib.wwPageHelper.getPagePath(
                                projectAuth.unauthorizedPageId
                            )}?_source=${to.path}`;
                            return null;
                        }
                    }
                }
            } else {
                // Deprecated legacy auth plugins, to remove in the future
                if (page.pageUserGroups?.length) {
                    await wwLib.wwAuth.init();

                    // Redirect to not sign in page if not logged
                    if (!wwLib.wwAuth.getIsAuthenticated()) {
                        window.location.href = `${wwLib.wwPageHelper.getPagePath(
                            wwLib.wwAuth.getUnauthenticatedPageId()
                        )}?_source=${to.path}`;

                        return null;
                    }

                    //Check roles are required
                    if (
                        page.pageUserGroups.length > 1 &&
                        !wwLib.wwAuth.matchUserGroups(page.pageUserGroups.map(({ userGroup }) => userGroup))
                    ) {
                        window.location.href = `${wwLib.wwPageHelper.getPagePath(
                            wwLib.wwAuth.getUnauthorizedPageId()
                        )}?_source=${to.path}`;

                        return null;
                    }
                }
            }

            try {
                await import(`@/pages/${page.id.split('_')[0]}.js`);
                await wwLib.wwWebsiteData.fetchPage(page.id);

                //Scroll to section or on top after page change
                if (to.hash) {
                    const targetElement = document.getElementById(to.hash.replace('#', ''));
                    if (targetElement) targetElement.scrollIntoView();
                } else {
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                }

                return;
            } catch (err) {
                wwLib.$store.dispatch('front/showPageLoadProgress', false);

                if (err.redirectUrl) {
                    return { path: err.redirectUrl || '404' };
                } else {
                    //Any other error: go to target page using window.location
                    window.location = to.fullPath;
                }
            }
        },
    });
};

for (const page of window.wwg_designInfo.pages) {
    for (const lang of window.wwg_designInfo.langs) {
        if (!page.langs.includes(lang.lang)) continue;
        registerRoute(page, lang);
    }
}

const page404 = window.wwg_designInfo.pages.find(page => page.paths.default === '404');
if (page404) {
    for (const lang of window.wwg_designInfo.langs) {
        // Create routes /:lang/:pathMatch(.*)* etc for all langs of the 404 page
        if (!page404.langs.includes(lang.lang)) continue;
        registerRoute(
            page404,
            {
                default: false,
                lang: lang.lang,
            },
            '/:pathMatch(.*)*'
        );
    }
    // Create route /:pathMatch(.*)* using default project lang
    registerRoute(page404, { default: true, isDefaultPath: false, lang: defaultLang.lang }, '/:pathMatch(.*)*');
} else {
    routes.push({
        path: '/:pathMatch(.*)*',
        redirect: null,
        async beforeEnter() {
            window.location.href = '/404';
        },
    });
}

/** @type {RouterOptions} */
let routerOptions;

const isProd = getRuntimeEnvironment() === 'production';

if (isProd && window.wwg_designInfo.baseTag?.href) {
    let baseTag = window.wwg_designInfo.baseTag.href;
    if (!baseTag.startsWith('/')) {
        baseTag = '/' + baseTag;
    }
    if (!baseTag.endsWith('/')) {
        baseTag += '/';
    }

    routerOptions = {
        history: createWebHistory(baseTag),
        routes,
    };
} else {
    routerOptions = {
        history: createWebHistory(),
        routes,
    };
}

router = createRouter({
    ...routerOptions,
    scrollBehavior,
});

//Trigger on page unload
let isFirstNavigation = true;
router.beforeEach(async (to, from) => {
    if (to.name === from.name) return;
    if (!isFirstNavigation) await onPageUnload();
    isFirstNavigation = false;
    wwLib.globalVariables._navigationId++;
    return;
});

//Init page
router.afterEach((to, from, failure) => {
    wwLib.$store.dispatch('front/showPageLoadProgress', false);
    let fromPath = from.path;
    let toPath = to.path;
    if (!fromPath.endsWith('/')) fromPath = fromPath + '/';
    if (!toPath.endsWith('/')) toPath = toPath + '/';
    if (failure || (from.name && toPath === fromPath)) return;
    initializeData(to);
});
/* wwFront:end */

export default router;
