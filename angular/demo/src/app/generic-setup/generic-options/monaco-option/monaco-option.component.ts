import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input, type OnChanges, type SimpleChanges, type ElementRef, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MonacoEditorComponent } from './monaco-editor/monaco-editor.component';
import { ElementNode, NodeOptionTypes } from '../../../../backend-data';
import { FormsModule } from '@angular/forms';


const expansionType = `
  type ExpandRecursively<T> = T extends Date 
      ? T 
      : T extends object
        ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
        : T;
`


@Component({
  selector: 'app-monaco-option',
  templateUrl: './monaco-option.component.html',
  styleUrls: ['./monaco-option.component.scss'],
  imports: [CommonModule, MonacoEditorComponent, FormsModule],
  standalone: true
})
export class MonacoOptionComponent implements OnInit, OnChanges {

  @Input({ required: true })
  name: string


  @Input({ required: true })
  value


  @Input({ required: true })
  definition: NodeOptionTypes


  @ViewChild("hiddenValue")
  elementRef: ElementRef<HTMLTextAreaElement>


  @Input({ required: true })
  node: ElementNode

  typeDefinition = new BehaviorSubject<string>("")
  lastNodeChange: number = 0
  constructor() { }

  private _additionalVal: string;
  private _code: string;


  monacoData: {
    tsCode: string,
    jsCode: string,
    timestamp: number,
    node: string
  }
  get code() {
    if (!this._code) {
      const def = this.definition

      if (def.type == "monaco" && def.default) {
        return def.default
      }
    }

    return this._code || "'test'"
  }


  public get additionalVal(): string {
    return this._additionalVal;
  }

  ngOnInit() {
  }


  ngOnChanges(changes: SimpleChanges): void {
    if ("node" in changes) {
      this.lastNodeChange = Date.now()
    }
    try {
      if (this.value) {
        const monacoData = JSON.parse(this.value) as typeof this.monacoData
        if (!this.monacoData || (monacoData.timestamp && monacoData.timestamp > this.monacoData.timestamp) || monacoData.node !== this.monacoData.node) {
          this.monacoData = monacoData
          this._code = this.monacoData.tsCode
          this._additionalVal = this.monacoData.jsCode
          if (this.elementRef) {
            this.elementRef.nativeElement.value = JSON.stringify(this.monacoData)
          }
        } else {
          console.log("skipped update due to timing")
        }
      }
    } catch (e) {
      debugger
    }


    const typeDefinition = `
          

          ${expansionType}

          export namespace EditorSchema {
            ${this.node.runtimeContext?.editorSchema?.dts ?? ''}
          }

          declare global {
            ${this.node.runtimeContext?.editorSchema?.globals ?? ''}

            type InputType = EditorSchema.InputType;  
          }

      \n;

      export {};
      `

    this.typeDefinition.next(typeDefinition)

  }

  updateCode(evt: { js: string; ts: string; }) {
    if (this.lastNodeChange + (2000) > Date.now()) {
      return
    }
    this.monacoData = {
      tsCode: evt.ts,
      timestamp: Date.now(),
      jsCode: evt.js,
      node: this.node.uuid
    }
    this._additionalVal = evt.js;
    this._code = evt.ts

    this.elementRef.nativeElement.value = JSON.stringify(this.monacoData)
    setTimeout(() => {
      this.elementRef.nativeElement.dispatchEvent(new Event('change', { 'bubbles': true }))
    }, 1)
  }

}
