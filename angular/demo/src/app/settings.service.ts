
import { environment } from './environments/environment';
import { AbstractHttpService } from './util/http-service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { ResolvablePromise } from './util/resolvable-promise';
import type { FrontendToBackendEvents, GenericNodeEvents, ResponseData, SocketResponses, TimerFe } from '../backend-data';


let ws: WebSocket;
let service: SettingsService;


const socketinstanceUuid = uuid()

let connectTimoeut = 10
let pendingEvents: Array<FrontendToBackendEvents> = []
function openWebsocket() {
  try {
    ws = new WebSocket(getRelativeWebsocketUrl());
    ws.onclose = () => {
      connectTimoeut += 100
      connectTimoeut *= 1.4
      connectTimoeut = Math.min(connectTimoeut, 30000)
      setTimeout(() => {
        openWebsocket()
      }, connectTimoeut);
    };
    ws.onmessage = (e) => {
      service?.onMessage(e);
    };
    ws.addEventListener("open", () => {
      connectTimoeut = 0
      Object.values(service.onSocketOpen ?? {}).forEach(cb => {
        cb(ws);
      })
    })
  } catch (e) {
    connectTimoeut += 100
    connectTimoeut *= 1.4
    connectTimoeut = Math.min(connectTimoeut, 30000)
    setTimeout(() => {
      openWebsocket()
    }, connectTimoeut)
  }


}

async function sendSocketEvent(evt: FrontendToBackendEvents) {
  pendingEvents.push(evt);
  while (ws.readyState !== ws.OPEN) {
    await ResolvablePromise.delayed(5)
  }
  pendingEvents = pendingEvents.filter(e => e !== evt)
  ws.send(JSON.stringify(evt))
}


function getRelativeWebsocketUrl() {
  const baseUri = new URL(environment.prefixPath || document.baseURI);
  baseUri.protocol = `ws${!environment.insecureWebsocket ? 's' : ''}://`;
  baseUri.pathname += 'rest/updates';
  baseUri.searchParams.set("instance", socketinstanceUuid)
  return baseUri.href;
}

@Injectable({ providedIn: 'root' })
export class SettingsService extends AbstractHttpService {
  private readonly timers: BehaviorSubject<Array<TimerFe>> = new BehaviorSubject([]);

  public timers$ = this.timers.asObservable();

  public genericNodeEvents = new Subject<GenericNodeEvents>()
  public genericNodeSendingEvents = new Subject<FrontendToBackendEvents>()
  private websocket: WebSocket;
  onSocketOpen: Record<string, (websocket: WebSocket) => void> = {};

  constructor(http: HttpClient, router: Router) {
    super(http, router);
    openWebsocket();
    const pingEvent = {
      type: "ping"
    } as const;
    setInterval(() => {

      if (!pendingEvents.includes(pingEvent))
        sendSocketEvent(pingEvent)
    }, 20000)

    service = this;

    this.genericNodeSendingEvents.subscribe(ev => {
      sendSocketEvent(ev)
    })
  }

  private isType<K extends keyof SocketResponses>(obj: ResponseData, key: K): obj is ResponseData<K> {
    return obj.type === key;
  }

  public onMessage(message: MessageEvent<string>) {
    const messageEvent: ResponseData = JSON.parse(message.data);
    if (this.isType(messageEvent, 'timerUpdate')) {
      this.timers.next(messageEvent.data);
    } else if (this.isType(messageEvent, 'genericNode')) {
      this.genericNodeEvents.next(messageEvent.data)
    }
  }

  triggerAction(deviceKey: string, actionName: string) {
    return this.postForString(`${environment.prefixPath}rest/receiver/${deviceKey}/action/${encodeURIComponent(actionName)}/trigger`, {});
  }
  confirmAction(deviceKey: string, actionName: string) {
    return this.postForString(`${environment.prefixPath}rest/receiver/${deviceKey}/action/${actionName}/confirm`, {});
  }

  getTitleKeys(id): Observable<string> {
    return this.get<Array<string>>(`${environment.prefixPath}rest/connection/key?itemRef=${id}`).pipe(
      map(keys => `context: ${keys.join(', ')}`)
    );
  }

  getSenderTitleKeys(id: number): Observable<string> {
    return this.get<Array<string>>(`${environment.prefixPath}rest/sender/key?itemRef=${id}`).pipe(
      map(keys => `context: ${keys.join(', ')}`)
    );
  }


  deleteConneciton(id: number) {
    return this.delete(`${environment.prefixPath}rest/connection?itemRef=${id}`);
  }


  send(obj) {
    return this.post<void>(environment.prefixPath + 'rest/sender/trigger', obj);
  }


  getWiringTemplates(): Observable<Array<{ name: string, content: string }>> {
    return this.get(environment.prefixPath + 'rest/wiring')
  }

}
