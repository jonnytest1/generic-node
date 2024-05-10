

import { join } from "path"
import { environment } from '../environment'





const nodefolder = environment.GENERIC_NODE_DATA ?? __dirname

const typeFolder = join(__dirname, "_type")
export const serviceFolder = join(__dirname, "node-services")
export const zodScripts = join(typeFolder, "zod")

export const typeData = join(typeFolder, "nodetypes")


export const nodesFile = join(nodefolder, "nodes.json")

export const lastEventFile = join(nodefolder, "last-events.json")

export const lastEventTimesFile = join(nodefolder, "last-event-times.json")
