import type { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import type { ErrorHandler } from '@angular/core';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from './environments/environment';


function base64safe(value: string) {
    try {
        btoa(value);
        return value;
    } catch (e) {
        return value.replace(/./g, c => {
            if (c.charCodeAt(0) > 256) {
                return '_';
            }
            return c;
        });
    }
}

interface ParamLog {
    message: string

    [key: string]: string
}


export async function logKibana(level: 'INFO' | 'ERROR' | 'DEBUG', message: string | ParamLog, error?) {
    let logStack;
    try {
        throw new Error('origin');
    } catch (e) {
        logStack = base64safe((e as Error).stack as string);
    }

    const devMode = location.host.includes("localhost");
    const jsonData: { [key: string]: string } & { message?: string } = {
        Severity: level,
        application: `SmartHomeFe${devMode ? '_debug' : ''}`,
        log_stack: logStack
    };
    if (!message && error) {
        jsonData.message = base64safe(error.message);
    } else if (message instanceof Object) {
        if (message['message']) {
            jsonData.message = base64safe(message['message']);
            delete message['message'];
            for (const i in message) {
                if (typeof message[i] !== 'number' && typeof message[i] !== 'string') {
                    jsonData[i] = base64safe(JSON.stringify(message[i]));
                } else {
                    jsonData[i] = base64safe(message[i]);
                }
            }
        } else {
            jsonData.message = base64safe(JSON.stringify(message));
        }
    } else {
        jsonData.message = base64safe(message);
    }
    if (error) {
        const displayMessage = jsonData.message;
        // tslint:disable-next-line: forin
        for (const key in error) {
            try {
                JSON.stringify(error[key]);
                jsonData['error_' + key] = base64safe(error[key]);
            } catch (e) {
                jsonData['error_' + key] = `${error[key]}`;
            }
        }
        jsonData['error_message'] = base64safe(error.message);
        jsonData['error_stacktrace'] = base64safe(error.stack);

        if (displayMessage && error.message) {
            jsonData.message = base64safe(displayMessage);
        }

    }
    console.log(jsonData);
    if (devMode) {
        return;
    }
    fetch(environment.logEndpoint, {
        method: 'POST',
        mode: "no-cors",
        headers: {
            'Content-Type': 'text/plain'
        },
        body: btoa(JSON.stringify(jsonData))
    });
}
@Injectable({
    providedIn: 'root'
})
export class CustomErrorHandler implements HttpInterceptor {
    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // do request error handling
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                logKibana('ERROR', 'request error', error);

                throw error;
            })
        );
    }

}
@Injectable()
export class CustomGlobalErrorHandler implements ErrorHandler {

    handleError(error: Error): void {
        logKibana('ERROR', 'global error', error);
        console.error(error);
    }

}
