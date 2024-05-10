import { createAction, props, type ActionCreator } from '../../util/data-store/action'
import type { AddConnection, DeleteConnection, DeleteNOdeEvet, SetConnectionError, StoreEvents, UpdateEditorSchema, UpdateGlobals, UpdateParam, UpdatepositionEvent } from '../typing/frontend-events'
import type { ElementNode, NodeData } from '../typing/generic-node-type'

function createReducerAction<T extends (StoreEvents["type"] & string)>(type: T, props: () => Omit<(StoreEvents & { type: T }), "type">) {
  return createAction(type, props)
}

export const backendToFrontendStoreActions = {
  /**
   * @deprecated should be made more specific (except for add)
   */
  updateNode: createReducerAction("update node", props<{
    newNode: ElementNode
  }>()),

  updateEditorSchema: createReducerAction("update editor schema", props<UpdateEditorSchema>()),
  updateGlobals: createReducerAction("update globals", props<UpdateGlobals>()),
  updateParam: createReducerAction("update param", props<UpdateParam>()),
  updatePosition: createReducerAction("update position", props<UpdatepositionEvent>()),

  addConnnection: createReducerAction("add connection", props<AddConnection>()),
  removeConnnection: createReducerAction("delete connection", props<DeleteConnection>()),
  setConnectionError: createReducerAction("set con error", props<SetConnectionError>()),

  removeNode: createReducerAction("delete node", props<DeleteNOdeEvet>())

} satisfies Record<string, ActionCreator<StoreEvents["type"], any>>

export const initializeStore = createAction("initialize node store", props<{
  data: NodeData
}>())


