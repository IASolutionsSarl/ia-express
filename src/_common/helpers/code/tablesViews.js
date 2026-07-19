import { useBackTableViewsStore } from '@/pinia/backTableViews.js';
import { useBackTablesStore } from '@/pinia/backTables.js';
import { useIntegrationsStore } from '@/pinia/integrations.js';
import integrationsCore from '@/_front/integrations/index.js';
 
let latestRequestId = {};

function getTableViewExecutionContext(id, env = null) {
    const backTableViewsStore = useBackTableViewsStore(wwLib.$pinia);
    const backTablesStore = useBackTablesStore(wwLib.$pinia);
    const integrationsStore = useIntegrationsStore(wwLib.$pinia);
    const tableView = backTableViewsStore.tableViews[id];
    const integrationTable = tableView?.tableId ? backTablesStore.integrationTables[tableView.tableId] : null;

    return {
        tableView,
        integrationTable,
        integrationsStore,
        connection: integrationsStore.getConnection(integrationTable?.connectionId, env),
        instance: integrationsStore.getInstance(integrationTable?.connectionId || integrationTable?.integration),
    };
}

function getTableViewRequestOptions(parameters, options = {}) {
    const requestOptions = {
        method: 'GET',
        query: parameters,
    };

 
    return requestOptions;
}

export async function loadTableView(id, parameters = {}, options = { isTest: false }) {
    let response = null;
    latestRequestId[id] = wwLib.wwUtils.getUid();
    const currentRequestId = latestRequestId[id];
    try {
        const { tableView, integrationTable, integrationsStore, connection, instance } = getTableViewExecutionContext(
            id,
            options.env
        );
        if (tableView && integrationTable?.type === 'front') {
            let viewInstance = instance;
             response = await integrationsCore[integrationTable.integration].loadView({
                tableConfig: integrationTable.config,
                viewConfig: tableView.config,
                parameters,
                connection,
                instance: viewInstance,
            });
        } else {
            response = await wwServerClient(`/ww/table-views/${id}`, getTableViewRequestOptions(parameters, options));
        }
        if (currentRequestId !== latestRequestId[id]) return null;
        return response;
    } catch (error) {
        if (currentRequestId !== latestRequestId[id]) return null;
        throw error;
    }
}
