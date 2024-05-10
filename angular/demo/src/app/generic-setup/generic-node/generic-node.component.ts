import { CommonModule } from '@angular/common';
import type { AfterViewInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Component, Input, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { GenericNodesDataService } from '../generic-node-data-service';
import { DropDataHandler } from '../drop-data';
import type { DropData } from '../drop-data-types';
import type { ElementNode } from '../../../backend-data';
import { MatIconModule } from '@angular/material/icon';
import { Observable, combineLatest, of, timer } from "rxjs"
import { map, } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectNode } from '../store/selectors';
import { LetModule } from '@ngrx/component';
import { StoreService } from '../store/store-service';
const dataHandler = new DropDataHandler<DropData>()
@Component({
  selector: 'app-generic-node',
  templateUrl: './generic-node.component.html',
  styleUrls: ['./generic-node.component.scss'],
  imports: [CommonModule, MatIconModule, LetModule],
  standalone: true
})
export class GenericNodeComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input()
  nodeUuid: string | undefined

  inputsCt$: Observable<Array<null>>

  outputCt$: Observable<Array<null>>

  @Input()
  editable = false

  @Input()
  selected = false
  @Input()
  highlightText = false

  @Input()
  prefix = ""

  size$: Observable<number>

  @ViewChildren("output")
  outputElements: QueryList<ElementRef<HTMLElement>>

  @ViewChildren("input")
  inputElements: QueryList<ElementRef<HTMLElement>>

  node$: Observable<ElementNode | undefined>
  activity$ = combineLatest([
    this.con.nodeEventTimes,
    timer(0, 100),
  ]).pipe(
    map(([eventTimes]) => {

      if (!this.nodeUuid || !eventTimes?.[this.nodeUuid]) {
        return {
          input: undefined,
          output: undefined
        }
      }
      return eventTimes[this.nodeUuid]
    })
  )

  is_Active = this.activity$.pipe(map(times => {
    return {
      output: this.isActive(times.output),
      input: this.isActive(times.input)
    }
  }))

  constructor(private elementRef: ElementRef<HTMLElement>,
    public con: GenericNodesDataService,
    private store: Store,
    private storeService: StoreService

  ) {


  }

  ngAfterViewInit(): void {
    const nodeUuid = this.nodeUuid;
    if (this.editable && nodeUuid) {
      this.outputElements.forEach((el, i) => {
        this.con.registerConnection(nodeUuid, "out", i, el.nativeElement)
      })
      this.inputElements.forEach((el, i) => {
        this.con.registerConnection(nodeUuid, "in", i, el.nativeElement)
      })
    }
  }
  localeTime(time: number) {
    return new Date(time).toLocaleTimeString()
  }

  ngOnChanges(changes: SimpleChanges): void {


    const inputCt = this.storeService.getInputCount(this.nodeUuid ?? "", this.prefix);
    const ouputCt = this.storeService.getOutputCount(this.nodeUuid ?? "", this.prefix);
    this.inputsCt$ = inputCt
      .pipe(map(ct => {
        return new Array(ct).fill(null);
      }))
    this.outputCt$ = ouputCt
      .pipe(map(ct => {
        return new Array(ct).fill(null);
      }))
    this.size$ = combineLatest([
      inputCt,
      ouputCt
    ])
      .pipe(map(([i, o]) => Math.max(i, o)))



    if (this.nodeUuid) {

      this.node$ = this.store.select(selectNode(this.nodeUuid))
    }
  }
  ngOnDestroy(): void {
    if (this.nodeUuid) {
      delete this.con.connectorMap[this.nodeUuid]
    }
  }



  startConnection(evt: DragEvent, indx) {
    if (this.editable && this.nodeUuid) {
      this.con.addConnection(this.nodeUuid, indx)
      dataHandler.setDropData(evt, "connectionDrag", true)
      evt.stopPropagation()
    }
  }
  dropAllowed(evt: DragEvent) {
    const isAllowed = dataHandler.hasKey(evt, "connectionDrag");
    if (isAllowed) {
      evt.preventDefault()
    }
  }
  onDrop(evt: DragEvent, indx: number) {
    if (dataHandler.hasKey(evt, "connectionDrag") && this.nodeUuid) {
      this.con.finalize(this.nodeUuid, indx)
      evt.stopPropagation()
    }
  }

  isActive(time?: number) {
    if (!time) {
      return false
    }

    return time > (Date.now() - (1000 * 2))
  }
}
