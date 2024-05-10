import type { ExtendedJsonSchema } from './typing/generic-node-type'
import { zodScripts } from './generic-node-constants'
import { FetchingJSONSchemaStore, InputData, JSONSchemaInput, quicktype } from 'quicktype-core'

import {
  Diagnostic, ScriptKind, ScriptTarget, TypeFormatFlags, createCompilerHost, createProgram, createSourceFile,
  factory, getPreEmitDiagnostics, isExpressionStatement, isTypeAliasDeclaration, Node
} from 'typescript'
import { generateSchema, buildGenerator } from 'typescript-json-schema'

import type * as z from "zod"
import { v4 } from "uuid"
import type { JSONSchema6Definition } from 'json-schema'
import { join, dirname } from "path"
import { writeFile, mkdir, rm } from "fs/promises"
import { log } from './log'


declare module "typescript" {
  export interface SourceFile {
    getNamedDeclarations(): Map<string, Array<Node>>
  }

}


export const expansionType = `
  type ExpandRecursively<T> = T extends Date 
      ? T 
      : T extends object
        ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
        : T;
`

export function typeMerge(newType: string, oldType: string, mainInterfaceName: string) {
  const source = createSourceFile("text.ts", `
          type ExpandRecursively<T> = T extends object
              ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
              : T;
          declare namespace Previous{
            ${oldType}
          }

          declare namespace Current{
            ${newType}
          }

          type result=ExpandRecursively<(Previous.${mainInterfaceName}|Current.${mainInterfaceName})>;
    `, ScriptTarget.Latest, true, ScriptKind.TS)

  const compilerHost = createCompilerHost({})
  const getSoruce = compilerHost.getSourceFile
  compilerHost.getSourceFile = (file, l, onError, createNew) => {
    if (file == "text.ts") {
      return source
    }
    return getSoruce(file, l, onError, createNew)
  }
  const p = createProgram(["text.ts"], { declaration: true, target: ScriptTarget.Latest }, compilerHost)

  const typeChecker = p.getTypeChecker();

  const mainStatement = source.getNamedDeclarations().get("result")?.[0]
  if (mainStatement && isTypeAliasDeclaration(mainStatement)) {
    const typenode = typeChecker.getTypeFromTypeNode(mainStatement.type)
    // const resultType = typeChecker.getTypeAtLocation(mainStatement)
    const typeAsString = typeChecker.typeToString(typenode, factory.createTypeLiteralNode([]), TypeFormatFlags.InTypeAlias)

    console.log(typeAsString);

    return typeAsString
  } else {
    throw new Error("invalid string")
  }

}


function canDoSchema(jsonSchema: ExtendedJsonSchema | (JSONSchema6Definition & object)) {
  if (jsonSchema.type == "object") {
    return true
  } else if (jsonSchema.type == "string" && (jsonSchema.enum?.length || jsonSchema.const)) {
    return true
  } else if (jsonSchema.type == "string") {
    return false
  } else if (jsonSchema.type == "boolean") {
    return false
  } else if (jsonSchema.type == "number") {
    return false
  } else if (jsonSchema.anyOf) {
    return true
  } else if (jsonSchema.$ref) {
    return true
  }
  debugger
  return true
}


export async function generateDtsFromSchema(jsonSchema: ExtendedJsonSchema | (JSONSchema6Definition & object), traceId?: string) {

  if (traceId) {
    console.log("creating schema for " + traceId)
  } else {
    log("WARN", "missing traceid for call")
  }
  let wrapper = false
  if (!canDoSchema(jsonSchema)) {
    wrapper = true
    jsonSchema = {
      type: "object",
      properties: {
        wrapper: jsonSchema
      },
      required: ["wrapper"],
      additionalProperties: false
    }
  }

  const definistionStr = ""
  /*if (jsonSchema.definitions) {
    for (const def in jsonSchema.definitions) {
      jsonSchema.definitions[def]
      definistionStr = `${definistionStr}
      
      ${await generateDtsFromSchema(jsonSchema.definitions[def] as ExtendedJsonSchema)}
      `
    }
  }*/

  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
  await schemaInput.addSource({ name: mainTypeName, schema: JSON.stringify(jsonSchema) });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const quicktyped = await quicktype({
    inputData,
    lang: "ts",
    inferDateTimes: true,
    allPropertiesOptional: false,
    ignoreJsonRefs: false,
    rendererOptions: {
      'just-types': 'true',
      "prefer-unions": true,
      // "prefer-const-values": true "Use string instead of enum for string enums with single value",
      //'explicit-unions': 'true',
      //'acronym-style': 'camel',
    }
  });
  const lines = quicktyped.lines;

  if (wrapper) {
    lines[0] = ""
    lines[1] = lines[1].replace(/wrapper: ([^;]*);/, `export type ${mainTypeName} = $1;`).trim()
    lines[2] = ""
    return `
        ${lines.join("\n")}
    `.trim()
  }

  const str = lines.join("\n").trim()


  return str
}


