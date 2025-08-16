# React No Redux

[![Build Status](https://travis-ci.org/flowingfate/react-no-redux.svg?branch=master)](https://travis-ci.org/flowingfate/react-no-redux)
[![codecov](https://codecov.io/gh/flowingfate/react-no-redux/branch/master/graph/badge.svg)](https://codecov.io/gh/flowingfate/react-no-redux)
![react](https://img.shields.io/badge/react-^16.8.0-blue.svg)
![lang](https://img.shields.io/badge/lang-typescript-red.svg)
![npm](https://img.shields.io/npm/v/react-no-redux)
![GitHub file size in bytes](https://img.shields.io/github/size/flowingfate/react-no-redux/src/index.tsx)
![npm](https://img.shields.io/npm/dw/react-no-redux)

---

## Why

Although Redux still dominates state management, new solutions have emerged constantly!

In my opinion, Redux has 2 significant drawbacks:
* Not TypeScript-friendly enough
* Too cumbersome to use, artificially increasing cognitive load

For more considerations about Redux, see **[Problems with Redux](./no-redux.md)**

Emerging state management solutions like Jotai, Recoil, Zustand, etc., are all lightweight and user-friendly. This solution also aims to provide the same great experience.

React itself provides Context for cross-component communication. A good state management solution is essentially an optimization of native Context usage to achieve:
* Better performance
* More friendly usage

## Goal

* Lightweight and compact
* Type-safe and robust
* Minimal concepts, completely transparent structure, simple usage
* Support multiple instances (unlike Redux's singleton pattern), can be used flexibly in any local scope

## How

> Writing this mainly to document my learning and understanding, and to share it

Feel free to read the **[source code](../src/index.tsx)**, which is very concise. Besides React, there are no other dependencies. Here are some key points:

#### ① Immutable Context value

When Context value changes, it needs to recursively traverse the subtree to find dependent nodes for updates, which is very inefficient.
* Therefore, when state changes, notifying components of state changes cannot rely on Context value changes
* `value={useMemo(buildQuery, [])}` ensures it doesn't change
* Change notifications must use other methods — publish-subscribe

#### ② Publish-Subscribe (Event mechanism)

When state changes, publish-subscribe enables precise point-to-point updates (react-redux also uses publish-subscribe internally)

#### ③ Triggering changes — Bait and Switch

```tsx
const { data, change, listen } = useContext(Context)(this);
const [v, set] = useState(data);
useLayoutEffect(() => listen(set), []);
return [v, change] as const;
```
Register the change function `set` to the listener, replacing it with change (which not only modifies data but also triggers subscription updates)

## Usage Sample

This solution exports only 2 APIs, making it very simple to use:
* atom: for defining state
* WithStore: for wrapping component trees, providing state context

### Basic Usage

```tsx
// define atoms with initial states
import { atom } from 'react-no-redux';

const a = atom(1),
const b = atom('2'),
const c = atom<string[]>([]),

// use atoms
import { WithStore } from 'react-no-redux';

const BizA = () => {
  const [a, setA] = a.useData();
  const [b] = b.useData();
  const setC = c.useChange();
  const addA = () => setA(a + 1);
  const removeB = () => setC(list => list.filter(item => (item !== b)));
  return (
    <>
      <button onClick={addA}>{a}</button>
      <button onClick={removeB}>{b}</button>
    </>
  );
};

const BizB  = () => {
  const [list] = c.useData();
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

What's the difference between `useData` vs `useChange`?
* `useData`: Returns value and update function. When atom value changes, the current component will re-render.
* `useChange`: Returns only the update function. When atom value changes, the current component will not re-render.

### Define atom with actions

```tsx
// define atom
const a = atom(1, (get, set) => {
  const inc = () => set(get() + 1);
  const dec = () => set(get() - 1);
  return { inc, dec };
});

// use atom
const [value, actions] = a.useData();
return (
  <>
    <button onClick={actions.inc}>+</button>
    <span>{value}</span>
    <button onClick={actions.dec}>-</button>
  </>
);

// use only actions
const actions = a.useChange();
return (
  <>
    <button onClick={actions.inc}>+</button>
    <button onClick={actions.dec}>-</button>
  </>
);
```

Similarly, when using `useChange`, the current component will not re-render due to atom state changes.

Actions can be set to any function, even async functions, for example:
```tsx
const a = atom(1, (get, set) => {
  async function inc() {
    const result = await fetchDataFromServer();
    set(get() + result);
  }
  return { inc };
});
```

In the function that creates actions, you can even execute async initialization logic. For example, in a scenario where we need to request a product list from the server:
```tsx
type Product = { /* ... */ };
const products = atom([] as Product[], (get, set) => {
  async function init() {
    const products = await fetchProductsFromServer();
    set(products);
  }
  // The init function will be automatically called when products.useXXX is first used, and only executed once
  init();

  function deleteProduct(id: string) {
    set(get().filter(product => product.id !== id));
  }
  return { deleteProduct };
});
```

Creating actions can also depend on querying other atom states:
```tsx
const a = atom(1);
const b = atom(2);
const c = atom(3, (get, set, query) => {
  const inc = () => set(get() + query(a).data + query(b).data);
  return { inc };
});
```

### Define computed atom
```tsx
// define atom
const a = atom(1);
const b = atom(2);
const c = atom((query) => {
  const state_a = query(a);
  const state_b = query(b);
  return state_a.data + state_b.data;
});

// use atom
const value = c.useData();
return <span>{value}</span>;
```

Note that computed atoms only have `useData`, not `useChange`, because they are read-only and cannot be directly modified.

## Compare with Jotai
In Jotai, you need to import separate APIs: `useAtom` `useSetAtom` `useAtomValue`
```tsx
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

const [atomValue, setAtomValue] = useAtom(a);
const atomValue = useAtomValue(a);
const setAtomValue = useSetAtom(a);
```

In this solution, it saves the trouble of importing, directly use `a.useData()` and `a.useChange()`

## Work with immer

For complex nested object states, you can combine with [immer](https://github.com/immerjs/immer) to achieve immutable updates, making code more concise and readable.

### Basic Usage

```tsx
import { produce } from 'immer';
import { atom, WithStore } from 'react-no-redux';

type Product = {
  id: number;
  name: string;
  price: number;
};

const products = atom([] as Product[]);

const App = () => {
  const [list, setList] = products.useData();

  const addProduct = () => {
    setList(produce(draft => {
      draft.push({ id: Date.now(), name: 'New Product', price: 100 });
    }));
  };

  const updateFirstProduct = () => {
    setList(produce(draft => {
      if (draft[0]) {
        draft[0].name = 'Updated Product';
        draft[0].price = 200;
      }
    }));
  };

  const removeProduct = (id: number) => {
    setList(produce(draft => {
      const index = draft.findIndex(p => p.id === id);
      if (index !== -1) draft.splice(index, 1);
    }));
  };

  return (
    <WithStore>
      <button onClick={addProduct}>Add Product</button>
      <button onClick={updateFirstProduct}>Update First</button>
      <div>
        {list.map(product => (
          <div key={product.id}>
            {product.name} - ${product.price}
            <button onClick={() => removeProduct(product.id)}>Remove</button>
          </div>
        ))}
      </div>
    </WithStore>
  );
};
```

### Combined with actions

```tsx
import { produce } from 'immer';
import { atom } from 'react-no-redux';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const todos = atom([] as Todo[], (get, set) => {
  const addTodo = (text: string) => {
    set(produce(get(), draft => {
      draft.push({ id: Date.now(), text, completed: false });
    }));
  };
  const toggleTodo = (id: number) => {
    set(produce(get(), draft => {
      const todo = draft.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    }));
  };
  const removeTodo = (id: number) => {
    set(produce(get(), draft => {
      const index = draft.findIndex(t => t.id === id);
      if (index !== -1) {
        draft.splice(index, 1);
      }
    }));
  };

  return { addTodo, toggleTodo, removeTodo };
});

// Usage
const TodoApp = () => {
  const [todoList, actions] = todos.useData();

  return (
    <div>
      <button onClick={() => actions.addTodo('New Task')}>Add Todo</button>
      {todoList.map(todo => (
        <div key={todo.id}>
          <span
            style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
            onClick={() => actions.toggleTodo(todo.id)}
          >
            {todo.text}
          </span>
          <button onClick={() => actions.removeTodo(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

### 3 Ways to Call

Taking actions as an example, when using immer in the `set` method, there are 3 ways to call:

```tsx
// Method 1: Pass get()
set(produce(get(), draft => {
  draft.push(newItem);
}));

// Method 2: Use function form
set(current => produce(current, draft => {
  draft.push(newItem);
}));

// Method 3: Curried form (this is the most concise)
set(produce(draft => {
  draft.push(newItem);
}));
```

Benefits of using immer:
- **Simplified syntax**: Directly modify draft objects without manually creating new objects
- **Type safety**: Fully maintains TypeScript type inference
- **Performance optimization**: immer is internally optimized, only truly changed parts create new objects
- **Reduce errors**: Avoid potential omissions when manually deep copying