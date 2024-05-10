import { CommonModule } from '@angular/common';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Component, Input, ViewChild, type AfterViewInit, type ElementRef } from '@angular/core';
import type { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { Frame } from '../../../../backend-data';

@Component({
  selector: 'app-frame-option',
  templateUrl: './frame-option.component.html',
  styleUrls: ['./frame-option.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class FrameOptionComponent implements OnInit, OnChanges, AfterViewInit {


  @Input()
  definition: Frame

  @Input()
  name: string

  @Input()
  currentValue: string

  trustedDocuemnt: SafeHtml;
  gotsize = new BehaviorSubject(false)

  documentCache: string
  documentDataCache: string


  @ViewChild("frameRef")
  frame: ElementRef<HTMLIFrameElement>

  @ViewChild("hiddenValue")
  hiddenValue: ElementRef<HTMLTextAreaElement>

  constructor(private sanitizer: DomSanitizer) {

  }

  ngOnInit() {
  }
  ngAfterViewInit(): void {
    addEventListener("message", m => {
      if (m.source === this.frame.nativeElement.contentWindow) {
        const evt = JSON.parse(m.data)
        if (evt.type === "size") {

          const size = evt.size as { width: number, height: number }

          this.frame.nativeElement.style.width = size.width + 4 + "px"
          this.frame.nativeElement.style.height = size.height + 4 + "px"
          this.gotsize.next(true)
        } else if (evt.type == "change") {
          this.hiddenValue.nativeElement.value = evt.data
          this.hiddenValue.nativeElement.dispatchEvent(new Event('change', { 'bubbles': true }))
        }
      }
    })
  }


  ngOnChanges(changes: SimpleChanges): void {
    const currentDef = JSON.stringify({ def: this.definition, value: this.currentValue })
    if (this.documentCache !== currentDef) {

      const dataCacheDef = JSON.stringify([this.definition.data, this.currentValue]);
      if (this.frame?.nativeElement && this.documentDataCache !== dataCacheDef) {
        this.frame.nativeElement.contentWindow!.postMessage(JSON.stringify({
          type: "data",
          data: this.definition.data,
          current: this.currentValue
        }), "*");
        this.documentDataCache = dataCacheDef
      } else {
        const parsed = new DOMParser().parseFromString(this.definition.document, "text/html")
        parsed.querySelectorAll("script").forEach((scr, i) => {
          scr.textContent += `\n\n//# sourceURL=content.${this.name}.${i}.js`
        })

        const dataScript = document.createElement("script")
        dataScript.type = "application/json"
        dataScript.id = "data"
        dataScript.textContent = JSON.stringify({
          type: "data",
          data: this.definition.data,
          current: this.currentValue
        })
        parsed.body.insertBefore(dataScript, parsed.body.children[0])

        const sizeScript = document.createElement("script")
        sizeScript.textContent = `
        const contentElement = document.querySelector("#content")
        new ResizeObserver((observeEntries)=>{
          const entry=observeEntries[0]
          if(entry.contentRect.width&&entry.contentRect.height){
            window.parent.postMessage(JSON.stringify({
              type: "size",
              size: entry.contentRect
            }))
          }
         
        }).observe(contentElement)
      `
        parsed.body.appendChild(sizeScript)




        this.trustedDocuemnt = this.sanitizer.bypassSecurityTrustHtml(`<html style="overflow: hidden">${parsed.head.outerHTML}\n${parsed.body.outerHTML}</html>`)
        this.documentCache = currentDef
        this.documentDataCache = dataCacheDef
      }


    }

  }
}
