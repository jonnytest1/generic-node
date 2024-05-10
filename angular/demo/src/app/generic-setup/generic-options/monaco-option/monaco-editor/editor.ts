
//import type { createTypeScriptSandbox as cr, Sandbox } from "@typescript/sandbox"
import type { editor, languages } from "monaco-editor"

export type Decoration = editor.IModelDeltaDecoration

/*{
  options: {
    className?: string
    inlineClassName?: string
  }

  range: MonacoRange
}*/

interface Position {
  column: number
  lineNumber: number
}

export interface MonacoModel {
  onDidChangeContent(arg0: (c: any) => void): unknown
  getAllDecorations(): Array<Decoration>

  getValue(): string
  setValue(val: string): void
  getPositionAt(index: number)

  dispose(): void
}

export interface Range {
  newLength: number,
  span?: {
    start: number,
    length: number
  }
}

export type Editor = editor.ICodeEditor
/*{
  deltaDecorations(dec: Array<Decoration>, newDecorations: Array<Decoration>): Array<Decoration>


  onDidChangeModelDecorations(cb: (e) => void | Promise<void>): void


  focus()
}*/

export const AST_KIND = {
  CLASS_INSTANCE: 201,
  VARIABLE_NAME: 78, // literally any variable in any scope
  BRACKETS: 221,
  BRACKETS_2: 204,
  STATEMENT: 213,
  OBJECT_CREATION: 197,
  CLASS_INSTANCE_CALL: 198
} as const


export interface AST {
  parent: AST
  text: string
  getText(): string
  pos: number
  end: number
  arguments?: Array<AST>
  expression: AST
  kind: 198 | 78 | 200 | 201 | typeof AST_KIND[keyof typeof AST_KIND]
  getChildren(): Array<AST>
  update(val?: string, range?: Range)
}

export type SandBox = {
  getWorkerProcess(): Promise<any>
  getModel(): MonacoModel | null
  editor: Editor
  updateCompilerSettings(params)

  getAST(): Promise<AST>
  getRunnableJS(): Promise<string>
}
type createTypeScriptSandbox = any


interface MonacoRange {
  endColumn: number
  endLineNumber: number
  startColumn: number
  startLineNumber: number
}


export interface MonacoGlobal {
  editor: typeof editor

  Range: new (starLinbe: number, startColun: number, endLine: number, endColumn: number) => MonacoRange;

  languages: typeof languages
}


export interface SandboxFactory {
  createTypeScriptSandbox(sandboxConfig: {
    text: any;
    domID: string;
    monacoSettings: {
      theme: string;
      lineHeight: number;
      readOnly: boolean
    }
  },
    main: Main,
    arg2: any): SandBox

}

export interface Main {
  __typebreak
}