import { describe, it, expect } from 'vitest'
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { atom, WithStore } from '../src';

const a_atom = atom(1);
const store = {
  a: a_atom,
  b: atom('2'),
  c: atom<string[]>(['1', '2', '3']),
  d: atom(0, (get, set) => ({
    increment: () => set(get() + 1),
    decrement: () => set(get() - 1),
  })),
  e: atom((use) => {
    return use(a_atom) * 2;
  }),
};

describe('Unit test for Simple cases', () => {
  it('Basic-Usage', () => {
    let stateOfA: any = {};
    let stateOfB: any = {};

    const BizA = () => {
      const [a, setA] = store.a.useData();
      const [b] = store.b.useData();
      const setC = store.c.useChange();
      stateOfA = { a, b };
      const removeB = () => setC(list => list.filter(item => (item !== b)));;
      return (
        <>
          <button data-testid="btn1" onClick={() => setA(a + 1)}>{a}</button>
          <button data-testid="btn2" onClick={removeB}>{b}</button>
        </>
      );
    };

    const BizB  = () => {
      const [a] = store.a.useData();
      const [b] = store.b.useData();
      const [list] = store.c.useData();
      stateOfB = { a, b, c: list };
      return (
        <div>
          {list.map(i => <span key={i}>{i}</span>)}
        </div>
      );
    };

    const App = () => (
      <WithStore>
        <BizA />
        <BizB />
      </WithStore>
    );

    render(<App />);
    expect(stateOfA).toEqual({ a: 1, b: '2' });
    expect(stateOfB).toEqual({ a: 1, b: '2', c: ['1', '2', '3'] });

    fireEvent.click(screen.getByTestId('btn1'));
    expect(stateOfA).toEqual({ a: 2, b: '2' });
    expect(stateOfB).toEqual({ a: 2, b: '2', c: ['1', '2', '3'] });

    fireEvent.click(screen.getByTestId('btn2'));
    expect(stateOfA).toEqual({ a: 2, b: '2' });
    expect(stateOfB).toEqual({ a: 2, b: '2', c: ['1', '3'] });
  });

  it('ActionAtom useChange method', () => {
    const TestComponent = () => {
      const actions = store.d.useChange();
      const [value] = store.d.useData();
      return (
        <div>
          <span data-testid="value">{value}</span>
          <button data-testid="increment" onClick={actions.increment}>+</button>
          <button data-testid="decrement" onClick={actions.decrement}>-</button>
        </div>
      );
    };

    const App = () => (
      <WithStore>
        <TestComponent />
      </WithStore>
    );

    render(<App />);
    expect(screen.getByTestId('value').textContent).toBe('0');

    fireEvent.click(screen.getByTestId('increment'));
    expect(screen.getByTestId('value').textContent).toBe('1');

    fireEvent.click(screen.getByTestId('decrement'));
    expect(screen.getByTestId('value').textContent).toBe('0');
  });

  it('ComputedAtom functionality and useData method', () => {
    const TestComponent = () => {
      const [a, setA] = store.a.useData();
      const computedValue = store.e.useData();
      return (
        <div>
          <span data-testid="computed">{computedValue}</span>
          <button data-testid="update-a" onClick={() => setA(a + 1)}>Update A</button>
        </div>
      );
    };

    const App = () => (
      <WithStore>
        <TestComponent />
      </WithStore>
    );

    render(<App />);
    expect(screen.getByTestId('computed').textContent).toBe('2'); // a=1, computed=1*2=2

    fireEvent.click(screen.getByTestId('update-a'));
    expect(screen.getByTestId('computed').textContent).toBe('4'); // a=2, computed=2*2=4
  });

  it('BasicAtom with proxy functionality', () => {
    const baseAtom = atom(5);
    (baseAtom as any).proxy = (get: any, set: any) => ({
      multiply: (factor: number) => set(get() * factor)
    });

    const TestComponent = () => {
      const [value, actions] = baseAtom.useData();
      return (
        <div>
          <span data-testid="proxy-value">{value}</span>
          <button data-testid="multiply-btn" onClick={() => (actions as any).multiply(3)}>Multiply by 3</button>
        </div>
      );
    };

    const App = () => (
      <WithStore>
        <TestComponent />
      </WithStore>
    );

    render(<App />);
    expect(screen.getByTestId('proxy-value').textContent).toBe('5');

    fireEvent.click(screen.getByTestId('multiply-btn'));
    expect(screen.getByTestId('proxy-value').textContent).toBe('15');
  });
});
