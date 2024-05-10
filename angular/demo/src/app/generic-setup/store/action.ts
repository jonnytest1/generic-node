import type { ActionCreator } from '@ngrx/store';
import { createAction, props } from '@ngrx/store';
import type { Connection, ElementNode, NodeData, SetConnectionError, UpdateEditorSchema } from '../../../backend-data';
import { type NodeDefintion } from '../../../backend-data';

export const setNodeData = createAction("setnodes", props<{ data: NodeData }>())
export const updateNodeDef = createAction("update node definitions", props<{ data: Record<string, NodeDefintion> }>())

export type BackendActionType = { backendAction?: true, dispatched?: true }
function backendAction<T extends Record<string, ActionCreator>>(actions: T) {
  for (const key in actions) {
    const creator = actions[key]
    const creatorFunction: any = function create(props) {
      const obj = creator(props) as BackendActionType;
      obj.backendAction = true;
      return obj;
    };
    creatorFunction.type = creator.type
    Object.defineProperty(actions, key, {
      value: creatorFunction
    })
  }

  return actions
}


export const backendActions = backendAction({
  updatePosition: createAction("update position", props<{ node: string, position: NodeData["nodes"][number]["position"] }>()),
  deleteNode: createAction("delete node", props<{ node: string }>()),
  addNode: createAction("add node", props<{ node: ElementNode }>()),
  deleteConnection: createAction("delete connection", props<{ connection: Connection }>()),
  addConnection: createAction("add connection", props<{ connection: Connection }>()),
  setConError: createAction("set con error", props<Omit<SetConnectionError, "type">>()),
  updateGlobals: createAction("update globals", props<{ globals: Partial<NodeData["globals"]> }>()),
  updateParameter: createAction("update param", props<{
    node: string
    param: string
    value: string
  }>()),
  updateNode: createAction("update node", props<{
    nodeUuid: string
    newNode: ElementNode
  }>()),
  updateEditorSchema: createAction("update editor schema", props<Omit<UpdateEditorSchema, "type">>()),
})


export type BackendActionsMap = typeof backendActions


export type BackendActions = ReturnType<BackendActionsMap[keyof BackendActionsMap]>