/// <reference path="./page-events.ts" />
/*
.then(nodes => {
  debugger
})*/
Promise.all([
  sendToNodeImplementation({
    type: "layouts"
  }),
  sendToNodeImplementation({
    type: "get-nodes"
  })
]).then(([layouts, nodes]) => {
  /**
   * @type {Record<string,Record<string,import('../../typing/generic-node-type').ElementNode>>}
   */
  const nodeMap = {}

  for(const node of nodes) {
    if(node.parameters?.board) {
      nodeMap[node.parameters.board] ??= {}

      if(node.parameters.key) {
        nodeMap[node.parameters.board][node.parameters.key] = node
      }
    }
  }
  /**
   * @type {HTMLElement|null}
   */
  const content = document.querySelector("#content");
  if(content) {
    [...content.children].forEach(el => el.remove())

    /**
     * @type {{[board:string]:{[item:string]:number}}}
     */
    const activityMap = {}


    for(const board in layouts) {

      const boardElement = document.createElement("div")
      boardElement.classList.add("board-wrapper")
      boardElement.textContent = board
      content.appendChild(boardElement)


      let minWidth = 40
      const boardContent = document.createElement("div")

      boardElement.appendChild(boardContent)
      boardContent.classList.add("board")
      boardContent.id = board

      for(const column of layouts[board]) {
        const columnItem = document.createElement("div")
        boardContent.appendChild(columnItem)
        columnItem.classList.add("column")

        for(const item of column) {

          const itemWrapper = document.createElement("div")
          columnItem.appendChild(itemWrapper)
          itemWrapper.classList.add("item")

          const labelItem = document.createElement("div")
          itemWrapper.appendChild(labelItem)
          labelItem.classList.add("label")

          const node = nodeMap[board]?.[item];
          const propName = node?.parameters?.name;
          if(node) {
            labelItem.classList.add("bound")
          }
          labelItem.textContent = propName ? `${propName} (${item})` : item
          labelItem.id = `${propName ?? item}`
          labelItem.addEventListener("click", () => {
            sendToNodeImplementation({
              type: "page-trigger",
              board: board,
              key: item
            })
          })

          minWidth = Math.max(minWidth, labelItem.clientWidth)

          setInterval(() => {
            const lastActive = activityMap[board]?.[item] ?? 0

            labelItem.querySelector(".active")?.remove()
            if((Date.now() - lastActive) < 1000 * 5) {
              const tSpan = document.createElement("span")
              tSpan.textContent = "*"
              tSpan.classList.add("active")
              labelItem.appendChild(tSpan)
            }
          }, 500)

        }

      }

      boardElement.style.setProperty("--min-width", `${minWidth}px`)

    }


    addEventListener("message", m => {
      const evt = JSON.parse(m.data)
      if(evt.type === "event-times") {
        //
        for(const nodeWithEvent of evt.data) {

          let activity = 0
          if(nodeWithEvent.activity?.output) {
            activity = nodeWithEvent.activity.output ?? 0
          }
          const board = nodeWithEvent.node.parameters?.board
          if(!board) {
            continue
          }
          activityMap[board] ??= {}

          const key = nodeWithEvent.node.parameters?.key
          if(!key) {
            continue
          }
          activityMap[board][key] = activity
        }
      }
    })
  }
})