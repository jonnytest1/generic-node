

import { CompilerError, allRequired, generateDtsFromSchema, mainTypeName } from '../json-schema-type-util';
import { addTypeImpl } from '../generic-node-service';
import type { ElementNode, ExtendedJsonSchema } from '../typing/generic-node-type';
import type { NodeDefToType } from '../typing/node-options';
import { nodeTypeName, updateRuntimeParameter } from '../element-node';
import { getTypes } from '../validation/watcher';
import { Json2dts } from "json2dts"
import * as z from "zod"
import { createCompilerHost } from 'typescript';
import { Script } from 'vm';
import type { Delayed } from '../server/timer-type';

declare module "typescript" {
  export interface SourceFile {
    getNamedDeclarations(): Map<string, Array<Node>>
  }

}



const host = createCompilerHost({})



const json2dts = new Json2dts()

const codeSchema = z.object({
  jsCode: z.string(),
  tsCode: z.string(),

})

type CodeType = z.infer<typeof codeSchema>


type CodeData = CodeType & {
  timestamp: number,
  node: string
}

const jsCache: Record<string, CodeType & { script: Script, finalCode?: string }> = {}
const isMapFunctionREgex = /function\s*map\s*\(\s*input\s*:\s*InputType/


const globalTypesObjectValidation = `
type TransformationResponse = TransformationRes;
  declare function delay<T extends SenderResponse>(time: number, res: T): Delayed<T>
`


function getContext(sendData) {
  return {
    data: sendData,
    delay: (<T>(sekunden: number, objectToSend?: T): Delayed<T | void> | T => {
      const millis = sekunden * 1000;
      return {
        time: millis,
        sentData: sendData,
        nestedObject: objectToSend
      }
    })
  }
}


addTypeImpl({

  server_context_type: (s: { keys?: Array<string> }) => s,
  process(node, data, callbacks) {
    let nodeScript = jsCache[node.uuid]
    if (!nodeScript) {
      if (node.parameters?.code) {
        nodeScript = cacheNodeScript(node)
      } else {
        return
      }
    }
    const returnValue = nodeScript.script.runInNewContext({
      ...getContext(data.payload),
      payload: data.payload,
      context: data.context
    })
    data.updatePayload(returnValue)
    callbacks.continue(data)

  },
  nodeDefinition: () => ({
    inputs: 1,
    outputs: 1,
    type: "map",
    options: {
      mode: {
        type: "select",
        options: ["map", "switch", "object"] as const,
        invalidates: ["code", "field"],
        order: 3
      },
      code: {
        type: "placeholder",
        of: "monaco"
      },
      field: {
        type: "placeholder",
        of: "select"
      }
    }
  }),
  nodeChanged(node, prev) {
    node.parameters ??= {}
    if (prev == undefined && !node?.parameters?.mode) {
      node.parameters.mode = "map"
    }
    if (!node.parameters?.code) {

      if (node.parameters?.mode == "map") {
        updateRuntimeParameter(node, "code", {
          type: "monaco",
          default: `function map(input:InputType){\n\n}`
        })
        setNewCode(node, {
          jsCode: "function map(input){\n\n}",
          tsCode: `function map(input:InputType){\n\n}`
        })
      } else if (node.parameters?.mode == "object") {
        updateRuntimeParameter(node, "code", {
          type: "monaco"
        })
        setNewCode(node, {
          jsCode: "({\n\n})",
          tsCode: `\n({ \n\n }) satisfies ObjectType`
        })
      } else if (node.parameters?.mode == "switch") {
        updateRuntimeParameter(node, "code", {
          type: "monaco"
        })

        setNewCode(node, {
          jsCode: "({})",
          tsCode: `\n({ \n\n }) satisfies EditorSchema.SwitchMapped`
        })
      }
    }
    if (!node.runtimeContext.parameters?.code) {
      node.runtimeContext.parameters ??= {}
      node.runtimeContext.parameters.code = {
        type: "monaco"
      }
    }
    cacheNodeScript(node);
  },
  async connectionTypeChanged(node, connectionSchema) {

    if (node.parameters?.mode == "switch") {

      const keys = Object.keys(connectionSchema.jsonSchema.properties ?? {});
      updateRuntimeParameter(node, "field", {
        type: "select",
        options: keys,
        order: 2
      })


      if (node.parameters.field) {
        const fieldSchema = connectionSchema.jsonSchema.properties![node.parameters.field]!

        const dts = await generateDtsFromSchema(fieldSchema as ExtendedJsonSchema)
        node.runtimeContext.editorSchema = {
          dts: `

        export namespace ValueTypes{
          ${dts}
        }
        export type SwitchMapped=Record<ValueTypes.${mainTypeName},any>
        `,
          globals: `type SwitchMapped= Record<EditorSchema.SwitchMapped,any>`
        }
      }

    } else if (node.parameters?.mode == "map") {
      node.runtimeContext.editorSchema = {
        dts: `
${connectionSchema.dts}

type InputType=${connectionSchema.mainTypeName ??= mainTypeName}
      `, globals: `
     // type InputType = EditorSchema.InputType;    
      var context;
      `
      }
    } else {
      node.runtimeContext.editorSchema = {
        dts: `
            ${connectionSchema.dts}

            type InputType=${connectionSchema.mainTypeName ??= mainTypeName}

            
      `, globals: `
            type TransformationResponse = EditorSchema.TransformationRes;
            function delay<T extends EditorSchema.SenderResponse>(time: number, res: T): EditorSchema.Delayed<T>
      `
      }
    }
    if (!jsCache[node.uuid]) {
      cacheNodeScript(node)

    }
    if (!jsCache[node.uuid]?.tsCode?.length) {
      return
    }


    try {
      const nodePref = nodeTypeName(node)

      let typeName: string | false = `${nodePref}OutputType`
      let code = `
        namespace ${nodePref}{
          ${connectionSchema.dts}

          type InputType=${connectionSchema.mainTypeName}
          declare var context:any

          export ${jsCache[node.uuid].tsCode}\n
          }
          type ${nodePref}OutputType=ReturnType<typeof ${nodePref}.map>
        `
      const lastStatement = node.parameters?.mode === "object" || node.parameters?.mode === "switch"
      if (lastStatement) {
        typeName = false
        code = `
        namespace ${nodePref}{

          ${globalTypesObjectValidation}

          ${node.runtimeContext.editorSchema!.dts}

      
           ${jsCache[node.uuid].tsCode}
        }
       `
      }


      const jsonSchema = await getTypes(code, typeName, `${node.type}-output-gen--${node.uuid}`)


      if (jsonSchema) {
        allRequired(jsonSchema)
        node.runtimeContext.outputSchema = {
          jsonSchema: jsonSchema,
          mainTypeName: "Main",
          dts: await generateDtsFromSchema(jsonSchema, `${node.type}-${node.uuid}-con type change`)
        }
      }

    } catch (e) {
      if (e.message == "Not supported: root type undefined") {
        console.warn("undefined return type to functiuon")
      } else if (e instanceof CompilerError) {
        console.error(e)
      } else {

        throw e;
      }
    }
  }
})

function setNewCode(node: ElementNode, code: Omit<CodeData, "timestamp" | "node">) {
  node.parameters ??= {}
  const codeData: CodeData = {
    ...code,
    timestamp: Date.now(),
    node: node.uuid
  }
  node.parameters.code = JSON.stringify(codeData)
}


function cacheNodeScript(node: ElementNode<NodeDefToType<{ code: { type: "monaco"; default: string; }; }>, unknown, unknown>) {
  if (node.parameters) {
    try {
      const codePAram = JSON.parse(node.parameters.code || '{}');
      const parsedCodeAData = codeSchema.parse(codePAram)
      if (parsedCodeAData) {
        let code = parsedCodeAData.jsCode
        if (code.startsWith("function map(input)")) {
          code = `(${code})(payload)`
        }

        const finalCode = code
        jsCache[node.uuid] = {
          finalCode,
          script: new Script(finalCode),
          ...parsedCodeAData
        };
      }
    } catch (e) {
      debugger
      throw e
    }
  }

  return jsCache[node.uuid]
}
