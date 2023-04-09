[![Build Status](https://travis-ci.org/flowingfate/react-no-redux.svg?branch=master)](https://travis-ci.org/flowingfate/react-no-redux)
[![codecov](https://codecov.io/gh/flowingfate/react-no-redux/branch/master/graph/badge.svg)](https://codecov.io/gh/flowingfate/react-no-redux)
![react](https://img.shields.io/badge/react-^16.8.0-blue.svg)
![lang](https://img.shields.io/badge/lang-typescript-red.svg)
![npm](https://img.shields.io/npm/v/react-no-redux)
![GitHub file size in bytes](https://img.shields.io/github/size/flowingfate/react-no-redux/src/index.tsx)
![npm](https://img.shields.io/npm/dw/react-no-redux)

---

## Why

虽然状态管理还是Redux占据半壁江山，但是新的东西早已层出不穷！

在我个人看来，Redux存在2个显著的弊端：
* 与Typescript配合不够友好，
* 使用过程过于繁琐，强行增加人的认知成本

更多关于Redux的考量参见这里 **[Redux的问题](./docs/no-redux.md)**


React 本身就提供了Context用于跨组件通信，一个好的状态管理，无非就是对原生Context的用法进行优化，使得：
* 性能表现更好
* 使用方式更友善


## Goal

* 足够轻量小巧
* 足够类型健壮
* 概念少，结构完全透明，使用简单
* 支持多实例（不像Redux那样使用单例），可以在任意局部灵活使用


## How

> 写这个东西主要是为了记录自己的学习理解，也顺便Share一下

感兴趣可以阅读 **[源码](./src/index.tsx)** ，它非常精简，除了react，没有其它任何额外的东西，其中有几个关键要点：

#### ① 不变的Context value

Context value变化的时候，需要递归遍历子树，寻找依赖它的节点进行更新，所以效率会很差
* 所以，当状态变化时，通知组件状态的变更不能依赖 Context value 的改变
* `value={useMemo(buildStore, [])}` 就是为了保证其不发生变化
* 变更通知，只能采用别的方式 —— 发布订阅

#### ② 发布订阅（事件机制）

当状态变化时，发布订阅能做到精准的点对点更新（redux中其实也用到了发布订阅）

#### ③ 触发变更——偷梁换柱

```tsx
const [v, set] = useState(data);
useEffect(() => listen(set), []);
return [v, change] as const;
```
把原始的变更函数 `set` 注册给监听器，替换为 `change` 函数返回，调用change时，不仅会修改数据，还会通知其它监听状态的组件


## Usage Sample

store.ts
```ts
import { atom } from 'react-no-redux';

// define atoms with initial states
export const store = {
  a: atom(1),
  b: atom('2'),
  c: atom<string[]>([]),
};
```

app.tsx
```tsx
import React from 'react';
import { useAtom, useChange, WithStore } from 'react-no-redux';
import { store } from './store';

const BizA = () => {
  const [a] = useAtom(store.a);
  const [b] = useAtom(store.b);
  const setC = useChange(store.c);
  const removeB = () => setC(list => list.filter(item => (item !== b)));;
  return <div onClick={removeB}>{a}</div>;
};

const BizB  = () => {
  const [list] = useAtom(store.c);
  return (
    <div>
      {list.map(item => <span>{item}</span>)}
    </div>
  );
};

const App = () => (
  <WithStore>
    <div><BizA /></div>
    <div><BizB /></div>
  </WithStore>
);

export default App;
```
