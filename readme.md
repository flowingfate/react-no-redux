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
