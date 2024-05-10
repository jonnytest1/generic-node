import { addTypeImpl } from '../generic-node-service'

addTypeImpl({
  payload_type(p: { node: string }) {
    return p
  },
  async process(node, evt, callbacks) {

    if (node.uuid === evt.payload.node) {
      evt.updatePayload({})
      callbacks.continue(evt)
    }


  },
  nodeDefinition: () => ({
    outputs: 1,
    type: "action-trigger"
  })
})
