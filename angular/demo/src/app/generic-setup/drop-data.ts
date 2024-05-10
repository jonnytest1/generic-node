

export class DropDataHandler<DropData extends Record<string, any>>{
  setDropData<T extends keyof DropData & string>(evt: DragEvent, key: T, value: DropData[T]) {
    evt.dataTransfer?.setData(key, JSON.stringify(value))
  }


  getDropData<T extends keyof DropData & string>(evt: DragEvent, key: T) {
    const dragData = evt.dataTransfer?.getData(key.toLowerCase())
    if (dragData == "") {
      return null
    }
    if (dragData == undefined) {
      return null
    }
    return JSON.parse(dragData) as DropData[T]
  }

  hasKey<T extends keyof DropData & string>(evt: DragEvent, key: T) {
    return !![...evt.dataTransfer?.items ?? []]
      .find(i => i.type === key.toLowerCase())
  }
}
