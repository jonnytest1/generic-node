

export type Action<T extends string, P> = Omit<P, "type"> & { type: T }
export type ActionCreator<T extends string, P> = ((props: P) => Action<T, P>) & { type: T }


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createAction<T extends string, P>(type?: T, propsCreator?: () => P) {
  if (!type) {
    type = `${Math.random()}` as T
  }
  const actionCreator: Partial<ActionCreator<T, unknown>> = (props: P) => {
    const obj: Partial<Action<T, P>> = {}
    Object.assign(obj, props)
    obj.type = type as never
    return obj
  }
  actionCreator.type = type

  return actionCreator as ActionCreator<T, P>
}

export function props<P>(): () => P {
  return (() => { }) as (() => P)
}