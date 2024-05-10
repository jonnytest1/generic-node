import { Injectable } from '@angular/core';
import { Actions, act, createEffect, ofType } from '@ngrx/effects';
import { Action, ActionCreator } from '@ngrx/store';
import { GenericNodesDataService } from '../generic-node-data-service';
import { filter, map, tap } from 'rxjs';
import { BackendActionType, BackendActions } from './action';

@Injectable()
export class GenericSEtupEffects {


  passBackendAction = createEffect(() => this.actions
    .pipe(
      filter((action: Action & BackendActionType) => action.backendAction),
      tap((action) => {
        if (this.isBakcendAction(action)) {
          if ("fromSocket" in action) {
            return
          }
          this.genDataService.passBackendAction(action)
        }
      })
    ), { dispatch: false })

  constructor(private actions: Actions, private genDataService: GenericNodesDataService) {

  }

  isBakcendAction(action: Action & BackendActionType): action is BackendActions & BackendActionType {
    return !!action.backendAction
  }

  createEffect<T extends ActionCreator>(action: T) {
    return this.actions.pipe(
      ofType(action)
    )
  }
}