export function programFromSource(name: string, source: string) {

  const tsSourceFile = createSourceFile(name, source, ScriptTarget.Latest)

  const host = createCompilerHost({

  })
  const program = createProgram([name], {
  }, {
    ...host,
    getSourceFile(file, ...args) {
      if (file === name) {
        return tsSourceFile
      }
      return host.getSourceFile(file, ...args)
    }
  })
  return { program, tsSourceFile }
}


export class CompilerError extends Error {

  constructor(message: string, public error_diagnostics: Array<Omit<Diagnostic, "file">>) {
    super(message)

  }
}
export function postfix(schema: ExtendedJsonSchema) {
  if (!schema.$ref && schema.type == "object") {
    schema.additionalProperties = false
  }


  if (schema.properties) {
    for (const prop in schema.properties) {
      const sub = schema.properties[prop]
      if (typeof sub == "object") {
        postfix(sub)
      }
    }
  }
  if (schema.definitions) {
    for (const prop in schema.definitions) {
      const sub = schema.definitions[prop]
      if (typeof sub == "object") {
        postfix(sub)
      }
    }
  }
}
export function allRequired(schema: ExtendedJsonSchema) {
  if (!schema.$ref && schema.type == "object") {
    schema.required = Object.keys(schema.properties ?? {})
  }


  if (schema.properties) {
    for (const prop in schema.properties) {
      const sub = schema.properties[prop]
      if (typeof sub == "object") {
        allRequired(sub)
      }
    }
  }
  if (schema.definitions) {
    for (const prop in schema.definitions) {
      const sub = schema.definitions[prop]
      if (typeof sub == "object") {
        allRequired(sub)
      }
    }
  }
}
export function generateJsonSchemaFromDts(dts: string, mainType: string | boolean, traceId: string) {
  if (traceId) {
    console.log("creating jscon schema from dts for " + traceId)
  } else {
    log("WARN", "missing traceid for call")
  }
  const program = programFromSource("text.ts", `
      ${dts}
  `)
  const emitResults = getPreEmitDiagnostics(program.program)
  if (emitResults.length) {
    const jsonSafeResults = emitResults
      .map(r => ({ ...r, file: null }))
    throw new CompilerError("typescript compiler error while generating schema", jsonSafeResults)
  }
  if (typeof mainType == "boolean") {
    const gnerator = buildGenerator(program.program, {
      ref: false
    })
    const typeChecker = program.program.getTypeChecker()
    let statement: Node = program.tsSourceFile.statements[program.tsSourceFile.statements.length - 1]
    if (isExpressionStatement(statement)) {
      statement = statement.expression
    }
    const typeDecl = typeChecker.getTypeAtLocation(statement)
    //@ts-ignore
    const generated = gnerator?.getTypeDefinition(typeDecl, false, undefined, undefined, undefined, undefined, true) as ExtendedJsonSchema;
    //@ts-ignore
    generated.definitions = gnerator?.reffedDefinitions

    postfix(generated)
    return generated as ExtendedJsonSchema
  }
  const schema = generateSchema(program.program, mainType, {
    //required: true, constAsEnum: true, noExtraProps: true,
  }, ["test.ts"])
  if (schema) {
    postfix(schema as ExtendedJsonSchema)
    return schema as ExtendedJsonSchema
  }
  throw new Error("didnt get a schema")
}


export const mainTypeName = "Main"
export async function generateZodTypeFromSchema(jsonSchema: ExtendedJsonSchema, traceId?: string) {
  if (traceId) {
    console.log("creating zod schema for " + traceId)
  } else {
    log("WARN", "missing traceid for call")
  }
  let wrapper = false
  if (!canDoSchema(jsonSchema)) {
    wrapper = true
    jsonSchema = {
      type: "object",
      properties: {
        wrapper: jsonSchema
      },
      required: ["wrapper"],
      additionalProperties: false
    }
  }
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
  await schemaInput.addSource({ name: mainTypeName, schema: JSON.stringify(jsonSchema) });

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const quicktyped = await quicktype({
    inputData,
    lang: "typescript-zod",
    inferDateTimes: true,
    allPropertiesOptional: false,
    rendererOptions: {
      'just-types': 'true',
      "prefer-unions": true,
      "prefer-const-values": true
    }
  });
  const lines = quicktyped.lines;

  const str = lines.join("\n").trim()

  const target = join(zodScripts, v4() + ".ts");
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, str)

  const module = require(target)


  rm(target)
  const zodValidator = module[`${mainTypeName}Schema`] as z.ZodObject<{ wrapper: never }>

  if (wrapper) {
    return zodValidator.shape.wrapper as z.ZodObject<never>
  }
  return zodValidator as z.ZodObject<never>

}
