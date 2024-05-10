import type { StoreEvents } from '../typing/frontend-events';
import type { ElementNode, NodeData, NodeDefintion, NodeEventTimes } from '../typing/generic-node-type'
import type { Timer } from './model/timer'


export interface ActionTriggersEvent {
    type: "action-triggers";
    data: {
        name: "generic-node";
        deviceKey: "generic-node"
        actions: Array<{
            name: string;
            displayText?: string
        }>;
    };
}

export type GenericNodeEvents = {
    type: "nodeDefinitions",
    data: Record<string, NodeDefintion>
} | {
    type: "nodeData"
    data: NodeData
} | ActionTriggersEvent | {
    type: "lastEventTimes"
    data: NodeEventTimes
} | {
    type: "nodeUpdate"
    data: ElementNode
} | {
    type: "store-reducer",
    data: StoreEvents & { fromSocket?: true }
} | {
    type: "reply",
    messageId: string,
    reply
}



export interface SocketResponses {
    timerUpdate: Array<Timer>

    genericNode: GenericNodeEvents

}
