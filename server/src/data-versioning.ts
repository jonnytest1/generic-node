import type { NodeData } from './typing/generic-node-type';
import { v4 } from "uuid"
export const currentVersion = 1

export function migrate(data: NodeData): NodeData {
  if (!data.version) {
    data.connections.forEach(con => {
      if (!con.uuid) {
        con.uuid = v4()
      }
    })
    data.version = 1
    return data
  } else {
    throw new Error("Missing migration")
  }
}






