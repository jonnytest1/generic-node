import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';
import type { ActionTriggersEvent, Connection, ConnectorDefintion, NodeDefOptinos, NodeDefToType, NodeEventTimes } from '../../backend-data';
import { Store } from '@ngrx/store';
import type { BackendActions } from './store/action';
import { backendActions, setNodeData, updateNodeDef } from './store/action';
import { logKibana } from '../global-error-handler';

import { v4 } from "uuid"
import { SettingsService } from '../settings.service';

export type PendingConnection = {
  source: ConnectorDefintion,
  target?: DragEvent
}


@Injectable({ providedIn: "root" })
export class GenericNodesDataService {


  //connections = new BehaviorSubject<Array<Connection>>([])

  debugMode = new BehaviorSubject<boolean>(false)

  pendingConnection = new BehaviorSubject<Connection | PendingConnection | undefined>(undefined)

  connectorMap: Record<string, { output: Array<HTMLElement>, input: Array<HTMLElement> }> = {}

  public nodeEventTimes: BehaviorSubject<NodeEventTimes | undefined> = new BehaviorSubject(undefined);

  public actionTriggers$ = new BehaviorSubject<ActionTriggersEvent["data"] | undefined>(undefined)

  private eventRegister = {}

  constructor(private service: SettingsService, private ngrxStore: Store) {

    const keySet = new Set(Object.values(backendActions).map(a => a.type))

    service.genericNodeEvents.subscribe(messageEvent => {
      if (messageEvent.type == 'nodeDefinitions') {
        ngrxStore.dispatch(updateNodeDef({
          data: messageEvent.data
        }))
      } else if (messageEvent.type == 'nodeData') {
        ngrxStore.dispatch(setNodeData({ data: messageEvent.data }))
      } else if (messageEvent.type == 'action-triggers') {
        this.actionTriggers$.next(messageEvent.data)
      } else if (messageEvent.type == 'lastEventTimes') {
        this.nodeEventTimes.next(messageEvent.data)
      } else if (messageEvent.type == 'nodeUpdate') {
        const evt = backendActions.updateNode({
          newNode: messageEvent.data,
          nodeUuid: messageEvent.data.uuid

        });
        evt["fromSocket"] = true
        ngrxStore.dispatch(evt)

      } else if (messageEvent.type == 'store-reducer') {
        if (!keySet.has(messageEvent.data.type)) {
          logKibana("ERROR", {
            message: "got event type without implementation",
            type: messageEvent.data.type
          })
          return
        }

        messageEvent.data.fromSocket = true
        ngrxStore.dispatch(messageEvent.data)
      } else if (messageEvent.type == 'reply') {
        this.eventRegister[messageEvent.messageId]?.(messageEvent.reply)
        delete this.eventRegister[messageEvent.messageId]
      } else {
        debugger
      }
    })
  }
  loadGenericData() {
    this.service.onSocketOpen.genericData = (ws) => {
      this.service.genericNodeSendingEvents.next({
        type: "generic-node-event",
        data: {
          type: "subscribe generic node"
        }
      })
    }
    this.service.genericNodeSendingEvents.next({
      type: "generic-node-event",
      data: {
        type: "load-node-data"
      }
    })
  }

  loadActionTriggers() {
    this.service.genericNodeSendingEvents.next({
      type: "generic-node-event",
      data: {
        type: "load-action-triggers"
      }
    })
  }

  public passBackendAction(action: BackendActions) {
    this.service.genericNodeSendingEvents.next({
      type: "generic-node-event",
      data: action
    })
  }
  public passPageAction(action: { messageId: string, type: string }, nodeType: string) {

    return new Promise(res => {
      this.eventRegister[action.messageId] = res
      this.service.genericNodeSendingEvents.next({
        type: "generic-node-event",
        data: {
          type: "page event",
          data: {
            nodeType,
            data: action,
            messageId: action.messageId
          }
        }
      })
    })

  }
  registerConnection(uuid: string, type: "out" | "in", index, el: HTMLElement) {
    this.connectorMap[uuid] ??= {
      input: [], output: []
    }
    let ar: Array<HTMLElement>
    if (type == "in") {
      ar = this.connectorMap[uuid].input
    } else {
      ar = this.connectorMap[uuid].output
    }
    ar[index] = el
  }

  /* getInputConnections(nodeUuid: string) {
     const inputsConnections: Array<{ con: Connection, node: ElementNode }> = []
     const nodeData = this.nodeData.value
 
 
     for (const connection of nodeData.connections) {
       if (connection.target.uuid == nodeUuid) {
         inputsConnections.push({
           con: connection,
           node: nodeData.nodes.find(n => n.uuid === connection.source.uuid)
         })
       }
     }
     return inputsConnections
   }*/
  getConnectionElement(con: ConnectorDefintion, type: "out" | "in") {
    const nodeConnectors = this.connectorMap[con.uuid]
    if (!nodeConnectors) {
      return null
    }
    let ar: Array<HTMLElement>

    if (type == "in") {
      ar = nodeConnectors.input
    } else {
      ar = nodeConnectors.output
    }
    return ar[con.index]
  }

  addConnection(uuid: string, indx: number) {
    this.pendingConnection.next({
      source: {
        index: indx, uuid
      }
    })
  }
  setTarget(target: DragEvent) {
    if (this.pendingConnection.value) {
      this.pendingConnection.next({ ...this.pendingConnection.value, target: target })
    }
  }
  finalize(targetuuid: string, indx: number) {
    if (!this.pendingConnection.value) {
      logKibana("ERROR", "pending connecton doesnt exist")
      return
    }
    this.ngrxStore.dispatch(backendActions.addConnection({
      connection: {
        source: this.pendingConnection.value?.source,
        target: {
          uuid: targetuuid,
          index: indx
        },
        uuid: v4()
      }
    }))
    /*this.nodeData.next({
      ...this.nodeData.value,
      connections: [...this.nodeData.value.connections,]
    })*/
    //this.store(this.pendingConnection.value.source.uuid)
    this.pendingConnection.next(undefined)
  }

  /* store(changedUuid?: string) {
     this.storeNodes(this.nodeData.value, changedUuid)
   }*/
  mergeGlobals(options: Partial<NodeDefToType<NodeDefOptinos>>) {

    this.ngrxStore.dispatch(backendActions.updateGlobals({ globals: options }))
    /* const newglobals = Object.assign({}, this.nodeData.value.globals ?? {}, options)
 
     this.nodeData.next({ ...this.nodeData.value, globals: newglobals })*/
  }
}