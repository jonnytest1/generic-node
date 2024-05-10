import { HttpRequest, Websocket, WS } from 'express-hibernate-wrapper';
import { load } from 'hibernatets';
import { Timer } from './model/timer';
import type { SocketResponses } from './socket-response';


type ExtendedSocket = Websocket & { instanceId?: string }

@WS({ path: "/updates" })

export class FrontendWebsocket {
    static websockets: Array<ExtendedSocket> = []
    static async updateTimers() {
        const timers = await load(Timer, Timer.timerQuery)
        this.websockets.forEach(async (socket) => {
            this.sendToWebsocket(socket, {
                type: "timerUpdate",
                data: timers
            })
        })
    }

    static sendToWebsocket<T extends keyof SocketResponses>(ws: Websocket, data: { type: T, data: SocketResponses[T] }) {
        if (ws.readyState !== ws.OPEN) {
            setTimeout(() => {
                this.sendToWebsocket(ws, data)
            }, 200)
            return
        }
        ws.send(JSON.stringify(data))
    }


}