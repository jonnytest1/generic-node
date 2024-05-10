
import { nodeDescriptor, updateRuntimeParameter } from '../../element-node';
import { addTypeImpl, emitFromNode } from '../../generic-node-service';
import { generateDtsFromSchema, mainTypeName } from '../../json-schema-type-util';
import { ResolvablePromise } from "../../../util/resolvable-promise"
import { NodeEvent } from '../../node-event';
import { z } from 'zod';
import type { JSONSchema6 } from 'json-schema';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { log } from '../../log';
import { jsonClone } from '../../../util/json-clone';
import { TimerFactory } from "../../server/timer-factory"
const initPr = new ResolvablePromise<void>()


const delayUnits = ["seconds", "minutes", "hours", "<payload seconds>"] as const;


const payloadSchema = z.object({
  delay: z.number(),
  payload: z.optional(z.any())
})

type EventData = {
  node: string,
  data: unknown
  context: unknown
}
export async function handleTimedEvent(data: EventData) {
  await initPr.prRef
  emitFromNode(data.node, new NodeEvent({
    payload: data.data,
    context: data.context
  }, {}))
}


addTypeImpl({
  nodeDefinition: () => ({
    inputs: 1,
    outputs: 1,
    type: "timing",
    options: {
      type: {
        type: "select",
        options: ["schedule", "delay"] as const,
        "invalidates": ["delayUnit", "delay"]
      },

      delayUnit: {
        type: "placeholder",
        of: "select"
      },
      delay: {
        type: "placeholder",
        of: "number"
      },
      emitting: {
        type: "placeholder",
        of: "select"
      },
      schedule: {
        type: "placeholder",
        of: "iframe"
      }
    }
  }),
  process(node, evt, callbacks) {

    if (!node.parameters?.type) {
      return
    }

    if (node.parameters.type == "delay") {

      const duration = node.parameters.delayUnit as typeof delayUnits[number]

      let secondsMultiplier = 1

      let data = evt.payload

      if (duration === "seconds") {
        secondsMultiplier = 1
      } else if (duration === "minutes") {
        secondsMultiplier = 60
      } else if (duration === "hours") {
        secondsMultiplier = 60 * 60
      }

      let durationMillis: number | null = null
      if (duration === "<payload seconds>") {
        const payloadParam = payloadSchema.parse(data)
        const delay = payloadParam.delay;

        if (!isNaN(delay)) {
          durationMillis = delay * 1000
        }
        data = payloadParam.payload
      } else {
        const delay = node.parameters.delay;
        if (delay !== undefined && typeof delay === "string") {
          const num = +delay
          if (!isNaN(num)) {
            durationMillis = (num * secondsMultiplier) * 1000
          }
        }
      }

      if (durationMillis === null) {
        return
      }
      console.log("creating timer")


      const evtData: EventData = {
        node: node.uuid,
        data,
        context: evt.context
      }
      TimerFactory.createCallback("generic-event", {
        time: durationMillis,
        nestedObject: evtData,
        sentData: evt.payload
      })
    } else if (node.parameters.type === "schedule") {
      if (node.parameters.emitting === "emitting") {
        throw new Error("emitting doesnt haev inputs")
      }
      if (!node.parameters.schedule) {
        log("INFO", "missing schedule for timing process", {
          node: nodeDescriptor(node)
        })
        return
      }
      const schedule = Object.keys(JSON.parse(node.parameters.schedule))
      const now = new Date()
      const dayIndex = (now.getDay() + 6) % 7
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const currentDay = days[dayIndex].toLowerCase()
      const currentHours = now.getHours()
      const lastHour = (currentHours - 1 + 24) % 24
      if (schedule.includes(`${currentDay}${currentHours}`) || schedule.includes(`${currentDay}${lastHour} `)) {
        callbacks.continue(evt)
      }
    }
  },
  async nodeChanged(node, prevNode) {
    if (node.parameters?.type == "delay") {


      updateRuntimeParameter(node, "delayUnit", {
        type: "select",
        options: delayUnits
      })



      if (node.parameters.delayUnit == "<payload seconds>") {
        delete node.runtimeContext.parameters.delay

        const jsonSchema: JSONSchema6 = {
          type: "object",
          properties: {
            delay: {
              type: "number"
            },
            payload: {

            }
          },
          required: ["delay"],
          additionalProperties: false
        }
        node.runtimeContext.inputSchema = {
          jsonSchema: jsonSchema,
          mainTypeName: mainTypeName,
          dts: await generateDtsFromSchema(jsonSchema, `${node.type} -${node.uuid} -node change`)
        }

      } else {
        updateRuntimeParameter(node, "delay", {
          type: "number"
        }, 60)
      }

    } else if (node.parameters?.type === "schedule") {
      updateRuntimeParameter(node, "emitting", {
        type: "select",
        options: ["emitting", "filter"]
      })
      updateRuntimeParameter(node, "schedule", {
        type: "iframe",
        document: await readFile(join(__dirname, "schedule-frame.html"), { encoding: "utf8" }),
        data: {}
      })
    }
    node.runtimeContext.info = `${node.parameters?.type} `
    if (node.parameters?.emitting == "filter") {
      node.runtimeContext.inputs = 1
    } else if (node.parameters?.emitting === "emitting") {
      node.runtimeContext.inputs = 0
    }
  },
  async connectionTypeChanged(node, schema) {
    const schemaParsed = schema.jsonSchema
    if (!schemaParsed.properties?.payload) {
      return
    }
    const payloadProp = jsonClone(schemaParsed.properties.payload)
    if (typeof payloadProp == "object" && schemaParsed.definitions) {
      payloadProp.definitions = jsonClone(schemaParsed.definitions)
    }

    if (payloadProp && typeof payloadProp == "object") {
      node.runtimeContext.outputSchema = {
        jsonSchema: payloadProp,
        mainTypeName: "Main",
        dts: await generateDtsFromSchema(payloadProp, `${node.type} -${node.uuid} -con change`)
      }
    }
  },

  initializeServer(nodes, globals) {
    initPr.resolve()
  }
})