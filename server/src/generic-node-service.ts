import type {
  Callbacks, ElementNode,
  NodeData,
  NodeDefintion, NullTypeSubject, TypeImplementaiton
} from './typing/generic-node-type';

import { updateTypeSchema } from './generic-type.utils';
import { NodeEvent } from './node-event';
import type { NodeDefOptinos } from './typing/node-options';
import type { NodeEventData } from './typing/node-event-data';
import { setLastEvent, setLastEventInputTime, setLastEventOutputTime } from './last-event-service';
import { ElementNodeImpl, checkInvalidations } from './element-node';
import { nodesFile, serviceFolder } from './generic-node-constants';
import { init } from './validation/watcher';
import { genericNodeDataStore } from './generic-store/reference';
import { backendToFrontendStoreActions, initializeStore } from './generic-store/actions';
import { nodeDataWithNodesArray, selectGlobals, selectNodeByUuid, selectNodesOfType } from './generic-store/selectors';
import { forNodes, selectConnectionsFromContinue } from './generic-store/flow-selectors';
import { currentVersion as currentVersion, migrate } from './data-versioning';

import { BehaviorSubject, Subject, type Subscription } from "rxjs"
import { watch } from "chokidar"
import { filter, skip } from "rxjs/operators"
import { writeFileSync, readFileSync } from "fs"
import { environment } from '../environment';
import { log } from './log';
import { jsonClone } from '../util/json-clone';

export let skipEmit = false

export const typeImplementations = new BehaviorSubject<Record<string, TypeImplementaiton>>({})

const hasLoaded$ = new BehaviorSubject(false)


let storeTimeout: NodeJS.Timeout | undefined
let lastStoreTime = -1

genericNodeDataStore.selectWithAction(nodeDataWithNodesArray)
  .pipe(filter(([d, action]) => !!d.nodes.length && action !== "initialize node store"))
  .subscribe(([nodeData, a]) => {
    if (storeTimeout && lastStoreTime > (Date.now() - (1000 * 60))) {
      clearTimeout(storeTimeout)
    }
    storeTimeout = setTimeout(() => {
      console.log("writing nodes for " + a)
      writeFileSync(nodesFile, JSON.stringify(nodeData, undefined, "   "))
      lastStoreTime = Date.now()
      storeTimeout = undefined
    }, 500)
  })

export async function addNode(node: ElementNode) {
  const typeImpl = typeImplementations.value[node.type]
  if (typeImpl) {
    node.runtimeContext ??= {}
    const nodeDef = typeImpl.nodeDefinition();
    node.runtimeContext.inputs = nodeDef.inputs
    node.runtimeContext.outputs = nodeDef.outputs
  }

  genericNodeDataStore.dispatch(backendToFrontendStoreActions.updateNode({
    newNode: node,
  }))
}


export function emitFromNode(nodeUuid: string, evt: NodeEvent, index?: number) {
  setLastEventOutputTime(nodeUuid, Date.now())
  const emittingConnections = genericNodeDataStore.getOnce(selectConnectionsFromContinue({
    fromIndex: index,
    fromNode: nodeUuid
  }))

  for (const emittingCon of emittingConnections) {
    const nextNode = genericNodeDataStore.getOnce(selectNodeByUuid(emittingCon.uuid))
    if (!nextNode) {
      log("WARN", { message: "node not found", uuid: emittingCon.uuid })
      return
    }
    processInput({
      node: nextNode,
      nodeinput: emittingCon.index,
      data: evt
    })
  }
}



let loadingFile: string | undefined = undefined
if (environment.WATCH_SERVICES) {
  watch(serviceFolder, {})
    .on("add", e => {
      if (e.endsWith(".ts") && !e.endsWith("d.ts")) {
        loadingFile = e
        require(e)
        loadingFile = undefined
      }
    })
    .on("change", e => {
      if (e.endsWith(".ts") && !e.endsWith("d.ts")) {
        if (e in require.cache) {
          delete require.cache[e]
        }
        loadingFile = e
        require(e)
        loadingFile = undefined
        console.log("successfully loaded " + e)
      }
    }).on("ready", () => {
      hasLoaded$.next(true)
    })

}

const subscriptionMap: Record<string, Subscription> = {}

