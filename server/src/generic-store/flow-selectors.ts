import { selectConnectionsFromNodeUuid, selectNodeMap } from './selectors';
import { genericNodeDataStore } from './reference';
import type { ConnectorDefintion, ElementNode } from '../typing/generic-node-type';



export const selectConnectionsFromContinue = (ev: { fromNode: string, fromIndex: number | undefined, throwIfMissing?: boolean }) => selectConnectionsFromNodeUuid(ev.fromNode)
  .chain(connectors => {
    if (!connectors) {
      return []
    }
    const emittingConnectinos: Array<ConnectorDefintion> = []
    if (ev.fromIndex !== undefined) {
      if (connectors[ev.fromIndex]) {
        emittingConnectinos.push(...connectors[ev.fromIndex])
      }
    } else {
      emittingConnectinos.push(...Object.values(connectors).flat())
    }
    return emittingConnectinos
  })




export function forNodes(callbacks: { removed: ((node: string) => void), added: ((node: ElementNode, reason?: string) => void) }) {
  const nodeCache = new Set<string>()
  genericNodeDataStore.selectWithAction(selectNodeMap).subscribe(([nodes, action]) => {
    const setCopy = new Set(nodeCache)

    for (const node in nodes) {
      if (!nodeCache.has(node)) {
        nodeCache.add(node)
        callbacks.added(nodes[node], action)
      }
      setCopy.delete(node)
    }

    for (const node of setCopy) {
      callbacks.removed(node)
    }
  })
}


