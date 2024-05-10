import { Subject } from 'rxjs';

export type LogType = "ERROR" | "INFO" | "WARN"

export interface LogData {
    level: LogType,
    data: string | ({ message: string } & Record<string, unknown>),
    err?
}

export const logging = new Subject<LogData>()

export function log(level: LogType, data: LogData["data"], err?) {
    logging.next({
        data,
        level,
        err
    })
}