forNodes({
  added(node, action) {
    let last: ElementNode | null = null
    if (action === initializeStore.type) {
      last = jsonClone(node)
    }
    let pendingCheck = false
    subscriptionMap[node.uuid] = genericNodeDataStore.select(selectNodeByUuid(node.uuid))
      .pipe(
        skip(action === "initialize node store" ? 1 : 0),
      )
      .subscribe(async (node) => {
        if (node) {
          if (pendingCheck) {
            return
          }
          const typeImpl = typeImplementations.value[node.type];
          if (typeImpl) {
            Object.setPrototypeOf(node, ElementNodeImpl.prototype);
            pendingCheck = true
            try {
              checkInvalidations(typeImpl, node, last);

              await typeImpl.nodeChanged?.(node as ElementNodeImpl<never>, last);
              genericNodeDataStore.dispatch(backendToFrontendStoreActions.updateNode({
                newNode: node
              }))
              updateTypeSchema(node, {
                typeImpls: typeImplementations.value
              })
                .then(() => {
                  genericNodeDataStore.dispatch(backendToFrontendStoreActions.updateNode({
                    newNode: node
                  }))
                  pendingCheck = false
                })
                .catch(e => {
                  log("ERROR", {
                    message: "error updating type schema",
                    nodeUuid: node.uuid
                  }, e)
                });
            } catch (e) {
              log("ERROR", {
                message: "error during node change",
                type: node.type,

                node: node.uuid
              }, e)
            }
          } else {
            log("ERROR", {
              message: "missing type implementation for node",
              type: node.type
            })
          }
        }

        last = jsonClone(node)
      })
  },
  removed(node) {
    subscriptionMap[node]?.unsubscribe()
  },
})

let data = JSON.parse(readFileSync(nodesFile, { encoding: "utf8" })) as NodeData;

if (data.version !== currentVersion) {
  data = migrate(data)
}

genericNodeDataStore.dispatch(initializeStore({
  data
}))
init()

export function addTypeImpl<C, G extends NodeDefOptinos, O extends NodeDefOptinos, P, S, TS extends NullTypeSubject>(typeImpl: TypeImplementaiton<C, G, O, P, S, TS>) {

  const currerntTypeImpls = typeImplementations.value
  const implementationType = typeImpl.nodeDefinition().type;
  typeImpl._file = loadingFile



  if (typeImpl.messageSocket) {
    typeImpl._socket = new Subject()
    typeImpl.messageSocket(typeImpl._socket)
  }


  let elementNodes: Array<ElementNodeImpl<never>> | null = null




  if (currerntTypeImpls[implementationType]?.unload) {
    if (!elementNodes) {
      elementNodes = getElementNodes(implementationType);
    }
    const globals = genericNodeDataStore.getOnce(selectGlobals)
    currerntTypeImpls[implementationType]?.unload?.(elementNodes, globals as never)

  }
  currerntTypeImpls[implementationType] = typeImpl as never
  typeImplementations.next(currerntTypeImpls)


  if (typeImpl.initializeServer) {
    if (!elementNodes) {
      elementNodes = getElementNodes(implementationType);

    }
    const globals = genericNodeDataStore.getOnce(selectGlobals)
    typeImpl.initializeServer(elementNodes, globals as never)

  }

}
function getElementNodes(implementationType: string): ElementNodeImpl<never>[] {
  return genericNodeDataStore.getOnce(selectNodesOfType(implementationType)).map(node => {
    return new ElementNodeImpl<never>(node as ElementNode<never>, createCallbacks(node))
  });
}

export function getNodeDefintions(): Record<string, NodeDefintion> {
  const nodeDefs: Record<string, NodeDefintion> = {}
  for (const key in typeImplementations.value) {
    nodeDefs[key] = typeImplementations.value[key].nodeDefinition()
  }
  return nodeDefs;
}




function createCallbacks(node: ElementNode) {
  const nodeUuid = node.uuid
  return {
    continue: (evt, index) => {
      emitFromNode(nodeUuid, evt, index)
    },
    updateNode(frontendEmit = true) {
      skipEmit = !frontendEmit
      genericNodeDataStore.dispatch(backendToFrontendStoreActions.updateNode({
        newNode: { ...node }
      }))
      skipEmit = false
    }
  } satisfies Callbacks
}


async function processInput(data: { node: ElementNode, nodeinput: number, data: NodeEvent }) {
  const typeimpl = typeImplementations.value[data.node.type]
  if (typeimpl) {
    setLastEventInputTime(data.node, Date.now())
    try {
      const eventCopy = data.data.copy()
      data.data.inputIndex = data.nodeinput
      await typeimpl.process(data.node as ElementNode<never>, data.data, createCallbacks(data.node))


      setLastEvent(data.node, eventCopy)
    } catch (e) {
      log("ERROR", {
        message: "error during process of node",
        nodetype: data.node.type,
        nodeid: data.node.uuid
      }, e)
    }
  } else if (hasLoaded$.value) {
    log("ERROR", { message: "missing node type implemenation", nodetype: data.node.type })
  }
}

export function emitEvent(type: string, data: NodeEventData) {

  const nodes = genericNodeDataStore.getOnce(selectNodesOfType(type))
  nodes.forEach(node => {
    const globals = genericNodeDataStore.getOnce(selectGlobals)
    const event = new NodeEvent(data, globals)

    processInput({
      node: node,
      nodeinput: 0,
      data: event
    })
  })
}

