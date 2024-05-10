
import { column, primary, table } from 'hibernatets';
import type { NodeEvent } from '../../node-event';
import type { EvalNode } from '../../typing/generic-node-type';
import type { NodeDefOptinos } from '../../typing/node-options';

@table()
export class TrackingEvent {

  @primary()
  id: number

  @column({ size: "small" })
  nodeUuid: string

  @column({ size: "small" })
  nodeName: string

  @column({ size: "large" })
  payload: string

  @column({ size: "large" })
  context: string

  @column({ type: "date" })
  time_col: Date

  static create(evnt: NodeEvent<unknown, unknown>, node: EvalNode<NodeDefOptinos, any>) {
    const evt = new TrackingEvent()
    evt.time_col = new Date()
    evt.nodeUuid = node.uuid
    if (evnt.payload === undefined) {
      throw new Error("payload undefined")
    }
    evt.payload = JSON.stringify(evnt.payload)

    evt.nodeName = node.parameters?.name ?? '';

    const context = {}
    if (typeof evnt.context == "object") {
      for (const key in evnt.context) {
        const varaibleType = typeof evnt.context[key];
        if (varaibleType == "string" || varaibleType == "number" || varaibleType == "boolean") {
          context[key] = evnt.context[key]
        }
      }
    }
    evt.context = JSON.stringify(context)
    return evt;
  }
}