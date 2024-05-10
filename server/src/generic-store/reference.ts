import { DataStore } from '../../util/data-store/data-store';
import type { Connection, ConnectorDefintion, ElementNode, NodeEventTimes } from '../typing/generic-node-type';
import type { NodeDefOptinos, NodeDefToType } from '../typing/node-options';

export interface DataState {
  lastEventTimes: NodeEventTimes


  nodeData: {

    nodes: Record<string, ElementNode>

    connections: Record<string, Connection>
    globals: NodeDefToType<NodeDefOptinos>
  },
  connectorMap: Record<string, { [outputindex: number]: Array<ConnectorDefintion> }>
  targetConnectorMap: Record<string, {
    [inputindex: number]: (Omit<Connection, "target"> & { target: undefined })[];
  }>
}

export const genericNodeDataStore = new DataStore<DataState>({
  lastEventTimes: {},
  nodeData: {
    connections: {},
    nodes: {},
    globals: {},
  },
  connectorMap: {},
  targetConnectorMap: {}
})


require("./reducers")