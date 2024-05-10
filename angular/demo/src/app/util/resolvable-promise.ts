export class ResolvablePromise<T, E = any>{

  public resolve: (value: T | PromiseLike<T>) => void;
  public reject: (reason?: E) => void;

  public prRef: Promise<T>;

  resolvedWith?: T;

  constructor(callback?: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: E) => void) => void) {
    let _res: (value: T | PromiseLike<T>) => void = () => {};
    let _rej: (reason?: E) => void = () => {};

    this.prRef = new Promise((res, rej) => {
      _res = res;
      _rej = rej;
      if (callback) {
        callback(res, rej);
      }
    });
    this.resolve = (e) => {
      this.resolvedWith = e as T;
      _res(e);
    };
    this.reject = _rej;
  }

  static delayed(millis: number) {
    return new ResolvablePromise<void>((r) => setTimeout(r, millis));
  }

  then<R>(cb: ((e: T) => R)) {
    return this.prRef.then(cb);
  }
  catch(cb: ((e: T) => void)) {
    this.prRef.catch(cb);
  }
}
