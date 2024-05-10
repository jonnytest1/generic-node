import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { GenericNodeState } from './reducers';
import { featureName } from './reducers';
import { logKibana } from '../../global-error-handler';
import type { ElementNode } from '../../../backend-data';

const genericNodeDAtaFeature = createFeatureSelector<GenericNodeState>(featureName)

export const selectNodeData = createSelector(genericNodeDAtaFeature, d => d)

export const selectNodes = createSelector(selectNodeData, data => {
  return data.nodes ?? []
})
export const selectNodesMap = createSelector(selectNodes, data => {
  return Object.fromEntries(data.map(n => [n.uuid, n]))
})

export const selectNode = (uuid: string) => {
  return createSelector(selectNodesMap, (data): ElementNode | undefined => {
    return data[uuid]
  })
}
export const selectNodesByType = (type: string) => {
  return createSelector(selectNodes, (data) => {
    return data?.filter(node => node.type === type)
  })
}

export const selectNodeDefByType = (type: string, error = true) => {
  return createSelector(selectNodeData, data => {
    const nodeDef = data.nodeDefinitions[type];
    if (!nodeDef && error) {
      logKibana("ERROR", {
        message: "Missing node type",
        node_Type: type
      })
    }
    return nodeDef
  })
}

export const selectNodeDefs = createSelector(selectNodeData, n => n.nodeDefinitions)