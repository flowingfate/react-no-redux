import React, { createContext, PureComponent, useContext, ComponentClass } from 'react';

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------类型声明-------------------------------------- */
/* ------------------------------------------------------------------------------------ */
export interface IStore<S> {
  set(state: ((prev: S) => Partial<S>) | Partial<S>, callback?: () => void ): void;
  get(): S;
}
export interface IModel<S, A> {
  state: S;
  factory(store: IStore<S>): A;
}

export type StateOf<M> = M extends IModel<infer S, any> ? S : unknown;
export type ActionOf<M> = M extends IModel<any, infer A> ? A : unknown;

type StateMap<M> = { [K in keyof M]: StateOf<M[K]> }
type ActionMap<M> = { [K in keyof M]: ActionOf<M[K]> }
type ModelRecord = Record<string, IModel<any, any>>;

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------辅助工具-------------------------------------- */
/* ------------------------------------------------------------------------------------ */

function isDiffArray(a: any[], b: any[]) {
  if (!a || !b) return true;
  if (a.length !== b.length) return true;
  return a.some((item, i) => (item !== b[i]));
}

function memo<T, K extends any[]>(func: ((...args: K) => T)): ((...args: K) => T) {
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

function bindScope<S, K extends keyof S>(store: IStore<S>, key: K) {
  const scope: IStore<S[K]> = {
    set: (state, callback) => {
      const origin = store.get()[key];
      const value = typeof state === 'function' ? state(origin) : state;
      // Todo: 如果value相对于origin没有值变化，直接return
      const record: Partial<S> = {};
      record[key] = Object.assign({}, origin, value);
      store.set(record, callback);
    },
    get: () => store.get()[key],
  };
  return scope;
}

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------主要函数-------------------------------------- */
/* ------------------------------------------------------------------------------------ */

export function makeModel<S, A>(state: S, factory: (store: IStore<S>) => A): IModel<S, A> {
  return { state, factory };
}

export function combineModels<M extends ModelRecord>(models: M): IModel<StateMap<M>, ActionMap<M>> {
  const state = {} as StateMap<M>;
  const keys: Array<keyof M> = Object.keys(models);
  keys.forEach((key) => {
    state[key] = models[key].state;
  });
  return makeModel(state, (store) => {
    const actions = {} as ActionMap<M>;
    keys.forEach((key) => {
      const scope = bindScope(store, key)
      actions[key] = models[key].factory(scope);
    });
    return actions;
  });
}


export default function createStore<S, A>(model: IModel<S, A>) {
  const { state, factory } = model;
  const initialStore: IStore<S> = {
    set: () => {},
    get: () => state,
  };

  const memoFactory = memo(factory);
  const memoCtxValue = memo((state: S, store: IStore<S>) => {
    const actions = memoFactory(store);
    return { state, actions };
  });

  const Context = createContext(memoCtxValue(state, initialStore));
  const useStore = () => useContext(Context);

  class Provider extends PureComponent<{}, S> {
    public state: S = Object.assign({}, state);
    private store: IStore<S> = {
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
