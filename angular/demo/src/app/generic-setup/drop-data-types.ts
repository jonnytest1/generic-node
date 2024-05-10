import type { NodeDefintion } from '../../backend-data'


export interface DropData {
  dragOffset: { x: number, y: number }
  node: Node,


  connectionDrag: true
  nodeDrag: true

  nodeDefinition: NodeDefintion
}