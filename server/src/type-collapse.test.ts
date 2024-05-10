
import { generateDtsFromSchema, generateJsonSchemaFromDts, mainTypeName } from './json-schema-type-util'
import type { ExtendedJsonSchema } from './typing/generic-node-type'
import { ScriptTarget, createProgram, isTypeAliasDeclaration, TypeFormatFlags, createSourceFile } from "typescript"
import { FetchingJSONSchemaStore, InputData, JSONSchemaInput, quicktype } from 'quicktype-core'
import { writeFileSync } from "fs"
import { join } from "path"
declare module "typescript" {
  export interface SourceFile {
    getNamedDeclarations(): Map<string, Array<Node>>
  }

}


describe("type operations", () => {
  it("collapses types", () => {


    const modPAth = join(__dirname, "ts", "module.ts")
    writeFileSync(modPAth, `
       export  type a={test:123};
        export type b=string;`)
    const path1 = join(__dirname, "ts", "text.ts")
    writeFileSync(path1, `
          type result=string|string;
          `)

    // compilerHost
    const p = createProgram([path1, modPAth], { declaration: true, target: ScriptTarget.Latest },)

    const typeChecker = p.getTypeChecker();

    const file = p.getSourceFiles().find(f => f.fileName.endsWith("text.ts"))

    const mainStatement = file?.getNamedDeclarations().get("result")?.[0]
    if (mainStatement && isTypeAliasDeclaration(mainStatement)) {
      const typenode = typeChecker.getTypeFromTypeNode(mainStatement.type)

      //const dts = toDTs(typenode)
      // debugger
      // const resultType = typeChecker.getTypeAtLocation(mainStatement)
      const typeFlag = TypeFormatFlags
      const typeAsString = typeChecker.typeToString(typenode, file, typeFlag.InTypeAlias)

      console.log(typeAsString);

      debugger
    } else {
      throw new Error("invalid string")
    }

  })



  it("convert d.ts to json schema", async () => {


    const schema = generateJsonSchemaFromDts(`
           type Test = {
    abc: Data
  }

  type Data = {
    key: Test
  }

    `, "Data")
    debugger
  })

  it("convert d.ts to json schema", async () => {
    const source = createSourceFile("test.ts", `
           type Test = {
    abc: Data
  }
  type Data = {
    key: Test
  } `,
      ScriptTarget.ES2022)


    debugger
  })
  it("quicktype test", async () => {
    const recursiveSchema = {
      "type": "object",
      "properties": {
        "response": { "type": "object", "properties": { "time": { "type": "number", "additionalProperties": false } }, "additionalProperties": false },
        "promise": {
          "$ref": "#/definitions/Delayed<SenderResponse<SoundType,NotificationData<SoundType>>>",
          "additionalProperties": false
        }
      },
      "definitions": {
        "Delayed<SenderResponse<SoundType,NotificationData<SoundType>>>": {
          "type": "object",
          "properties": {
            "nestedObject": {
              "$ref": "#/definitions/SenderResponse<SoundType,NotificationData<SoundType>>",
              "additionalProperties": false
            },
            "sentData": {
              "additionalProperties": false
            },
            "time": { "type": "number", "additionalProperties": false }
          },
          "additionalProperties": false
        },
        "SenderResponse<SoundType,NotificationData<SoundType>>": {
          "type": "object",
          "properties": {
            "promise": {
              "$ref": "#/definitions/Delayed<SenderResponse<SoundType,NotificationData<SoundType>>>",
              "additionalProperties": false
            },
            "notification": {
              "type": "object",
              "properties": {
                "title": { "type": "string", "additionalProperties": false },
                "sound": { "anyOf": [{ "type": "array", "items": { "type": "string" } }, { "type": "string" }], "additionalProperties": false },
                "body": { "type": "string", "additionalProperties": false }
              },
              "additionalProperties": false
            },
            "attributes": { "type": "object", "properties": { "messageId": { "type": "string", "additionalProperties": false } }, "additionalProperties": false },
            "read": { "type": "object", "properties": { "text": { "type": "string", "additionalProperties": false } }, "additionalProperties": false }
          },
          "additionalProperties": false
        }
      }, "additionalProperties": false
    }
    const dts = await generateDtsFromSchema(recursiveSchema as ExtendedJsonSchema)


    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
    const enumConstSChema = {
      "type": "object",
      "properties": {
        "latitude": {
          "type": "string",
          "enum": ["test"]
        },
        "longitude": {
          "type": "string",
          "const": "sdf"
        }
      }
    }
    await schemaInput.addSource({
      name: mainTypeName, schema: JSON.stringify(recursiveSchema)
    });

    const inputData = new InputData();
    inputData.addInput(schemaInput);

    const quicktyped = await quicktype({
      inputData,
      lang: "ts",
      inferDateTimes: true,
      allPropertiesOptional: false,
      rendererOptions: {
        'just-types': 'true',
        "prefer-unions": true,
        // "prefer-const-values": true "Use string instead of enum for string enums with single value", buggy
        //'explicit-unions': 'true',
        //'acronym-style': 'camel',
      }
    });
    const lines = quicktyped.lines.join("\n");

    debugger
  })


  it("uqicktype number", async () => {
    const schema: ExtendedJsonSchema = {
      "type": "object",
      "properties": {
        "delay": {
          "const": 10
        }
      },
      additionalProperties: false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }

    const dts = await generateDtsFromSchema(schema)
    debugger
  })

  it("schema to dts", async () => {

    const schemaCnst = await generateDtsFromSchema({
      "type": "string",
      const: "on"
    })
    expect(schemaCnst).toBe("export type Main = 'on';")


    const schema = await generateDtsFromSchema({
      "type": "string"
    })
    expect(schema).toBe("export type Main = string;")

    expect(await generateDtsFromSchema({
      "type": "string",
      enum: ["on", "off"]
    }))
      .toBe(`export type Main = "on" | "off";`)

    debugger
    console.log(schema)
  })
})