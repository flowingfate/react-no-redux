import React from 'react';
import { describe, it, expect } from 'vitest'
import { produce } from 'immer';
import { atom, WithStore } from '../src';
import { render, fireEvent, screen } from '@testing-library/react';


type Product = {
  id: number;
  name: string;
  price: number;
};

describe('Work with immer', () => {
  it('Basic-Usage', () => {
    const products = atom([] as Product[]);
    const App = () => {
      const [list, setList] = products.useData();
      const add = () => setList(produce(d => { d.push({ id: 1, name: 'Product 1', price: 100 }); }));
      const rename = () => setList(produce(d => { d[0].name = 'Updated Product 1'; }));

      return (
        <>
          <button data-testid="add-btn" onClick={add}>Add Product 1</button>
          <button data-testid="rename-btn" onClick={rename}>Remove Product 1</button>
          <div data-testid="product-name">
            {list[0]?.name || 'None'}
          </div>
        </>
      );
    };

    render(<WithStore><App/></WithStore>);
    expect(screen.getByTestId('product-name').textContent).toBe('None');
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('product-name').textContent).toBe('Product 1');
    fireEvent.click(screen.getByTestId('rename-btn'));
    expect(screen.getByTestId('product-name').textContent).toBe('Updated Product 1');
  });

  it('Actions Usage', () => {
    const products = atom([] as Product[], (get, set) => ({
      add: (product: Product) => set(produce(draft => { draft.push(product); })),
      remove: (id: number) => set(produce(draft => { return draft.filter(p => p.id !== id); })),
      updateName: (id: number, name: string) => set(produce(draft => {
        const product = draft.find(p => p.id === id);
        if (product) product.name = name;
      }))
    }));

    const App = () => {
      const [list, actions] = products.useData();

      return (
        <>
          <button
            data-testid="add-action-btn"
            onClick={() => actions.add({ id: 1, name: 'Action Product', price: 200 })}
          >
            Add via Action
          </button>
          <button
            data-testid="update-action-btn"
            onClick={() => actions.updateName(1, 'Updated Action Product')}
          >
            Update via Action
          </button>
          <div data-testid="action-product-name">
            {list[0]?.name || 'None'}
          </div>
        </>
      );
    };

    render(<WithStore><App/></WithStore>);
    expect(screen.getByTestId('action-product-name').textContent).toBe('None');

    fireEvent.click(screen.getByTestId('add-action-btn'));
    expect(screen.getByTestId('action-product-name').textContent).toBe('Action Product');

    fireEvent.click(screen.getByTestId('update-action-btn'));
    expect(screen.getByTestId('action-product-name').textContent).toBe('Updated Action Product');
  });
});