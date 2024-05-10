import { lastEventFile, lastEventTimesFile } from './generic-node-constants';
import type { NodeEventJsonData } from './node-event';
import type { ElementNode, NodeEventTimes } from './typing/generic-node-type';
import { genericNodeDataStore } from './generic-store/reference';
import { createAction, props } from '../util/data-store/action';
import { BehaviorSubject } from 'rxjs';
import { writeFileSync, readFileSync } from "fs"

export const lastEventDataObs = new BehaviorSubject<Record<string, NodeEventJsonData>>({})


const setInputTimeAction = createAction("set input time", props<{
  nodeUuid: string,
  eventTime: number
}>())
const setOutputTimeAction = createAction("set output time", props<{
  nodeUuid: string,
  eventTime: number
}>())
const setEventTimes = createAction("set event times", props<{
  data: NodeEventTimes,
}>())
genericNodeDataStore.addReducer(setInputTimeAction, (s, a) => ({
  ...s,
  lastEventTimes: {
    ...s.lastEventTimes,
    [a.nodeUuid]: {
      ...s.lastEventTimes[a.nodeUuid] ?? {},
      input: a.eventTime
    }
  }
}))
genericNodeDataStore.addReducer(setOutputTimeAction, (s, a) => ({
  ...s,
  lastEventTimes: {
    ...s.lastEventTimes,
    [a.nodeUuid]: {
      ...s.lastEventTimes[a.nodeUuid] ?? {},
      output: a.eventTime
    }
  }
}))
genericNodeDataStore.addReducer(setEventTimes, (s, a) => ({
  ...s,
  lastEventTimes: a.data
}))

export const lastEventTimes = genericNodeDataStore.createSelector(st => st.lastEventTimes)


export function setLastEventInputTime(node: ElementNode, eventTime: number) {

  genericNodeDataStore.dispatch(setInputTimeAction({
    nodeUuid: node.uuid,
    eventTime
  }))
  writeFileSync(lastEventTimesFile, JSON.stringify(genericNodeDataStore.getOnce(lastEventTimes), undefined, "   "))
}
export function setLastEventOutputTime(nodeUuid: string, eventTime: number) {
  genericNodeDataStore.dispatch(setOutputTimeAction({
    nodeUuid: nodeUuid,
    eventTime
  }))
  writeFileSync(lastEventTimesFile, JSON.stringify(genericNodeDataStore.getOnce(lastEventTimes), undefined, "   "))
}
export function setLastEvent(node: ElementNode, event: NodeEventJsonData) {
  lastEventDataObs.next({
    ...lastEventDataObs.value,
    [node.uuid]: event
  })

  writeFileSync(lastEventFile, JSON.stringify(lastEventDataObs.value, undefined, "   "))
}



export function getLastEvent<P>(node: { uuid: string }): NodeEventJsonData<P> {
  return lastEventDataObs.value[node.uuid] as NodeEventJsonData<P>
}



function loadEvents() {
  try {
    const data = readFileSync(lastEventFile, { encoding: "utf8" })
    const eventDAta = JSON.parse(data)
    lastEventDataObs.next(eventDAta)
  } catch (e) {
    console.error(e)
  }

  try {
    const data = readFileSync(lastEventTimesFile, { encoding: "utf8" })
    const eventDAta = JSON.parse(data)

    genericNodeDataStore.dispatch(setEventTimes({ data: eventDAta }))
  } catch (e) {
    console.error(e)
  }
}

loadEvents()