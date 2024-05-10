import { Vector2 } from './vector';


export function extendCanvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("no context")
  }
  const extendedContext = {
    ...context,
    vecMoveTo: (to: Vector2) => {
      context.moveTo(to.x, to.y);
    },
    vecLineTo: (to: Vector2) => {
      context.lineTo(to.x, to.y);
    },
    vecStrokeText(text: string, pos: Vector2) {
      context.strokeText(text, pos.x, pos.y)
    },
    vecFillText(text: string, pos: Vector2) {
      context.fillText(text, pos.x, pos.y)
    },
    vecFillRect(source: Vector2, target: Vector2) {
      const dim = target.subtract(source)
      context.fillRect(source.x, source.y, dim.x, dim.y)
    },
    vecFillDim(source: Vector2, dim: Vector2) {
      context.fillRect(source.x, source.y, dim.x, dim.y)
    }
  };
  for (const prop of Object.getOwnPropertyNames(context.constructor.prototype)) {
    const key = prop as keyof CanvasRenderingContext2D
    const val = context[key]
    if (typeof val == "function") {
      //@ts-ignore
      extendedContext[key] = val.bind(context) as any
    } else {
      Object.defineProperty(extendedContext, key, {
        set(val) {
          //@ts-ignore
          context[key] = val
        }
      })
    }

  }
  return extendedContext as CanvasRenderingContext2D & typeof extendedContext
}
