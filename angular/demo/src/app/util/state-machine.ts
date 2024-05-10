
type StringTypes<T extends string> = {
  [K in T]: K extends string ? K : never
}[T]


type DataStateProps<T extends string> = {
  [key in StringTypes<T>]?: any
}

type DataStateMachine<T, V extends string> = {
  [K in StringTypes<keyof T & string> as `is${K}`]: boolean
} & {
    [K in StringTypes<V> as K extends keyof T ? never : `is${K}`]: boolean
  } &
  {
    [K in StringTypes<keyof T & string> as `set${K}`]: (props: T[K]) => void
  } &
  {
    [K in StringTypes<V> as K extends keyof T ? never : `set${K}`]: () => void
  } &
  {
    [K in StringTypes<keyof T & string> as `get${K}`]: T[K]
  }

type StateMachine<T extends string> = {
  [K in StringTypes<T> as `is${K}`]: boolean
} &
  {
    [K in StringTypes<T> as `set${K}`]: () => void
  } & {
    withData: <K extends DataStateProps<T>>() => DataStateMachine<K, T>
  }

export function createStateMachine<T extends ReadonlyArray<string>, U extends T[number]>(...states: T): StateMachine<T[number]>
export function createStateMachine<T extends ReadonlyArray<string>, U extends T[number]>(config?: { initial?: U }, ...states: T): StateMachine<T[number]> {

  const options = [...states] as Array<T[number]>;
  let initial: string | undefined = undefined;
  if (typeof config == "string") {
    options.unshift(config)
    initial = config;
  } else if (config?.initial) {
    initial = config.initial;
  }
  let current = initial;

  const state = {
    withData<K extends DataStateProps<T[number]>>() {
      const stateData = {} as ({ [key in T[number]]?: any })
      for (const option of options) {
        Object.defineProperty(state, `get${option}`, {

          get: () => stateData[option]
        })
        Object.defineProperty(state, `set${option}`, {
          value: (prop: any) => {
            console.log("new state: " + option)
            stateData[option] = prop
            return current = option;
          }
        })
      }
      return state as unknown as DataStateMachine<K, T[number]>
    }
  } as StateMachine<T[number]>
  for (const option of options) {
    Object.defineProperty(state, `is${option}`, {
      get: () => current == option,
      configurable: true
    })
    Object.defineProperty(state, `set${option}`, {
      value: () => {
        console.log("new state: " + option)
        return current = option;
      },
      configurable: true
    })
  }
  return state
}