import React, { useState, useContext, useMemo, useEffect, createContext, ReactNode } from 'react';

const UNIQ = Symbol('Fingerprint');
const uuid = () => Math.round((Math.random() + 1) * Date.now()).toString(36);
const Context = createContext<(<T>(one: Atom<T>) => AtomState<T>)>({} as any);

type Caller<T> = (data: T) => void;
type Reduce<T> = (data: T) => T;
interface Atom<T> { key: string; [UNIQ]: T }
interface AtomState<T> {
  data: T;
  change: (ch: Reduce<T> | T) => void;
  listen: (cb: Caller<T>) => VoidFunction;
}

function buildAtomState<T>(atom: Atom<T>) {
  const listener = new Set<Caller<T>>();
  const state: AtomState<T> = {
    data: atom[UNIQ],
    change: (ch) => {
      state.data = (typeof ch === 'function') ? (ch as Reduce<T>)(state.data) : ch;
      listener.forEach(call => call(state.data));
    },
    listen: (call) => {
      listener.add(call);
      return () => listener.delete(call);
    },
  };
  return state;
}

function buildStore() {
  const map: { [k: string]: AtomState<any> } = {};
  return function store<T>(atom: Atom<T>): AtomState<T> {
    const { key } = atom;
    let state = map[key];
    if (state === undefined) {
      /* dynamically register atom state */
      state = buildAtomState(atom);
      map[key] = state;
    }
    return state;
  }
}

export function atom<T>(initial: T): Atom<T> {
  return { key: uuid(), [UNIQ]: initial };
}

export function useChange<T>(atom: Atom<T>) {
  return useContext(Context)(atom).change;
}

export function useAtom<T>(atom: Atom<T>) {
  const { data, listen, change } = useContext(Context)(atom);
  const [v, set] = useState(data);
  useEffect(() => listen(set), []);
  return [v, change] as const;
}

export const WithStore = (props: { children: ReactNode }) => (
  <Context.Provider value={useMemo(buildStore, [])}>
    {props.children}
  </Context.Provider>
);
