
import type { ElementNode, ExtendedJsonSchema, PreparedNodeData, Schemata } from './typing/generic-node-type';
import { CompilerError, allRequired, expansionType, generateDtsFromSchema, mainTypeName } from './json-schema-type-util';
import { getTypes, validate } from './validation/watcher';
import { nodeDescriptor, nodeTypeName } from './element-node';
import { typeData } from './generic-node-constants';
import { SchemaMatchingError, validateJsonSchema } from './validation/json-schema-type.validator';
import { genericNodeDataStore } from './generic-store/reference';
import { backendToFrontendStoreActions } from './generic-store/actions';
import { selectConnectionsFromNodeUuid, selectNodeByUuid, selectTargetConnectorForNodeUuid } from './generic-store/selectors';

import { generateSchema } from 'typescript-json-schema';
import type { Diagnostic, DiagnosticMessageChain, DiagnosticRelatedInformation } from 'typescript';
import { writeFile } from "fs/promises"
import { join } from 'path';
import { log } from './log';

/*
export async function parseTypeSafe(node: ElementNode<unknown>, data: unknown) {
  let validator = schemaMap[node.uuid]?.zodValidator
  if (!validator) {
    const schema = await getComputeSchema(node)
    if (schema === null) {
      throw new Error("trying to get zod validator but no schema")
    }
    validator = schema!.zodValidator
  }
  try {
    return validator.parse(data)
  } catch (e) {
    debugger;
    throw e;
  }
}*/
/*
async function getComputeSchema(node: ElementNode<unknown>) {
  if (!node.runtimeContext?.outputSchema?.jsonSChema) {
    return null
  }
  const schemaString = JSON.stringify(node.runtimeContext?.outputSchema?.jsonSChema)
  let nodeCahce = schemaMap[node.uuid]
  if (!nodeCahce || schemaString !== nodeCahce.schemaCache) {
    const [dts] = await Promise.all([
      generateDtsFromSchema(node.runtimeContext?.outputSchema?.jsonSChema),
      // generateZodTypeFromSchema(node.runtimeContext?.outputSchema?.jsonSChema)
    ])
    nodeCahce = schemaMap[node.uuid] = {
      schemaCache: schemaString,
      dts: dts,
      //zodValidator: zodParser,
      mainTypeName: mainTypeName
    }
    const target = join(typeData, node.uuid + ".ts");
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, dts)
  }
  return nodeCahce
}*/

