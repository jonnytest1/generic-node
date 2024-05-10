export type NodeEventData<C = unknown, T = unknown> = {
  payload: T
  context: C,
}