export type * from "../../../server/src/typing/generic-node-type"
export type * from "../../../server/src/typing/node-options"
export type * from "../../../server/src/typing/frontend-events"
export type * from "../../../server/src/typing/socket-events"
export type * from "../../../server/src/server/socket-response"
import type { Timer } from '../../../server/src/server/model/timer';


import type { SocketResponses as sR, GenericNodeEvents as GNE, ActionTriggersEvent as ATE }
    from "../../../server/src/server/socket-response"


export interface ResponseData<K extends keyof sR = keyof sR> {
    type: K,
    data: sR[K]
}

export type ActionTriggersEvent = ATE;

export type Primitives = string | number | boolean | Date | undefined;

type NestedNonFunctionProperty<K> = K extends Primitives ? K : (K extends Array<unknown> ? Array<FrontendProperties<K[0]>> : FrontendProperties<K>);
type NonFunctionPropertyNames<T> = { [K in keyof T]: (T[K] extends Function ? (never) : K) }[keyof T];

type FrontendProperties<T> = Partial<{ [K in NonFunctionPropertyNames<T>]: NestedNonFunctionProperty<T[K]> }>;
export interface TimerFe extends FrontendProperties<Timer> {
    parsedArguments?: [string];
    color?: string

    parsedData?
}
