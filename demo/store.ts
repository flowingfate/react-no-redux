import { atom } from '../src';

export const store = {
  a: atom(1),
  b: atom('2'),
  c: atom<string[]>([]),
};