export async function updateTypeSchema(node: ElementNode, nodeData: PreparedNodeData) {
  let schema: Schemata | null = null

  const connectionsTargetingCurrentNode = genericNodeDataStore.getOnce(selectTargetConnectorForNodeUuid(node.uuid))
  if (connectionsTargetingCurrentNode) {
    const allConnectorsToConnection0 = connectionsTargetingCurrentNode[0]
    const schemata = await Promise.all(allConnectorsToConnection0.map(async con => {
      const connectionNode = genericNodeDataStore.getOnce(selectNodeByUuid(con.source.uuid))
      const compSchema = connectionNode.runtimeContext.outputSchema
      if (compSchema?.dts && node.runtimeContext.inputSchema) {
        try {
          const nodeTypePrefix = nodeTypeName(node)
          const connectionNodePrefi = nodeTypeName(connectionNode)

          validateJsonSchema({
            target: node.runtimeContext.inputSchema.jsonSchema,
            assigning: compSchema.jsonSchema,
            path: []
          })

          const str = `

      namespace ${nodeTypePrefix}_NodeWrapper {
        namespace ConnectionInput {

          ${compSchema?.dts}
        }

        namespace ${nodeTypePrefix}_NodeInput {
          
          ${node.runtimeContext.inputSchema.dts}
        }

        ${expansionType}
        
        type ${connectionNodePrefi}_ExpandedConInput = ExpandRecursively<ConnectionInput.${mainTypeName}>
        type ${nodeTypePrefix}_ExpandedNodeInput = ExpandRecursively<${nodeTypePrefix}_NodeInput.${mainTypeName}>

        declare let cinInput:${connectionNodePrefi}_ExpandedConInput

        const nodeInput: ${nodeTypePrefix}_ExpandedNodeInput = cinInput

        type ResultType=${nodeTypePrefix}_NodeInput.${mainTypeName}
    }
`;
          // writeFile(join(typeData, `${node.uuid}__${connectionNode.uuid}.ts`), str)
          await validate(`connections_to_${node.uuid}`, str, `${node.type}-${node.uuid}-con input check`)

          genericNodeDataStore.dispatch(backendToFrontendStoreActions.setConnectionError({
            connection: con.uuid,
            error: undefined
          }))
        } catch (e) {

          if (e instanceof SchemaMatchingError) {
            genericNodeDataStore.dispatch(backendToFrontendStoreActions.setConnectionError({
              connection: con.uuid,
              error: e.toMessageString()
            }))

          } else {
            let firstError = e as DiagnosticRelatedInformation | DiagnosticMessageChain
            if (e instanceof CompilerError) {
              firstError = e.error_diagnostics[0] as Diagnostic
            }

            while (typeof firstError.messageText != "string" && firstError.messageText?.next?.[0]) {
              firstError = firstError.messageText.next?.[0]
            }
            if (typeof firstError.messageText == "string") {
              let messageText = firstError.messageText

              for (const subType of ["ExpandedConInput", "ExpandedNodeInput"])
                if (messageText.includes(subType)) {
                  const subSchema = generateSchema(e.program, subType, { ignoreErrors: true })
                  if (subSchema) {
                    let dtsrelace = await generateDtsFromSchema(subSchema as ExtendedJsonSchema, `${node.type}-${node.uuid}-err handling resolve`)
                    dtsrelace = dtsrelace.trim().replace("export type Main = ", "").replace(/;$/, "").trim()
                    messageText = messageText.replace(subType, dtsrelace)
                  }
                }
              genericNodeDataStore.dispatch(backendToFrontendStoreActions.setConnectionError({
                connection: con.uuid,
                error: messageText
              }))
            } else {
              debugger;
            }

          }


        }
      }
      return {
        schema: compSchema,
        nodeUuidType: nodeTypeName(connectionNode)
      }
    }))
    const filteredSchemas = schemata.filter((sch): sch is NonNullable<typeof sch> => !!sch?.schema)
    if (filteredSchemas.length > 0) {
      schema = filteredSchemas[0].schema || null
      if (filteredSchemas.length > 1) {
        const schemaDtss = filteredSchemas.map(schema => `
            namespace ${schema.nodeUuidType} {
                 ${schema.schema?.dts}
            }
          `)
        const mergingDts = `

          ${schemaDtss.join("\n\n")}

          type ${mainTypeName}=${filteredSchemas.map(s => `${s.nodeUuidType}.${mainTypeName}`).join("|")}
        `
        try {
          const mergedSchema = await getTypes(mergingDts, mainTypeName, `connection-type-merge-${node.uuid}`)
          allRequired(mergedSchema)
          schema = {
            jsonSchema: mergedSchema,
            mainTypeName: mainTypeName,
            dts: await generateDtsFromSchema(mergedSchema)
          }
        } catch (e) {
          const err = new Error("error getting merged type for " + filteredSchemas.length + " connections on node " + nodeDescriptor(node), { cause: e, });
          err["mergingDts"] = mergingDts
          throw err
        }
      }
    }

  }

  if (schema == null) {
    schema = {
      dts: `type ${mainTypeName}=any`,
      //zodValidator: z.never(),
      jsonSchema: {},
      mainTypeName: "Main"
    }
  }
  if (!schema?.dts) {
    log("WARN", "no schema")
    return
  }


  const nodeTypeImplemenations = nodeData.typeImpls[node.type]

  await nodeTypeImplemenations.connectionTypeChanged?.(node, schema);

  if (node.runtimeContext?.editorSchema?.dts) {
    writeFile(join(typeData, `editorschema_${node.uuid}.ts`), node.runtimeContext?.editorSchema.dts)
  }

  const outConnections = genericNodeDataStore.getOnce(selectConnectionsFromNodeUuid(node.uuid))

  if (outConnections) {
    for (const connectorIndex in outConnections) {
      for (const connector of outConnections[connectorIndex]) {
        try {
          const nextNode = genericNodeDataStore.getOnce(selectNodeByUuid(connector.uuid))
          await updateTypeSchema(nextNode, nodeData)
        } catch (e) {
          throw new Error("error validating node " + connector.uuid, {
            cause: e
          })
        }
      }
    }
  }
}




