import type { OnChanges, SimpleChanges } from '@angular/core';
import { Directive, Input, ElementRef } from '@angular/core';
import { Vector2 } from '../util/vector';

@Directive({
  selector: '[position]', standalone: true
})
export class PositionDirective implements OnChanges {

  @Input()
  position: Vector2 | { x: number, y: number }
  constructor(private elementRef: ElementRef<HTMLElement>) {
    this.elementRef.nativeElement.style.position = "absolute"
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.position) {
      if (this.position instanceof Vector2) {
        this.elementRef.nativeElement.style.left = this.position.xStyle;
        this.elementRef.nativeElement.style.top = this.position.yStyle;
      } else {
        const posvector = new Vector2(this.position)

        this.elementRef.nativeElement.style.left = posvector.xStyle;
        this.elementRef.nativeElement.style.top = posvector.yStyle;


      }


    }
  }
}
