import { addTypeImpl } from '../generic-node-service';

addTypeImpl({
  nodeDefinition: () => ({
    type: "view",
    inputs: 1,
    outputs: 0,
    options: {
    }
  }),
  process(node, data, callbacks) {

  },
  nodeChanged(node, prevNode) {
    node.runtimeContext ??= {}
  },
})


