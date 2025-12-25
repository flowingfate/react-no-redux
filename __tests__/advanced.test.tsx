import React from 'react';
import { describe, it, expect } from 'vitest'
import { atom, WithStore, mutate } from '../src';
import { render, fireEvent, screen } from '@testing-library/react';


describe('Advanced case', () => {
  it('Advanced action atom usage', () => {
    const atom_a = atom(1);
    const atom_b = atom(2);
    const atom_c = atom((use) => use(atom_a) * 10);
    const atom_d = atom(100, (get, set) => ({
      double: () => set(get() * 2)
    }));

    const atom_x = atom(3, (get, set, use) => {
      const execute = () => {
        const a = use(atom_a)[0];
        const [b, setB] = use(atom_b);
        const c = use(atom_c);
        const [d, dActions] = use(atom_d);
        set(get() + a + b + c + d);
        setB(b + 1);
        dActions.double();
      };
      return { execute };
    });

    const App = () => {
      const [a] = atom_a.useData();
      const [b] = atom_b.useData();
      const c = atom_c.useData();
      const [d] = atom_d.useData();
      const [x, actions] = atom_x.useData();

      return (
        <>
          <div data-testid="val_a">{a}</div>
          <div data-testid="val_b">{b}</div>
          <div data-testid="val_c">{c}</div>
          <div data-testid="val_d">{d}</div>
          <div data-testid="val_x">{x}</div>
          <button onClick={actions.execute}>click</button>
        </>
      );
    };

    render(
      <WithStore>
        <App />
      </WithStore>
    );

    fireEvent.click(screen.getByText('click'));

    expect(screen.getByTestId('val_a').textContent).toBe('1');
    expect(screen.getByTestId('val_b').textContent).toBe('3');
    expect(screen.getByTestId('val_c').textContent).toBe('10');
    expect(screen.getByTestId('val_d').textContent).toBe('200');
    expect(screen.getByTestId('val_x').textContent).toBe('116');
  });

  it('mutate api usage', () => {
    const price1Atom = atom(100);
    const price2Atom = atom(200);
    const totalAtom = atom((use) => use(price1Atom) + use(price2Atom));

    const discountMutation = mutate((use) => (percent: number) => {
      const [price1, setPrice1] = use(price1Atom);
      const [price2, setPrice2] = use(price2Atom);
      setPrice1(price1 * percent);
      setPrice2(price2 * percent);
    });

    const App = () => {
      const [price1] = price1Atom.useData();
      const [price2] = price2Atom.useData();
      const total = totalAtom.useData();
      const discount = discountMutation.use();

      return (
        <>
          <div data-testid="price1">{price1}</div>
          <div data-testid="price2">{price2}</div>
          <div data-testid="total">{total}</div>
          <button onClick={() => discount(0.5)}>half</button>
        </>
      );
    };

    render(
      <WithStore>
        <App />
      </WithStore>
    );

    expect(screen.getByTestId('price1').textContent).toBe('100');
    expect(screen.getByTestId('price2').textContent).toBe('200');
    expect(screen.getByTestId('total').textContent).toBe('300');

    fireEvent.click(screen.getByText('half'));

    expect(screen.getByTestId('price1').textContent).toBe('50');
    expect(screen.getByTestId('price2').textContent).toBe('100');
    expect(screen.getByTestId('total').textContent).toBe('150');
  });
});