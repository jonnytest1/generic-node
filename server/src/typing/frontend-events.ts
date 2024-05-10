import type { Connection, ElementNode, NodeData } from './generic-node-type'

export type Load = {
  type: "load-node-data"
}
export type LoadActionTriggers = {
  type: "load-action-triggers"
}


export type UpdatepositionEvent = {
  type: "update position",
  node: string,
  position: NodeData["nodes"][number]["position"]
}
export type DeleteNOdeEvet = {
  type: "delete node",
  node: string
}
export type AddNOdeEvet = {
  type: "add node",
  node: NodeData["nodes"][number]
}

export type AddConnection = {
  type: "add connection",
  connection: Connection
}
export type DeleteConnection = {
  type: "delete connection",
  connection: Connection
}
export type SetConnectionError = {
  type: "set con error",
  connection: string,
  error: string | undefined
}

export type UpdateGlobals = {
  type: "update globals",
  globals: Partial<NodeData["globals"]>
}
export type SubscribeGenericNode = {
  type: "subscribe generic node"
}

export type UpdateParam = {
  type: "update param",
  node: string
  param: string
  value: string
}

export type UpdateNode = {
  type: "update node",
  newNode: ElementNode
}
export type UpdateEditorSchema = {
  type: "update editor schema",
  nodeUuid: string
  editorSchema: {
    dts: string
    globals: string
  }
}


export type StoreEvents = UpdatepositionEvent | DeleteNOdeEvet | AddNOdeEvet | AddConnection | DeleteConnection
  | UpdateGlobals | UpdateParam | UpdateNode | UpdateEditorSchema | SetConnectionError


export type BackendPageEvent = {
  type: "page event",
  data: {
    nodeType: string,
    data: { type: string },
    messageId: string
  }
}


export type FrontendToBackendGenericNodeEvent = (Load | UpdatepositionEvent | StoreEvents | LoadActionTriggers | SubscribeGenericNode | BackendPageEvent) & { fromFrontendSocket?: boolean }