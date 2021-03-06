import { isSameState, mapStore, Store } from '../src';

describe('辅助方法', () => {
  describe('isSameState', () => {
    const place = { name: '123', age: 123 };
    const origin = { a: 1, b: '2', c: place };

    it('异常入参检验', () => {
      expect(isSameState(origin, {})).toBe(true);
      expect(isSameState(origin, { x: 1 } as any)).toBe(false);
    });

    it('合法入参校验', () => {
      expect(isSameState(origin, { a: 2 })).toBe(false);
      expect(isSameState(origin, { a: 1 })).toBe(true);
      expect(isSameState(origin, { a: 1, b: '3' })).toBe(false);
      expect(isSameState(origin, { a: 1, b: '2' })).toBe(true);
      expect(isSameState(origin, { c: place })).toBe(true);
      expect(isSameState(origin, { c: { ...place } })).toBe(false);
    });
  });

  describe('mapStore-bindStore', () => {
    const state = {
      user: { a: '1', b: 2 },
      work: { c: 3, d: '4' },
    };

    const store: Store<typeof state> = {
      get: () => state,
      set: (updater, callback) => {
        if (typeof updater === 'function') {
          const value = updater(state);
          Object.assign(state, value);
        } else {
          Object.assign(state, updater);
        }
        if (callback) callback();
      },
    };

    it('store-形状校验', () => {
      expect(store.get).toBeInstanceOf(Function);
      expect(store.set).toBeInstanceOf(Function);
      expect(store.set.length).toBe(2);
    });

    const scope = mapStore(store);
    it('mapStore-生成对应的对象', () => {
      expect(Object.keys(scope)).toEqual(['user', 'work']);

      expect(scope.user.get).toBeInstanceOf(Function);
      expect(scope.user.set).toBeInstanceOf(Function);
      expect(scope.user.set.length).toBe(2);

      expect(scope.work.get).toBeInstanceOf(Function);
      expect(scope.work.set).toBeInstanceOf(Function);
      expect(scope.work.set.length).toBe(2);
    });

    it('bindStore-操作结果正确', () => {
      const { user, work } = scope;

      let userState = user.get();
      let workState = work.get();
      expect(userState).toEqual({ a: '1', b: 2 });

      user.set({ b: 3 });
      expect(userState).not.toBe(user.get());
      expect(user.get()).toEqual({ a: '1', b: 3 });
      expect(workState).toBe(work.get());

      userState = user.get();
      workState = work.get();
      user.set({ b: 3 });
      expect(userState).toBe(user.get());
      expect(workState).toBe(work.get());

      user.set({ b: 4 }, () => {
        expect(user.get()).toEqual({ a: '1', b: 4 });
        expect(workState).toBe(work.get());
      });
      user.set((prev) => ({ b: prev.b + 1 }), () => {
        expect(user.get()).toEqual({ a: '1', b: 5 });
        expect(workState).toBe(work.get());
      });
    });
  });
});


