import type { AfterViewChecked, AfterViewInit, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Component, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { GenericNodesDataService } from '../generic-node-data-service';
import type { PendingConnection } from '../generic-node-data-service';
import type { Connection } from '../../../backend-data';
import { extendCanvasContext } from '../../util/canvas-vector';
import { pointIsInPoly } from '../../util/point-in-polygon';
import { Vector2 } from '../../util/vector';




@Component({
  selector: 'app-line',
  templateUrl: './line.component.html',
  styleUrls: ['./line.component.scss'],
  standalone: true
})
export class LineComponent implements OnChanges, AfterViewChecked, AfterViewInit, OnDestroy {

  static curveOffset = 40;
  @Input()
  line: Connection | PendingConnection

  @ViewChild("linecanvas")
  canvas: ElementRef<HTMLCanvasElement>

  @Input()
  editing: boolean

  @Input()
  active: boolean


  @Output()
  clicked = new EventEmitter()

  vectorCanvas: ReturnType<typeof extendCanvasContext>
  isHovering: boolean;


  callback = {
    mousemove: (e: MouseEvent) => {
      this.mousePos = new Vector2(e)
    },
    click: (e: MouseEvent) => {
      if (this.isHovering) {
        this.clicked.emit(e)
        e.stopPropagation()
      }
    }
  }

  constructor(private con: GenericNodesDataService) {

  }
  ngOnDestroy(): void {

    window.removeEventListener("mousemove", this.callback.mousemove)
    window.removeEventListener("click", this.callback.click, true)
  }
  mousePos: Vector2

  ngAfterViewInit(): void {

    var scale = 2;


    this.canvas.nativeElement.width = Math.floor(window.innerWidth);
    this.canvas.nativeElement.height = Math.floor(window.innerHeight);
    this.vectorCanvas = extendCanvasContext(this.canvas.nativeElement)



    window.addEventListener("mousemove", this.callback.mousemove)
    window.addEventListener("click", this.callback.click, true)
  }

  lineCache: string

  errorText: string | null | undefined = null


  center: Vector2

  ngAfterViewChecked(): void {
    if (this.line.target && this.canvas?.nativeElement) {
      let target: Vector2
      if (this.line.target instanceof DragEvent) {
        target = new Vector2(this.line.target)
      } else {
        const targetEl = this.con.getConnectionElement(this.line.target, "in")
        if (!targetEl) {
          return
        }
        target = Vector2.fromBoundingClientRect(targetEl.getBoundingClientRect(), "center")

      }


      const sourceEl = this.con.getConnectionElement(this.line.source, "out")
      if (!sourceEl) {
        debugger
        return
      }
      const source = Vector2.fromBoundingClientRect(sourceEl.getBoundingClientRect(), "center")

      const lineVector = target.subtract(source);
      let length = lineVector.length() - 6
      if (this.line.target instanceof DragEvent) {
        length -= 6
      }
      const sourcePadding = 4
      const scaledLine = lineVector.scaleTo(length - sourcePadding)


      let from = source.added(lineVector.scaleTo(4))
      let to = target.subtract(lineVector.scaleTo(4))
      let curved = false
      if (from.x > to.x) {
        from = source.added(lineVector.scaleTo(4).rotateDeg(-90))
        to = target.subtract(lineVector.scaleTo(4).rotateDeg(-90))
        curved = true
      }


      const cacheStr = JSON.stringify({
        err: this.errorText,
        from,
        to,
        mp: this.mousePos
      })

      if (cacheStr === this.lineCache) {
        return
      }

      this.vectorCanvas.clearRect!(0, 0, window.innerWidth, window.innerHeight);
      const marginLine = lineVector.scaleTo(10)
      const right = marginLine.rotateDeg(90)
      let linePoints = [
        from.subtract(marginLine).added(right),
        from.subtract(marginLine).subtract(right),
        to.added(marginLine).subtract(right),
        to.added(marginLine).added(right)
      ];
      if (curved) {
        this.center = Vector2.center(from, to)
        linePoints = [
          from.subtract(marginLine).added(right),
          from.subtract(marginLine).subtract(right),
          new Vector2(from.x + LineComponent.curveOffset, this.center.y),
          new Vector2(this.center.x, this.center.y),
          new Vector2(to.x - LineComponent.curveOffset, this.center.y),
          to.added(marginLine).subtract(right),
          to.added(marginLine).added(right)
        ];
      }
      this.isHovering = this.mousePos && pointIsInPoly(this.mousePos, linePoints)


      if (this.isHovering || this.active) {
        this.vectorCanvas.strokeStyle = "orange"
        this.drawLine(from, to, {
          lineWidth: 8
        })
      }
      this.vectorCanvas.strokeStyle = "green"
      if (!!this.errorText) {
        this.vectorCanvas.strokeStyle = "red"
      }
      this.drawLine(from, to, {});

      if (this.errorText && this.mousePos && this.isHovering) {
        console.log("drawing text")

        const textStart = source.added(lineVector.dividedBy(2)).subtract(0, 4).rounded();
        this.vectorCanvas.fillStyle = "#353434"
        this.vectorCanvas.lineWidth = 1
        this.vectorCanvas.font = `100 16px Times New Roman`;

        this.vectorCanvas.strokeStyle = "white"

        const metrics = this.vectorCanvas.measureText(this.errorText)
        this.vectorCanvas.textAlign = 'left';
        // this.vectorCanvas.textBaseline = 'top';
        this.vectorCanvas.vecFillDim(textStart.subtract(4, 16), new Vector2(metrics.width + 10, 22))
        this.vectorCanvas.fillStyle = "white"
        this.vectorCanvas.vecFillText(this.errorText, textStart)
        this.vectorCanvas.stroke();
      }

      this.lineCache = cacheStr
      /* const lineBox = BoundingBox.fromDiagonal(source.added(scaledLine.scaleTo(sourcePadding)), scaledLine)
       //const lineBox = new BoundingBox(this.line.source, this.line.target).withMargin(new Vector2(4, 4))
 
       VectorDomUtils.applyPosition(this.elementLine.nativeElement, lineBox)
 
       VectorDomUtils.applyRotation(this.elementLine.nativeElement, lineBox)
       VectorDomUtils.applyDimensionVector(this.elementLine.nativeElement, new Vector2(length, 4))*/
    }
  }
  private drawLine(from: Vector2, to: Vector2, opts: { lineWidth?: number, } = {}) {


    opts.lineWidth ??= 4
    this.vectorCanvas.lineWidth = opts.lineWidth;

    if (from.x > to.x) {
      this.vectorCanvas.beginPath();
      this.vectorCanvas.vecMoveTo(from);


      this.vectorCanvas.quadraticCurveTo(from.x + LineComponent.curveOffset, this.center.y, this.center.x, this.center.y);

      this.vectorCanvas.quadraticCurveTo(to.x - LineComponent.curveOffset, this.center.y, to.x, to.y);
    } else {
      this.vectorCanvas.beginPath();
      this.vectorCanvas.vecMoveTo(from);
      this.vectorCanvas.vecLineTo(to);
    }
    this.vectorCanvas.stroke();

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.line.source.error) {
      this.errorText = this.line.source.error
    } else if (this.line.target && "error" in this.line.target) {
      this.errorText = this.line.target.error
    } else {
      this.errorText = null
    }
  }


}
