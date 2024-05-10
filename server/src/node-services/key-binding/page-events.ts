import type { ElementNode } from '../../typing/generic-node-type'

export type SocketMap = {
  type: "layouts"
  param: object
  response: Record<string, string[][]>,
} | {
  type: "get-nodes"
  param: object
  response: Array<ElementNode>
} | {
  type: "page-trigger"
  param: {
    board: string,
    key: string
  }
  response: void
}


export type SocketEvents = {
  type: keyof SocketMap
}


export type SubjectEvent = {
  [K in SocketMap["type"]]:
  {
    type: K,
    ___reply: (resp: (SocketMap & { type: K })["response"]) => void
  } & (SocketMap & { type: K })["param"]
}


declare global {
  function sendToNodeImplementation<T extends SocketMap["type"]>(evt: (SocketMap & { type: T })["param"] & { type: T })
    : Promise<(SocketMap & { type: T })["response"]>
}
