user.ts
```ts
import { makeModel } from 'react-no-redux';

export interface IUserState {
  name: string;
  age: number;
}

const initial: IUserState = {
  name: '鸣达',
  age: 27,
};

export default makeModel(initial, (store) => {
  const setName = (name: string) => store.set({ name });
  const setAge = (age: number) => store.set({ age });
  return { setName, setAge };
});
```

work.ts
```ts
import { makeModel } from 'react-no-redux';

export interface IWorkState {
  department: string;
  level: number;
}

const initial: IWorkState = {
  department: '钉钉',
  level: 5,
}

export default makeModel(initial, (store) => {
  const setDepartment = (department: string) => store.set({ department });
  const setLevel = (level: number) => store.set({ level });
  return { setDepartment, setLevel };
});
```

store.ts
```ts
import createStore, { combineModels } from 'react-no-redux';
import user from './user';
import work from './work';

const model = combineModels({ user, work });
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
