import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const uuid = () => Math.round((Math.random() + 1) * Date.now()).toString(36);
const UNIQ = Symbol('BUILD');

type Caller<T> = (data: T) => void;
type Listen<T> = (cb: Caller<T>) => VoidFunction;
type Reduce<T> = (data: T) => T;
type Creator<T, A> = (get: () => T, set: Change<T>, query: Query) => A;
export type Change<T> = (ch: Reduce<T> | T) => void;

interface ValueState<T> {
  data: T;
  change: Change<T>;
  listen: Listen<T>;
}
interface ActionState<T, A> {
  data: T;
  actions: A;
  listen: Listen<T>;
}
interface ReadonlyState<T> {
  data: T;
  listen: Listen<T>;
}

export type AnyAtom<T = any> = ValueAtom<T> | ActionAtom<T, any> | ComputedAtom<T>;
export interface Query {
  <T>(atom: ComputedAtom<T>): ReadonlyState<T>;
  <T, A>(atom: ActionAtom<T, A>): ActionState<T, A>;
  <T>(atom: ValueAtom<T>): ValueState<T>;
  <T>(atom: AnyAtom<T>): ReadonlyState<T>;
}

function generate<T>(data: T) {
  const listener = new Set<Caller<T>>();
  const change = (ch: Reduce<T> | T) => {
    const prev = state.data;
    const next = (typeof ch === 'function') ? (ch as Reduce<T>)(prev) : ch;
    if (prev === next) return;
    state.data = next;
    listener.forEach(call => call(next));
  };
  const listen: Listen<T> = (call) => {
    listener.add(call);
    return () => listener.delete(call);
  };
  const state = { data, change, listen };
  return state;
}

function bind<T>(data: T, listen: Listen<T>) {
  const [v, set] = useState(data);
  useLayoutEffect(() => listen(set), []);
  return v;
}

class ValueAtom<T> {
  public readonly type = 'v' as const;
  public readonly key = uuid();
  public proxy?: Creator<T, Change<T>>;
  constructor(private init: T) {}

  public [UNIQ](query: Query): ValueState<T> {
    const state = generate(this.init);
    if (this.proxy) {
      state.change = this.proxy(() => state.data, state.change, query);
    }
    return state;
  }

  public action<A>(creator: Creator<T, A>) {
    return new ActionAtom(this.init, creator);
  }

  public useData() {
    const { data, change, listen } = useContext(Context)(this);
    return [bind(data, listen), change] as const;
  }

  public useChange() {
    return useContext(Context)(this).change;
  }
}

class ActionAtom<T, A> {
  public readonly type = 'a' as const;
  public readonly key = uuid();
  constructor(
    private readonly init: T,
    private readonly creator: Creator<T, A>) {}

  public [UNIQ](query: Query): ActionState<T, A> {
    const state = generate(this.init);
    const actions = this.creator(() => state.data, state.change, query);
    Object.assign(state, { actions });
    return state as any;
  }

  public useData() {
    const { data, actions, listen } = useContext(Context)(this);
    return [bind(data, listen), actions] as const;
  }

  public useChange() {
    return useContext(Context)(this).actions;
  }
}

class ComputedAtom<T> {
  public readonly type = 'c' as const;
  public readonly key = uuid();
  constructor(private readonly calc: (query: Query) => T) {}

  public [UNIQ](query: Query): ReadonlyState<T> {
    const deps: AnyAtom[] = [];
    const q = (atom: AnyAtom) => (deps.push(atom), query(atom));
    const state = generate(this.calc(q as Query));
    if (deps.length > 0) {
      const update = () => state.change(this.calc(query));
      deps.forEach((a) => query(a).listen(update));
    }
    return state;
  }

  public useData() {
    const { data, listen } = useContext(Context)(this);
    return bind(data, listen);
  }
}

function buildQuery() {
  const map: { [k: string]: any } = {};
  function query(atom: AnyAtom) {
    const { key } = atom;
    let state = map[key];
    if (state === undefined) {
      /* dynamically register atom state */
      state = atom[UNIQ](query as Query);
      map[key] = state;
    }
    return state;
  }
  return query as Query;
}

export function atom<T>(initial: (query: Query) => T): ComputedAtom<T>;
export function atom<T, A>(initial: T, creator: Creator<T, A>): ActionAtom<T, A>;
export function atom<T>(initial: T): ValueAtom<T>;
export function atom(a: any, b?: any) {
  if (typeof a === 'function') return new ComputedAtom(a);
  if (b) return new ActionAtom(a, b);
  return new ValueAtom(a);
}

const Context = createContext({} as Query);
export const WithStore = (props: { children: ReactNode }) => (
  <Context.Provider value={useMemo(buildQuery, [])}>
    {props.children}
  </Context.Provider>
);
