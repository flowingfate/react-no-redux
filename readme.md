[![Build Status](https://travis-ci.org/flowingfate/react-no-redux.svg?branch=master)](https://travis-ci.org/flowingfate/react-no-redux)
[![codecov](https://codecov.io/gh/flowingfate/react-no-redux/branch/master/graph/badge.svg)](https://codecov.io/gh/flowingfate/react-no-redux)
![react](https://img.shields.io/badge/react-^16.8.0-blue.svg)
![lang](https://img.shields.io/badge/lang-typescript-red.svg)
![npm](https://img.shields.io/npm/v/react-no-redux)
![GitHub file size in bytes](https://img.shields.io/github/size/flowingfate/react-no-redux/src/index.tsx)
![npm](https://img.shields.io/npm/dw/react-no-redux)

---

## Why

Redux已经是状态管理的首选，为什么还要做这样一个方案？

其实 react-redux 在与typescipt的搭配上，做的并不够完善，而这套方案产生的最原始的初衷就是为了解决类型问题，可以这么说：“为类型编程”

当然，它也解决一些其它的诉求

更多考虑参见 **[这里](./docs/why.md)**


## How

一个状态管理方案，需要提供一个基础，在这个基础上，开发者自定义：状态树和变更逻辑

我通过 **[这样的方式](./docs/how.md)** 来构建这个基础，在此之上，进行一些封装和组织，就形成了这套方案

感兴趣可以阅读 **[源码](./src/index.tsx)** ，它非常精简，除了react，没有其它任何额外的东西


## Simple-Usage

store.ts
```ts
import createStore, { makeModel } from 'react-no-redux';

interface State {
  a: number;
  b: string;
  c: string[];
};
const inital: State = { a: 1, b: '2', c: [] };

const model = makeModel(inital, (store) => {
  const setA = (a: number) => store.set({ a });
  const setB = (b: string) => store.set({ b });
  const removeFromC = (id: string) => store.set((prev) => ({
    c: prev.c.filter(item => (item !== id)),
  }));

  return { setA, setB, removeFromC };
});

const { WithStore, useStore, Context } = createStore(model);
export { WithStore, useStore, Context };
```

app.tsx
```tsx
import React from 'react';
import { WithStore, useStore } from './store';

const Target = () => {
  const { state, actions } = useStore();
  // state 和 actions 任你差遣
  const removeB = () => actions.removeFromC(state.b);
  return (
    <div onClick={removeB}>{state.a}</div>
  );
};

const App = () => (
  <WithStore>
    <div>
      ···多层嵌套···
      <Target />
      ···多层嵌套···
    </div>
  </WithStore>
);

export default App;
```


## Complex-Usage

user.ts
```ts
import { Store } from 'react-no-redux';

export interface IUserState {
  name: string;
  age: number;
}

const initial: IUserState = {
  name: '鸣达',
  age: 27,
};

export const makeUserActions = (store: Store<IUserState>) => {
  const setName = (name: string) => store.set({ name });
  const setAge = (age: number) => store.set({ age });
  return { setName, setAge };
};

export default initial;
```

work.ts
```ts
import { Store } from 'react-no-redux';

export interface IWorkState {
  department: string;
  level: number;
}

const initial: IWorkState = {
  department: '钉钉',
  level: 5,
}

export const makeWorkActions = (store: Store<IWorkState>) => {
  const setDepartment = (department: string) => store.set({ department });
  const setLevel = (level: number) => store.set({ level });
  return { setDepartment, setLevel };
};

export default initial;
```

store.ts
```ts
import createStore, { combineModels } from 'react-no-redux';
import user, { makeUserActions } from './user';
import work, { makeWorkActions } from './work';

const model = combineModels({ user, work }, (store) => ({
  user: makeUserActions(store.user),
  work: makeWorkActions(store.work),
}));
const { WithStore, useStore, Context } = createStore(model);

export { WithStore, useStore, Context };
```

app.tsx
```tsx
import React from 'react';
import { WithStore } from './store';

const App = () => (
  <WithStore>
    <div>放置你的业务组件</div>
  </WithStore>
);

export default App;
```

target.tsx
```tsx
import { useStore } from './store';

const Target = () => {
  const { state, actions } = useStore();
  // state 和 actions 任你差遣
};
```
