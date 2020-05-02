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

type CombineState = { [key: string]: object };
export type StateOf<M> = M extends Model<infer S, any> ? S : unknown;
export type ActionOf<M> = M extends Model<any, infer A> ? A : unknown;
export type StoreMap<M> = { [K in keyof M]: Store<M[K]> };

/* ------------------------------------------------------------------------------------ */
/* --------------------------------------辅助工具-------------------------------------- */
/* ------------------------------------------------------------------------------------ */

export function isSameState<S extends object>(origin: S, value: Partial<S>) {
  // Todo: value可能包含 S 中没有的字段
  const keys = Object.keys(value);
  if (keys.length === 0) return true;
  return keys.every((k) => (origin[k] === value[k]));
}

export function bindStore<S extends CombineState, K extends keyof S>(store: Store<S>, key: K) {
  const newStore: Store<S[K]> = {
    get: () => store.get()[key],
    set: (state, callback) => {
      store.set((prev) => {
        const origin = prev[key];
        const value = (typeof state === 'function') ? state(origin) : state;
        if (isSameState(origin, value)) return {}; // Todo 确认api
        const record: Partial<S> = {};
        record[key] = Object.assign({}, origin, value);
        return record;
      }, callback);
    },
  };
  return newStore;
}

export function mapStore<S extends CombineState>(store: Store<S>) {
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

export function combineModels<M extends CombineState, A>(
  models: M,
  factory: ((scope: StoreMap<M>) => A),
) {
  return makeModel(models, (store) => factory(mapStore(store)));
}

export default function createStore<S, A>(model: Model<S, A>) {
  const { state, factory } = model;

  const defaultContextValue: any = { state, actions: {} };
  const Context = createContext<{ state: S, actions: A }>(defaultContextValue);
  const useStore = () => useContext(Context);

  class Provider extends PureComponent<{}, S> {
    public static displayName = 'NoRedux-Root';
    public state: S = Object.assign({}, state);
    private actions = factory({
      get: () => this.state,
      set: this.setState.bind(this),
    });

    render() {
      const { state, actions } = this;
      return (
        <Context.Provider value={{ state, actions }}>
          {this.props.children}
        </Context.Provider>
      );
    }
  }

  const WithStore = Provider as ComponentClass<{}, S>;
  return { Context, WithStore, useStore };
}
