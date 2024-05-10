
export type Text = {
  type: "text"
}

export type NumberCfg = {
  type: "number",
  min?: number,
  max?: number
}

export type Code = {
  type: "monaco"
  default?: string
}

export type Select<T extends string = string> = {
  type: "select",
  readonly options: ReadonlyArray<T> //  Array<T> | 
  optionDisplayNames?: Array<string>
  initial?: string
}
export type PlaceHolder = {
  type: "placeholder",
  of: Exclude<NodeOptionTypes<string>["type"], "placeholder"> | Array<Exclude<NodeOptionTypes<string>["type"], "placeholder">>
}

export type Frame = {
  type: "iframe"
  document: string,
  data: unknown
}


type Order = {
  /**
   * defaults to 1 
   * heigher moves up
   */
  order?: number
}


type Invalidated<T extends string> = {
  invalidates?: Array<T>
}
type Titled = {
  title?: string
}

type PlaceholderType<T extends PlaceHolder> = T["of"] extends Array<infer U> ? U : T["of"]

export type NodeOptionTypes<Keys extends string = string> = (Select | Text | Code | PlaceHolder | Frame | NumberCfg)
  & Order
  & Invalidated<Keys>
  & Titled
export type NodeDefOptinos = {
  [name: string]: NodeOptionTypes
}



type NodeDefType<T extends NodeOptionTypes<string>> =
  T["type"] extends "number"
  ? string
  : T["type"] extends "text"
  ? string
  : T extends Frame
  ? string
  : T extends Select
  ? T["options"][number]
  : T["type"] extends "monaco"
  ? string
  : never


export type MapTypeToParam<T extends NodeOptionTypes<string>, Key extends string> =
  T extends PlaceHolder
  ? NodeDefType<NodeOptionTypes<string> & { type: PlaceholderType<T> }>
  : NodeDefType<T>

export type NodeDefToType<N extends NodeDefOptinos> = {
  [key in keyof N]?: MapTypeToParam<N[key], key & string>
}

//  N[key] extends PlaceHolder ? NodeDefType<NodeOptionTypes<string> & { type: PlaceholderType<N[key]> }> : NodeDefType<N[key]>


export type NodeDefToRUntime<N extends NodeDefOptinos> = {
  [key in keyof N]?: N[key] extends PlaceHolder ? NodeOptionTypes<string> & { type: PlaceholderType<N[key]> } : N[key]
}

