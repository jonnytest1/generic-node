import { save } from 'hibernatets';
import { Timer } from './model/timer';
import { FrontendWebsocket } from './socket';
import type { Delayed } from './timer-type';
import type { EventTypes } from './event-type';

export class TimerFactory {

    static createCallback<T extends EventTypes, S>(callbackClassName: T, timerData: Delayed<S>) {

        const timer = new Timer({
            startTimestamp: Date.now(),
            endtimestamp: Date.now() + timerData.time,
            args: ["-", timerData.nestedObject],
            classId: -1,
            className: callbackClassName,
            data: timerData.sentData
        })
        save(timer)
            .then(() => {
                FrontendWebsocket.updateTimers()
            })
    }
}