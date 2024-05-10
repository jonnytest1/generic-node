import { genericNodeDataStore } from './reference';
import type { NodeData } from '../typing/generic-node-type';
import { currentVersion } from '../data-versioning';

export const nodeDataSelector = genericNodeDataStore.createSelector(s => s.nodeData)

export const selectConnectorMap = genericNodeDataStore.createSelector(nodeData => {
  return nodeData.connectorMap
})
export const selectConnectionsFromNodeUuid = (uuid: string) => selectConnectorMap.chain(conMap => {
  return conMap[uuid]
})


export const selectTargetConnectorMap = genericNodeDataStore.createSelector(nodeData => {
  return nodeData.targetConnectorMap
})


export const selectTargetConnectorForNodeUuid = (uuid: string) => genericNodeDataStore.createSelector(nodeData => {
  return nodeData.targetConnectorMap[uuid]
})

export const nodeDataWithNodesArray = nodeDataSelector.chain(nodeData => {
  const data: NodeData = {
    connections: Object.values(nodeData.connections),
    globals: nodeData.globals,
    nodes: Object.values(nodeData.nodes),
    version: currentVersion
  }
  return data
})


export const selectNodeMap = nodeDataSelector.chain(nodeData => {
  return nodeData.nodes
})



export const selectNodeByUuid = (uuid: string) => selectNodeMap.chain(nodeData => {
  return nodeData[uuid]
})

export const selectNodesOfType = (type: string) => selectNodeMap.chain(nodeData => {
  return Object.values(nodeData).filter(n => n.type === type);
})


export const selectGlobals = nodeDataSelector.chain(nodeData => {
  return nodeData.globals
})
