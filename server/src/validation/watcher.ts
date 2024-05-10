import { JsonSchemaWatcher } from './json-schema-watcher';
import type { ExtendedJsonSchema } from '../typing/generic-node-type';
import { CompilerError, postfix } from '../json-schema-type-util';
import {
  Diagnostic, SemanticDiagnosticsBuilderProgram, WatchOfConfigFile, createSemanticDiagnosticsBuilderProgram,
  createWatchCompilerHost, createWatchProgram, isExpressionStatement, sys, Node, isModuleDeclaration, isModuleBlock
} from 'typescript';
import { join, basename } from 'path';
import { writeFileSync } from 'fs';


const tsconfig = join(__dirname, "files", "tsconfig.json")
const types = join(__dirname, "files", "types")



const fileRromiseMap: Record<string, { res, err, starttime?: number, timeadded: number, path: string }> = {}

export async function validate(filename: string, dts: string, tracer?: string) {
  return new Promise<string>((res, err) => {
    const file = join(types, filename + ".ts")
    fileRromiseMap[filename] = { res, err, timeadded: Date.now(), path: file }

    writeFileSync(file, `// ${Date.now()}
    export {}
${dts}

`)
    console.log("validating type " + tracer)
  })
}

function reportDiagnostic(diagnostic: Diagnostic, ...args) {
  if (diagnostic.file) {
    const fileBaseName = basename(diagnostic.file.fileName, ".ts");
    const promiseRef = fileRromiseMap[fileBaseName]
    if (promiseRef) {
      const diagObj = { ...diagnostic, file: diagnostic.file?.fileName }
      promiseRef.err(new CompilerError("typescript compiler error", [diagObj]))
      delete fileRromiseMap[fileBaseName]
    }
  }
}
/**
 * Prints a diagnostic every time the watch status changes.
 * This is mainly for messages like "Starting compilation" or "Compilation completed".
 */
function reportWatchStatusChanged(diagnostic: Diagnostic, ...args) {
  if (diagnostic.code === 6031) {//starting
    Object.values(fileRromiseMap).forEach(v => v.starttime = Date.now())
    return
  }
  if (diagnostic.code === 6032) {//change detected
    Object.values(fileRromiseMap).forEach(v => v.starttime = Date.now())
    return
  }
  //6193 -> found n errors but already "err"d in singular report (all that remain are good)

  if (diagnostic.code == 6194 || diagnostic.code === 6193) {
    [...Object.entries(fileRromiseMap)].forEach(([k, v]) => {
      if (v.timeadded < v.starttime!) {
        v.res(v.path)
        delete fileRromiseMap[k]
      }
    })
    return
  }
  console.info(diagnostic);
}

let watchProgram: WatchOfConfigFile<SemanticDiagnosticsBuilderProgram>

let schemaWatcher: JsonSchemaWatcher
export function init() {
  const host = createWatchCompilerHost(tsconfig, {
    noEmit: true
  }, sys, createSemanticDiagnosticsBuilderProgram, reportDiagnostic, reportWatchStatusChanged)

  watchProgram = createWatchProgram(host)
  schemaWatcher = new JsonSchemaWatcher(watchProgram.getProgram().getProgram())
  schemaWatcher.buildWatchGenerator({})
}

export async function getTypes(dts: string, mainType_else_laststatement: string | false, tracer: string) {

  const file = await validate(tracer, dts, tracer)
  const program = watchProgram.getProgram().getProgram()


  const tsSourceFile = program.getSourceFile(file)
  if (!tsSourceFile) {
    throw new Error("didnt get source file")
  }
  const typeChecker = program.getTypeChecker()


  let statement: Node = tsSourceFile.statements[tsSourceFile.statements.length - 1]
  if (isModuleDeclaration(statement)) {
    const modStatements = statement.body
    if (modStatements && isModuleBlock(modStatements)) {
      statement = modStatements.statements[modStatements.statements.length - 1]
    }
  }
  if (mainType_else_laststatement !== false) {
    const decl = tsSourceFile.getNamedDeclarations().get(mainType_else_laststatement);
    if (decl) {
      statement = decl[0]
    }

  }

  if (isExpressionStatement(statement)) {
    statement = statement.expression
  }
  const typeDecl = typeChecker.getTypeAtLocation(statement)

  schemaWatcher.addSourceFile(tsSourceFile)
  const generated = schemaWatcher?.getTypeDefinition(typeDecl);

  postfix(generated)
  return generated as ExtendedJsonSchema


}
