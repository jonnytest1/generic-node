import { distinctUntilChanged, map, type Observable } from 'rxjs'


export type SelectorFnc<S, R> = (state: S) => R


type SelectorParent<T, R> = {
  get(state: T): R,

  pipe(state: Observable<T>): Observable<R>
}


export class Selector<T, R> {
  constructor(private mappingFunction: SelectorFnc<T, R>, private parent: SelectorParent<any, T>) {

  }


  chain<S extends SelectorFnc<R, unknown>>(s: S): Selector<T, ReturnType<S>> {
    return new Selector(s, this) as unknown as Selector<T, ReturnType<S>>
  }


  get(state: T): R {
    return this.mappingFunction(this.parent.get(state))
  }

  pipe(state: Observable<T>): Observable<R> {
    return this.parent.pipe(state)
      .pipe(
        map(st => this.mappingFunction(st)),
        distinctUntilChanged()
      )
  }
}