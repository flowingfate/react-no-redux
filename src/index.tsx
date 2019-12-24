import React, { createContext, PureComponent, useContext, ComponentClass } from 'react';

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------类型声明-------------------------------------- */
/* ------------------------------------------------------------------------------------ */
export interface Store<S> {
  set(state: ((prev: S) => Partial<S>) | Partial<S>, callback?: () => void ): void;
  get(): S;
}
export interface Model<S, A> {
  state: S;
  factory(store: Store<S>): A;
}

export type StateOf<M> = M extends Model<infer S, any> ? S : unknown;
export type ActionOf<M> = M extends Model<any, infer A> ? A : unknown;
export type StoreMap<M> = { [K in keyof M]: Store<M[K]> };

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------辅助工具-------------------------------------- */
/* ------------------------------------------------------------------------------------ */

export function isDiffArray(a: any[], b: any[]) {
  if (!a || !b) return true;
  if (a.length !== b.length) return true;
  return a.some((item, i) => (item !== b[i]));
}

export function isSameState<S extends object>(origin: S, value: Partial<S>) {
  // Todo: value可能包含 S 中没有的字段
  const keys = Object.keys(value);
  if (keys.length === 0) return true;
  return keys.every((k) => (origin[k] === value[k]));
}

export function memo<T, K extends any[]>(func: ((...args: K) => T)) {
  let lastDeps: K;
  let cache: T;
  return (...deps: K): T => {
    if (isDiffArray(deps, lastDeps)) {
      lastDeps = deps;
      cache = func(...deps);
    }
    return cache;
  };
}

export function bindStore<S extends Record<string, object>, K extends keyof S>(store: Store<S>, key: K) {
  const newStore: Store<S[K]> = {
    get: () => store.get()[key],
    set: (state, callback) => {
      store.set((prev) => {
        const origin = prev[key];
        const value = (typeof state === 'function') ? state(origin) : state;
        if (isSameState(origin, value)) return {};
        const record: Partial<S> = {};
        record[key] = Object.assign({}, origin, value);
        return record;
      }, callback);
    },
  };
  return newStore;
}

export function mapStore<S extends Record<string, object>>(store: Store<S>) {
  const initial = store.get();
  const scope = {} as StoreMap<S>;
  Object.keys(initial).forEach((key: keyof S) => {
    scope[key] = bindStore(store, key);
  });
  return scope;
}

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------主要函数-------------------------------------- */
/* ------------------------------------------------------------------------------------ */

export function makeModel<S, A>(state: S, factory: (store: Store<S>) => A): Model<S, A> {
  return { state, factory };
}

export function combineModels<M extends Record<string, object>, A>(
  models: M,
  factory: ((scope: StoreMap<M>) => A)
) {
  return makeModel(models, (store) => factory(mapStore(store)));
}

export default function createStore<S, A>(model: Model<S, A>) {
  const { state, factory } = model;

  const memoFactory = memo(factory);
  const memoCtxValue = memo((state: S, store: Store<S>) => {
    const actions = memoFactory(store);
    return { state, actions };
  });

  const defaultContextValue: any = { state, actions: {} };
  const Context = createContext<{ state: S, actions: A }>(defaultContextValue);
  const useStore = () => useContext(Context);

  class Provider extends PureComponent<{}, S> {
    public static displayName = 'NoRedux-Root';
    public state: S = Object.assign({}, state);
    private store: Store<S> = {
      set: this.setState.bind(this),
      get: () => this.state,
    }

    render() {
      const { state, store } = this;
      const value = memoCtxValue(state, store);
      return (
        <Context.Provider value={value}>
          {this.props.children}
        </Context.Provider>
      );
    }
  }

  const WithStore = Provider as ComponentClass<{}, S>;
  return { Context, WithStore, useStore };
}
