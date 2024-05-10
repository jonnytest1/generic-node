export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function jsonEquals<T>(obj: T, other: T): boolean {
  return JSON.stringify(obj) === JSON.stringify(other);
}