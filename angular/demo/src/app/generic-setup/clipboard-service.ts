import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { backendActions } from './store/action';
import type { ActiveElement } from './generic-setup-types';
import type { Connection, ElementNode } from '../../backend-data';

import { jsonClone } from '../util/clone';
import { v4 } from "uuid"
import { Vector2 } from '../util/vector';

@Injectable()
export class ClipboardService {


  constructor(private store: Store) {

  }


  createActiveCopy(activeelements: Array<ActiveElement> | undefined) {
    if (!activeelements?.length) {
      return []
    }
    const oldToNewNodeMap: Record<string, string> = {}

    const copyList: Array<ActiveElement> = []
    for (const activeItem of activeelements) {
      if (activeItem.type == "node") {
        const newNode: ElementNode = {
          ...activeItem.node,
          position: {
            ...new Vector2(activeItem.node.position).added(new Vector2(20, 20))
          },
          uuid: v4()
        };
        oldToNewNodeMap[activeItem.node.uuid] = newNode.uuid
        copyList.push({ type: "node", node: newNode })
      }
    }

    for (const activeItem of activeelements) {
      if (activeItem.type == "connection") {
        //currently its assuming new stuff should be manually connected to old nodes
        if (oldToNewNodeMap[activeItem.con.source.uuid] && oldToNewNodeMap[activeItem.con.target.uuid]) {
          const newConnection: Connection = {
            source: {
              index: activeItem.con.source.index,
              uuid: oldToNewNodeMap[activeItem.con.source.uuid]
            },
            target: {
              index: activeItem.con.target.index,
              uuid: oldToNewNodeMap[activeItem.con.target.uuid]
            },
            uuid: v4()
          };
          copyList.push({ type: "connection", con: newConnection })
        }
      }
    }
    return jsonClone(copyList)
  }
  storeToClipboard(elements: ActiveElement[]) {
    return navigator.permissions.query({
      name: "clipboard-write" as never
    }).then((result) => {
      if (result.state === "granted" || result.state === "prompt") {
        return navigator.clipboard.writeText(JSON.stringify(this.createActiveCopy(elements))).then(e => {
          return elements
        }).catch(e => {
          debugger;
        })
      }
    });
  }

  loadFromClipboard(activeView: string | undefined) {
    navigator.permissions.query({
      name: "clipboard-read" as never
    }).then((result) => {
      if (result.state === "granted" || result.state === "prompt") {
        navigator.clipboard.readText().then(e => {
          const nodes = JSON.parse(e) as Array<ActiveElement>
          for (const node of nodes) {
            if (node.type == "node") {
              if (activeView) {
                node.node.view = activeView
              }
              this.store.dispatch(backendActions.addNode(node))
            } else if (node.type == "connection") {
              this.store.dispatch(backendActions.addConnection({ connection: node.con }))
            }
          }
        }).catch(e => {
          debugger;
        })
      }
    });
  }

}