import type { FrontendToBackendGenericNodeEvent } from './frontend-events'


export type Ping = {
    type: "ping"
}

export type GenericNodeEvent = {
    type: "generic-node-event",
    data: FrontendToBackendGenericNodeEvent
}

export type GenericPageEvent = {
    type: "generic-node-page-event",
    data: unknown,
    nodeType: string
}




export type FrontendToBackendEvents = GenericNodeEvent | Ping | GenericPageEvent