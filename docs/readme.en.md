[![Build Status](https://travis-ci.org/flowingfate/react-no-redux.svg?branch=master)](https://travis-ci.org/flowingfate/react-no-redux)
[![codecov](https://codecov.io/gh/flowingfate/react-no-redux/branch/master/graph/badge.svg)](https://codecov.io/gh/flowingfate/react-no-redux)
![react](https://img.shields.io/badge/react-^16.8.0-blue.svg)
![lang](https://img.shields.io/badge/lang-typescript-red.svg)
![npm](https://img.shields.io/npm/v/react-no-redux)
![GitHub file size in bytes](https://img.shields.io/github/size/flowingfate/react-no-redux/src/index.tsx)
![npm](https://img.shields.io/npm/dw/react-no-redux)

---

**[中文版](../readme.md)**

## Why

Although Redux still occupies half of the state management market, new things have been emerging endlessly!

In my personal opinion, Redux has two significant drawbacks:
* It is not friendly enough with Typescript.
* The usage process is too cumbersome, forcibly increasing human cognitive costs.

Emerging state management libraries, such as Jotai, Recoil, Zustand, etc., are all lightweight and easy to use. This solution also aims to provide an experience as good as theirs.

React itself provides Context for cross-component communication. A good state management is nothing more than optimizing the usage of native Context, making:
* Better performance
* More friendly usage

## Goal

* Lightweight and small, but fully functional
* Robust type safety
* Few concepts, completely transparent structure, simple to use
* Support multiple instances (unlike Redux which uses a singleton), can be used flexibly in any local scope

## How

> Writing this is mainly to record my own learning and understanding, and also to share it by the way.

If you are interested, you can read the **[Source Code](../src/index.tsx)**. It is very concise. Apart from react, there are no other extras. There are several key points:

#### ① Immutable Context value

When the Context value changes, the subtree needs to be traversed recursively to find the nodes that depend on it for updates, so the efficiency will be very poor.
* Therefore, when the state changes, notifying the component of the state change cannot rely on the change of the Context value.
* `value={useMemo(buildQuery, [])}` is to ensure that it does not change.
* Change notification can only use another way - Publish-Subscribe.

#### ② Publish-Subscribe (Event Mechanism)

When the state changes, publish-subscribe can achieve precise point-to-point updates (react-redux actually also uses publish-subscribe).

#### ③ Trigger Change - Stealing the Beam and Changing the Pillar (Substituted)

```tsx
const { data, change, listen } = useContext(Context)(this);
const [v, set] = useState(data);
useLayoutEffect(() => listen(set), []);
return [v, change] as const;
```
Register the change function `set` to the listener, replacing it with change (not only modifying data, but also triggering subscription updates).

## Usage

This solution exports only 2 APIs in total, which are very simple to use:
* `atom`: Used to define state
* `WithStore`: Used to wrap the component tree, providing state context

`<WithStore>...</WithStore>` only needs to be wrapped at the outermost layer of the application.

First, understand two type definitions. The `set` function mentioned many times later has the type `Change<T>`, and its behavior is consistent with the setter of `React.useState`.

```ts
type Reduce<T> = (data: T) => T;
type Change<T> = (ch: Reduce<T> | T) => void;
```

You can create 3 types of atoms through the `atom` function:

### 1. Value Atom
Basic usage is as follows:

```tsx
const priceAtom = atom(100);

function Component1() {
  const [price, set] = priceAtom.useData();
  return <div>{price}</div>;
}

function Component2() {
  const set = priceAtom.useChange();
  return <button onClick={() => set(150)}>increase</button>;
}
```

What is the difference between `useData` vs `useChange`?
* `useData`: Returns the value and the update function. When the atom value changes, the current component will re-render.
* `useChange`: Returns only the update function. When the atom value changes, the current component will not re-render.

### 2. Action Atom
Based on the Value Atom, the ability to define a set of predefined operations is added:

```tsx
// Here `get` always gets the latest value, and the type of `set` is `Change<T>`
const priceAtom = atom(100, (get, set) => {
  return {
    increase: (delta: number) => set(get() + delta),
    decrease: (delta: number) => set((prev) => prev - delta),
  };
});

function Component1() {
  const [price, actions] = priceAtom.useData();
  return <div>{price}</div>;
}

function Component2() {
  // Similarly, when using useChange, changes in the value of priceAtom will not cause Component2 to re-render
  const actions = priceAtom.useChange();
  return <button onClick={() => actions.increase(1)}>increase</button>;
}
```
Through Action Atom, complex operations can be encapsulated into functions on demand, which is convenient for reuse in different components.
The functions to be encapsulated here can be synchronous or asynchronous. For example, you can fetch data from the server and update the value of the atom based on the result. This gives us the opportunity to refine some common business operations into shared logic.

### 3. Computed Atom
This is a read-only atom whose value is calculated from other atoms:

```tsx
const priceAtom = atom(100);
const taxAtom = atom(0.1);
const totalAtom = atom((use) => use(priceAtom) * (1 + use(taxAtom)));

function Component() {
  // computed atom can only use useData to get the value, there is no useChange method, and data cannot be changed
  const total = totalAtom.useData();
  return <div>{total}</div>;
}
```
When creating an atom, the `use` method used can pass in any other type of atom (including value atom, action atom, computed atom) to return the value it carries. And it will automatically subscribe to their changes, so that when the dependent atom changes, its own value is recalculated.

## Advanced Usage

### 1. Action Atom can also read and modify other atoms

```ts
const a = atom(1);
const b = atom(2);
const c = atom(3, (get, set, use) => {
  function add(delta: number) {
    const [a_val, setA] = use(a);
    const [b_val, setB] = use(b);
    set(a_val + b_val + delta * 2);
    setA(a_val + delta);
    setB(b_val + delta);
  }
  return { add };
});
```

It can be seen that when creating an action atom, you can also get a `use` method. This method can also accept any other type of atom, but this method is very flexible:
* When passing in a value atom: it returns a `[value, set]` tuple
* When passing in an action atom: it returns a `[value, actions]` tuple
* When passing in a computed atom: it only returns its value

This `use` looks very much like hooks in React, so it is easy to understand. But it should be noted that: `use` will get the latest value of other atoms every time it is called, but it will not establish a subscription relationship. Changes in other atoms will not trigger the action function to re-execute.

### 2. Asynchronous Initialization
Sometimes, we hope that the initial value of the atom comes from the server, but this asynchronous process is not suitable for execution in the component. At this time, it can be cleverly implemented like this:

```ts
type Product = { /* ... */ };
const productsAtom = atom([] as Product[], (get, set) => {
  async function initialize() {
    set(await fetchProductsFromServer());
  }
  initialize();

  function deleteProduct(id: string) {
    set(get().filter(product => product.id !== id));
  }
  return { deleteProduct };
});
```

The `initialize` function here will not be executed immediately. It will only be called when this productsAtom is used for the first time, and it will only be called once. Note that the use mentioned here includes 3 situations:
* Used by other computed atoms
* Used when depended on by other action atoms
* Calling productsAtom.useXXX in the component

By analogy, this asynchronous initialization strategy is also suitable for other scenarios.

### 3. Combine with immer (or mutative, etc.)
When the value of an atom is a complex object, modifying this object directly can be troublesome. Here, take immer as an example to simplify the operation:

```tsx
import { produce } from 'immer';
type Product = { /* ... */ };
const productsAtom = atom([] as Product[]);

function Component() {
  const setProducts = productsAtom.useChange();
  function add(item: Product) {
    setProducts(produce((draft) => {
      draft.push(item);
    }));
  }
  return (/* ... */);
}
```

Or use in Action Atom:

```ts
import { produce } from 'immer';
type Product = { /* ... */ };
const productsAtom = atom([] as Product[], (get, set) => {
  function add(item: Product) {
    set(produce((draft) => {
      draft.push(item);
    }));
  }
  return { add };
});
```

Taking action atom as an example, when using immer with the `set` method, there are 3 ways to call it:

```tsx
// Method 1: Pass in get()
set(produce(get(), draft => {
  draft.push(newItem);
}));

// Method 2: Use function form
set(current => produce(current, draft => {
  draft.push(newItem);
}));

// Method 3: curried form (this is the most concise)
set(produce(draft => {
  draft.push(newItem);
}));
```

Benefits of using immer:
- **Simplify syntax**: Modify the draft object directly without manually creating a new object
- **Type safety**: Fully maintain TypeScript type inference
- **Performance optimization**: immer has done internal optimization, only the parts that actually change will create new objects
- **Reduce errors**: Avoid omissions that may occur when manually deep copying

## Compare with Jotai
In jotai, separate APIs need to be introduced: `useAtom` `useSetAtom` `useAtomValue`
```tsx
import { useAtom, useSetAtom, useAtomValue } from 'jotai';

const [atomValue, setAtomValue] = useAtom(a);
const atomValue = useAtomValue(a);
const setAtomValue = useSetAtom(a);
```

In this solution, the trouble of importing is saved, and `a.useData()` and `a.useChange()` can be used directly.
