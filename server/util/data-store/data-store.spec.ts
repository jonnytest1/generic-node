import { DataStore } from './data-store'
import { createAction } from './action';
import { jsonClone } from '../json-clone';

describe("data-store", () => {


  it("doesnt reemit", () => {

    const st = new DataStore<{ a: Record<string, number>, b: Record<string, number> }>({
      a: {},
      b: { "abc": 456 }
    });

    const updateA = createAction()
    const updateB = createAction()

    st.addReducer(updateA, st => ({ ...st, b: { ...st.b, ["123"]: 123 } }))
    st.addReducer(updateB, st => ({ ...st, a: { ...st.a, ["123"]: 123 } }))

    const selectorB = st.createSelector(st => st.b)
    const selectorA = st.createSelector(st => st.a)

    const data = st.getOnce(selectorB)
    expect(data).toStrictEqual({ "abc": 456 })

    const emitsA = []
    const emitsB = []
    st.select(selectorA).subscribe(data => {
      emitsA.push(jsonClone(data))
    })
    st.select(selectorB).subscribe(data => {
      emitsB.push(jsonClone(data))
    })
    //initial emits
    expect(emitsA).toStrictEqual([{}])
    expect(emitsB).toStrictEqual([{ "abc": 456 }])



    st.dispatch({ type: "updateA" })
    expect(emitsA).toStrictEqual([{}, { 123: 123 }])
    expect(emitsB).toStrictEqual([{ "abc": 456 }])

    st.dispatch({ type: "updateB" })
    expect(emitsA).toStrictEqual([{}, { 123: 123 }])
    expect(emitsB).toStrictEqual([{ "abc": 456 }, { 123: 123, abc: 456 }])
  })
})