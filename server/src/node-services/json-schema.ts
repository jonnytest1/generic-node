


import type { ExtendedJsonSchema } from '../typing/generic-node-type'
import { generateDtsFromSchema, generateZodTypeFromSchema, mainTypeName } from '../json-schema-type-util'
import { addTypeImpl } from '../generic-node-service'
import type { ZodType } from 'zod'

import { createSchema, mergeSchema, type MergeSchemaOptions } from "json-schema-merger"

function updateSchema(newObject: unknown, oldSchema: ExtendedJsonSchema | null, enumKeyList: Array<string>, params: MergeSchemaOptions["params"]) {
  const newSchema = createSchema(newObject)
  if (oldSchema) {
    const merged = mergeSchema({
      old: oldSchema,
      new: newSchema,
      enumKeyList: enumKeyList,
      path: [],
      params
    })
    return merged
  }

  return newSchema

}


const zodMap: Record<string, Promise<ZodType>> = {}

addTypeImpl({
  async process(node, data, callbacks) {
    if (typeof data.payload == "string") {
      try {
        data.updatePayload(JSON.parse(data.payload))
      } catch (w) {
        //
      }
    }
    //const jsonSchema = json2dts.parse(data.payload, mainInterfaceName)

    const prevSChema = JSON.stringify(node.runtimeContext?.outputSchema?.jsonSchema)


    try {
      const enumKeyList: Array<string> = []

      const params: MergeSchemaOptions["params"] = {
        mergeLength: 10
      }

      for (const param in node.parameters ?? {}) {
        const paramValue = node.parameters?.[param]
        if (paramValue !== undefined) {
          params[param] = +paramValue
        }
      }

      const updated = updateSchema(
        data.payload,
        node.runtimeContext?.outputSchema?.jsonSchema ?? null,
        enumKeyList,
        params
      )
      node.parameters ??= {}
      node.runtimeContext.parameters ??= {}

      let hasChange = false
      const enumSet = new Set(enumKeyList)
      for (const key in node.runtimeContext.parameters) {
        if (key.startsWith("mergeLength_")) {
          const prop = key.split("mergeLength_")[1]
          if (!enumSet.has(prop)) {
            hasChange = true
            delete node.runtimeContext.parameters[key]
          }
        }
      }
      for (const enumKey of enumKeyList) {
        const newPArameter = {
          type: "number",
          title: "if an enum length exceeds this length it will be merged into a parent type 'a'|'b' => string"
        }
        if (JSON.stringify(newPArameter) !== JSON.stringify(node.runtimeContext.parameters[`mergeLength_${enumKey}`])) {
          node.runtimeContext.parameters[`mergeLength_${enumKey}`] = newPArameter
          hasChange = true
        }
        const newMErgeLength = node.parameters?.mergeLength ? +node.parameters?.mergeLength : 10
        if (newMErgeLength !== node.parameters[`mergeLength_${enumKey}`]) {
          node.parameters[`mergeLength_${enumKey}`] = newMErgeLength
          hasChange = true
        }
      }

      if (JSON.stringify(updated) !== prevSChema) {
        node.runtimeContext.outputSchema = {
          jsonSchema: updated,
          mainTypeName,
          dts: await generateDtsFromSchema(updated, `${node.type}-${node.uuid}-process !!`)
        }
        zodMap[node.uuid] = generateZodTypeFromSchema(updated, `${node.type}-${node.uuid}-process!!`)
        hasChange = true
      }
      if (hasChange) {
        callbacks.updateNode()
      }
    } catch (e) {
      debugger
    }
    if (node.runtimeContext?.outputSchema?.jsonSchema) {
      try {
        if (!zodMap[node.uuid]) {
          zodMap[node.uuid] = generateZodTypeFromSchema(node.runtimeContext?.outputSchema?.jsonSchema, `${node.type}-${node.uuid}-process fallback`)
        }
        const schema = await zodMap[node.uuid]
        data.updatePayload(await schema.parse(data.payload))
      } catch (e) {
        debugger
        throw e;
      }
    }
    //const newSchema = json2dts.getCode()
    //node.runtimeContext.schema = newSchema
    /* if (prevSChema !== newSchema) {
       if (prevSChema && newSchema) {
         const mergedSChema = typeMerge(prevSChema, newSchema, mainInterfaceName)
         debugger
       }
       //merge schema
       callbacks.updateNode()
     }*/

    callbacks.continue(data)
  },
  nodeDefinition: () => ({
    inputs: 1,
    outputs: 1,
    type: "jsonschema",
    options: {
      mergeLength: {
        type: "number"
      }
    }
  }),
  nodeChanged(node, prevNode) {
    node.parameters ??= {}
    node.parameters.mergeLength ??= "10"
  },
})