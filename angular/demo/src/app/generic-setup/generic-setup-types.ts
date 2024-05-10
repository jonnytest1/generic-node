import { Connection, ElementNode } from '../../backend-data'

export type ActiveElement = {
  type: "node",
  node: ElementNode
} | { type: "connection", con: Connection }