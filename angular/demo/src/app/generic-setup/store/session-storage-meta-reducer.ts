import type { Action, ActionReducer } from '@ngrx/store';

export function sessionStorageMetaReducer<S, A extends Action = Action>(reducer: ActionReducer<S, A>) {
  let initial = true;
  return function (state: S, action: A): S {
    if (initial && !state) {
      const storedState = sessionStorage.getItem('__generic_storage__')
      if (storedState) {
        state = JSON.parse(storedState)
      }
    }

    initial = false
    const nextState = reducer(state, action);
    sessionStorage.setItem('__generic_storage__', JSON.stringify(nextState))
    return nextState;
  };
}