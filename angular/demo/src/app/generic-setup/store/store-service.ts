import { Inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectNode, selectNodeDefByType } from './selectors';
import { EMPTY, map, of, switchMap } from 'rxjs';


@Injectable({ providedIn: "root" })
export class StoreService {


  constructor(private store: Store) {

  }

  public getNodeDefsByNodeUuid(nodeUuid: string) {
    return this.store.select(selectNode(nodeUuid))
      .pipe(switchMap(node => {
        if (!node) {
          return EMPTY
        }
        return this.store.select(selectNodeDefByType(node.type));
      }))
  }
  public getInputCount(nodeUuid: string, fallbackType: string) {
    return this.store.select(selectNode(nodeUuid))
      .pipe(switchMap(node => {
        if (node?.runtimeContext?.inputs !== undefined) {
          return of(node.runtimeContext.inputs)
        }
        return this.store.select(selectNodeDefByType(node?.type ?? fallbackType))
          .pipe(map(nodeDef => nodeDef.inputs ?? 0));
      }))
  }
  public getOutputCount(nodeUuid: string, fallbackType: string) {
    return this.store.select(selectNode(nodeUuid))
      .pipe(switchMap(node => {
        if (node?.runtimeContext?.outputs !== undefined) {
          return of(node.runtimeContext.outputs)
        }
        return this.store.select(selectNodeDefByType(node?.type ?? fallbackType))
          .pipe(map(nodeDef => nodeDef.outputs ?? 0));
      }))
  }
}