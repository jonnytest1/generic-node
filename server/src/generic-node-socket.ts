import { addNode, getNodeDefintions, skipEmit, typeImplementations } from './generic-node-service'

import type { FrontendToBackendGenericNodeEvent, StoreEvents } from './typing/frontend-events'
import { lastEventTimes } from './last-event-service'
import { genericNodeDataStore } from './generic-store/reference'
import { backendToFrontendStoreActions } from './generic-store/actions'
import { nodeDataWithNodesArray, selectNodesOfType } from './generic-store/selectors'
import { dispatchAction } from './generic-store/socket-action-dispatcher'
import { FrontendWebsocket } from '../../resources/frontend-update'
import type { GenericNodeEvents } from '../../resources/websocket-response'
import type { Action, ActionCreator } from '../../util/data-store/action'
import type { Websocket } from 'express-hibernate-wrapper'
import { Subject } from 'rxjs'

genericNodeDataStore.select(lastEventTimes).subscribe(times => {
  if (!FrontendWebsocket?.websockets) {
    return
  }
  FrontendWebsocket.forSockets(async (socket: Websocket, props: ExtendedSocket) => {
    if (!props.receiveChanges) {
      return
    }
    FrontendWebsocket.sendToWebsocket(socket, {
      type: "genericNode",
      data: {
        type: "lastEventTimes",
        data: times
      }
    })
  })
})

Object.values(backendToFrontendStoreActions).forEach((actionCreator: ActionCreator<StoreEvents["type"], any>) => {
  genericNodeDataStore.addEffect(actionCreator, (st, a: Action<StoreEvents["type"], any> & { fromFrontendSocket?: boolean }) => {
    if (skipEmit) {
      return
    }
    if (a.fromFrontendSocket) {
      return
    }
    FrontendWebsocket.forSockets((so, prop: ExtendedSocket) => {
      FrontendWebsocket.sendToWebsocket(so, {
        type: "genericNode",
        data: {
          type: "store-reducer",
          data: a as StoreEvents
        }
      })
    })
  })
})

typeImplementations.subscribe(async typeImpl => {
  if (!FrontendWebsocket?.websockets) {
    return
  }
  FrontendWebsocket.forSockets(async (socket: Websocket, props: ExtendedSocket) => {
    if (props.receiveChanges) {
      FrontendWebsocket.sendToWebsocket(socket, {
        type: "genericNode",
        data: {
          type: "nodeDefinitions",
          data: getNodeDefintions()
        }
      })
    }
  })
})
export type ExtendedSocket = {
  receiveChanges?: boolean
}

interface GenericNodeEvent<T = object> {
  evt: FrontendToBackendGenericNodeEvent
  socket: Websocket
  reply: (resp: GenericNodeEvents) => void
  pass: (resp: StoreEvents) => void
  socketInstanceProperties: T
}

export const genericNodeEvents = new Subject<GenericNodeEvent<ExtendedSocket>>()


genericNodeEvents.subscribe(async evt => {
  const genEvt = evt.evt

  console.log("socket event:", genEvt.type)
  genEvt.fromFrontendSocket = true
  if (genEvt.type === "load-node-data") {
    evt.reply({
      type: "nodeDefinitions",
      data: getNodeDefintions()
    })


    const nodeData = genericNodeDataStore.getOnce(nodeDataWithNodesArray)
    evt.reply({
      type: "nodeData",
      data: {
        ...nodeData,
        nodes: nodeData.nodes.map(n => ({
          ...n,
          serverContext: undefined
        }))
      }
    })
    evt.reply({
      type: "lastEventTimes",
      data: genericNodeDataStore.getOnce(lastEventTimes)
    })
    evt.socketInstanceProperties.receiveChanges = true
  } else if (genEvt.type == "load-action-triggers") {

    const actionNodes = genericNodeDataStore.getOnce(selectNodesOfType("action-trigger"))
    evt.reply({
      type: "action-triggers",
      data: {
        name: "generic-node",
        deviceKey: "generic-node",
        actions: actionNodes.map(node => ({
          name: node.uuid,
          displayText: node.parameters?.name
        }))
      }
    })
  } else if (genEvt.type == "subscribe generic node") {
    evt.socketInstanceProperties.receiveChanges = true
  } else if (genEvt.type == "update position") {
    dispatchAction(genEvt)
    evt.pass(genEvt)
  } else if (genEvt.type == "delete node") {
    dispatchAction(genEvt)
    evt.pass(genEvt)
  } else if (genEvt.type == "add node") {
    await addNode(genEvt.node)
    evt.pass(genEvt)
  } else if (genEvt.type == "update globals") {

    dispatchAction(genEvt)
    evt.pass(genEvt)
  } else if (genEvt.type == "add connection") {
    dispatchAction(genEvt)
    evt.pass(genEvt)
  } else if (genEvt.type == "delete connection") {

    dispatchAction(genEvt)
    evt.pass(genEvt)

  } else if (genEvt.type == "update param") {
    dispatchAction(genEvt)
    evt.pass(genEvt)
  } else if (genEvt.type == "page event") {
    const nodeDef = typeImplementations.value?.[genEvt.data?.nodeType]
    if (nodeDef?._socket) {
      nodeDef?._socket.next({
        ...genEvt.data.data,
        ___reply(responseEvt) {
          evt.reply({
            type: "reply",
            messageId: genEvt.data.messageId,
            reply: responseEvt
          })
        },
      })
    }
  } else {
    evt.pass(genEvt)
    debugger
  }
})