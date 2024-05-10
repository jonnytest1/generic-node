import type { backendToFrontendStoreActions } from './actions';
import { genericNodeDataStore } from './reference';



type BackendActionsObj = typeof backendToFrontendStoreActions

type BackendActions = BackendActionsObj[keyof BackendActionsObj]
export function dispatchAction<A extends BackendActions["type"]>(action: ReturnType<BackendActions & { type: A }>) {
  genericNodeDataStore.dispatch(action)
}