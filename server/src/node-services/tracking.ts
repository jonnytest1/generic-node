

import { addTypeImpl } from '../generic-node-service';
import { mainTypeName } from '../json-schema-type-util';
import { openPools } from 'hibernatets/mariadb-base';
import { save } from 'hibernatets';
import { DataBaseBase } from 'hibernatets/mariadb-base';
import { log } from '../log';
import { TrackingEvent } from "../server/model/tracking-event"

const trackingPool = new DataBaseBase(undefined, 10)


addTypeImpl({
  nodeDefinition() {
    return {
      type: "track",
      inputs: 1
    }
  },
  process(node, data, callbacks) {
    const evt = TrackingEvent.create(data, node)
    console.log("save tracking event")
    save(evt, { db: trackingPool }).catch(e => {
      log("ERROR", {
        message: "error while saving event",
        node: node.uuid,
        openPools: Object.values(openPools)
      }, e)
    })
    callbacks.continue(data)
  },
  nodeChanged(node, prevNode) {
    node.runtimeContext ??= {}
    node.runtimeContext.inputSchema = {
      jsonSchema: { type: "number" },
      dts: `export type Main=number`,
      mainTypeName: mainTypeName
    }
  },
  unload(nodeas, globals) {
    trackingPool.end()
  },
})