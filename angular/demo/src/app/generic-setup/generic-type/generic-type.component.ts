import type { ElementRef, OnInit } from '@angular/core';
import { Component, ViewChild } from '@angular/core';
import { GenericNodesDataService } from '../generic-node-data-service';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap, type Observable, of, map, first, EMPTY, filter, combineLatest } from 'rxjs';
import { selectNodeDefByType, selectNodesByType } from '../store/selectors';
import type { NodeDefintion } from '../../../backend-data';
import { CommonModule } from '@angular/common';
import { DomSanitizer, type SafeUrl } from '@angular/platform-browser';
import { getBackendBaseUrl } from "../../../backend"
enum NodeDefErrors {
  NO_TYPE,
  TYPE_DOESNT_EXIST

}


@Component({
  selector: 'app-generic-type',
  templateUrl: './generic-type.component.html',
  styleUrls: ['./generic-type.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class GenericTypeComponent implements OnInit {

  public NodeDefErrors = NodeDefErrors

  nodeDefType$ = this.activeRoute.paramMap
    .pipe(
      map(param => {
        const type = param.get("type");
        if (!type) {
          return NodeDefErrors.NO_TYPE;
        }
        return type
      }))

  nodeDef$: Observable<(NodeDefintion & { url?: SafeUrl }) | NodeDefErrors>

  @ViewChild("pageframe")
  frame: ElementRef<HTMLIFrameElement>

  constructor(
    private dataService: GenericNodesDataService,
    private activeRoute: ActivatedRoute,
    private store: Store,
    private domSanitizer: DomSanitizer
  ) {
    dataService.loadGenericData()
    this.nodeDef$ = this.nodeDefType$.pipe(
      switchMap(type => {
        if (typeof type === "number") {
          return of(type)
        }
        return store.select(selectNodeDefByType(type, false)).pipe(
          map(def => {
            if (def === undefined) {
              return NodeDefErrors.TYPE_DOESNT_EXIST
            }

            const url = new URL(`rest/generic-node/frame/${type}/${def.page}`, getBackendBaseUrl())
            return {
              ...def,
              url: domSanitizer.bypassSecurityTrustResourceUrl(url.href)
            }
          }));
      })
    )


    this.nodeDefType$.pipe(
      filter((type): type is string => typeof type === "string"),
      switchMap(type => {
        return store.select(selectNodesByType(type));
      }),
      switchMap(nodes => {
        return combineLatest(nodes.map(node => {
          return this.dataService.nodeEventTimes.pipe(
            filter((t): t is NonNullable<typeof t> => !!t),
            map(times => ({
              node: node,
              activity: times[node.uuid]
            })));
        }))
      }),
    ).subscribe((times => {
      this.frame.nativeElement.contentWindow?.postMessage(JSON.stringify({
        type: "event-times",
        data: times
      }), "*")
    }))




    addEventListener("message", e => {
      if (e.source && e.source === this.frame?.nativeElement?.contentWindow) {
        const evt = JSON.parse(e.data)
        const respond = (response) => {
          this.frame.nativeElement.contentWindow?.postMessage(JSON.stringify({
            type: "response",
            messageId: evt.messageId,
            data: response
          }), "*")
        }
        if (evt.type == "get-nodes") {
          this.nodeDef$
            .pipe(first(), switchMap(nodeDef => {
              if (this.isNodeDef(nodeDef)) {
                return store.select(selectNodesByType(nodeDef.type));
              }
              return EMPTY
            }))
            .subscribe(nodes => {
              respond(nodes)
            })
        } else {
          this.nodeDef$
            .pipe(first())
            .subscribe(nodeDef => {
              if (this.isNodeDef(nodeDef)) {
                dataService.passPageAction(evt, nodeDef.type).then(resp => {
                  respond(resp)
                })
              }

            })
        }

      }
    })
  }


  isNodeDef(item: NodeDefErrors | NodeDefintion): item is NodeDefintion {
    if (typeof item === "object") {
      return true
    }
    return false
  }

  ngOnInit() {
  }

}