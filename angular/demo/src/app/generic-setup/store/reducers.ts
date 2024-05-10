import { createReducer, on } from '@ngrx/store';
import { backendActions, setNodeData, updateNodeDef } from './action';
import type { NodeData } from '../../../backend-data';
import { type ElementNode, type NodeDefintion } from '../../../backend-data';
import { isSameConnection } from '../line/line-util';


export interface GenericNodeState extends NodeData {
  nodeDefinitions: Record<string, NodeDefintion>
}


const initialState: GenericNodeState = {
  connections: [],
  nodes: [],
  globals: {},
  nodeDefinitions: {},
  version: 0
}


function patchNode(st: GenericNodeState, node: string, callback: (n: NodeData["nodes"][number]) => NodeData["nodes"][number]): GenericNodeState {
  return {
    ...st,
    nodes: (st.nodes ?? []).map(stNode => {
      if (stNode.uuid === node) {
        return callback(stNode)
      }
      return stNode
    })

  }
}


export const featureName = "generic-node"

export const genericReducer = createReducer(
  initialState,
  on(setNodeData, (st, a) => {
    return {
      ...st,
      ...a.data
    };
  }),
  on(updateNodeDef, (st, a) => {
    return {
      ...st,
      nodeDefinitions: a.data
    };
  }),
  on(backendActions.updatePosition, (st, a) => {
    return patchNode(st, a.node, n => ({ ...n, position: a.position }));
  }),
  on(backendActions.deleteNode, (st, a) => {
    return ({
      ...st,
      nodes: st.nodes.filter(node => node.uuid !== a.node),
      connections: st.connections.filter(con => con.source.uuid !== a.node && con.target.uuid !== a.node)
    });
  }),
  on(backendActions.deleteConnection, (st, a) => ({
    ...st,
    connections: st.connections.filter(con => !isSameConnection(con, a.connection))
  })),
  on(backendActions.addConnection, (st, a) => ({
    ...st,
    connections: [...st.connections, a.connection]
  })),
  on(backendActions.setConError, (st, a) => ({
    ...st,
    connections: st.connections.map(con => {
      if (con.uuid === a.connection) {
        return {
          ...con,
          source: {
            ...con.source,
            error: a.error
          }
        }
      }
      return con
    })
  })),
  on(backendActions.addNode, (st, a) => ({
    ...st,
    nodes: [...st.nodes, a.node],
  })),
  on(backendActions.updateGlobals, (st, a) => ({
    ...st,
    globals: {
      ...st.globals ?? {},
      ...a.globals
    }
  })),
  on(backendActions.updateParameter, (st, a) => patchNode(st, a.node, n => ({
    ...n,
    parameters: {
      ...n.parameters,
      [a.param]: a.value
    }
  }))),
  on(backendActions.updateNode, (st, a) => {
    const newNodes: Array<ElementNode> = []
    let foundMAtch = false
    for (const node of st.nodes) {
      if (node.uuid === a.newNode.uuid) {
        newNodes.push(a.newNode)
        foundMAtch = true
      } else {
        newNodes.push(node)
      }
    }
    if (!foundMAtch) {
      newNodes.push(a.newNode)
    }
    return ({
      ...st,
      nodes: newNodes
    });
  }),
  on(backendActions.updateEditorSchema, (st, a) => patchNode(st, a.nodeUuid, n => ({
    ...n,
    runtimeContext: {
      ...n.runtimeContext ?? {},
      editorSchema: a.editorSchema
    }

  }))),
)
