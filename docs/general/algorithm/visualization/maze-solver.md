---
title: "走迷宫"
date: "2019-11-22"
---

## 图的深度优先遍历

<video poster="http://static.vfa25.cn/maze-resolve-img.0c2b3399.png" width="100%" src="http://static.vfa25.cn/maze-resolve-video.mov" controls="controls" muted></video>

对于任意一点(x, y)

- 尝试往上走，继续求解迷宫
- 尝试往右走，继续求解迷宫
- 尝试往下走，继续求解迷宫
- 尝试往左走，继续求解迷宫

```js
solveMaze(x, y):
  if (x, y) == '出口' then return 'success'
  solveMaze(x, y-1)
  solveMaze(x+1, y)
  solveMaze(x, y+1)
  solveMaze(x-1, y)
```

静态迷宫绘制：维护三个二维矩阵（当然结点信息，维护私有类也行），分别为

- maze：元素字符串（‘#’或‘ ’）；
- visited：标记是否已访问（已访问结点，不再二次访问）
- path: 用于运动轨迹的渲染依据

```md
// H、W分别为迷宫资源文件的高、宽
maze := new char[W][H]
visited := new boolean[W][H]
path := new boolean[W][H]
```

走迷宫——[源码链接](https://github.com/vfa25/dataStructure-algorithm/tree/master/AlgorithmVisualization/src/mazesolver)

``` js
// 动画逻辑
function run() {
  setData（-1, -1, false）
  if !go(0, 1) // 入口坐标
    then return '迷宫无解'
  setData（-1, -1, false）
}

var dirction = [[0,-1], [1,0], [0,1], [-1,0]]

function go(int x, int y) {
  if 'maze[x][y]越界' then throw new Error();
  // 标记访问态
  visited[x][y] := true
  // 将二维数组paths的对应位置结点标记为true，同时执行重绘
  setData(x, y, true);
  // 递归终止条件
  if (x, y) == '出口坐标' then return true
  for i := 0 to 3 do {
    newX := x + dirction[i][0]
    newY := y + dirction[i][1]
    if '*maze[newX][newY]合法' AND maze[newX][newY] == ' '/*路*/ AND !visited[newX][newY]
      then
        if (go(newX, newY)) then return true
  }
  // 回溯思想
  // 将二维数组paths的对应位置结点标记为false，同时执行重绘
  setData(x, y, false)

  return false
}

// 渲染逻辑
function setData(int x, int y, boolean isPath) {
  if 'maze[x][y]合法' then path[x][y] = isPath;
  // 绘制逻辑
  frame.render();
  Thread.sleep(20);
}
```
