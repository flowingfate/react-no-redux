import createStore, { combineModels } from '../../src';
import user, { makeUserActions } from './user';
import work, { makeWorkActions } from './work';

const model = combineModels({ user, work }, (store) => ({
  user: makeUserActions(store.user),
  work: makeWorkActions(store.work),
}));
const { WithStore, useStore, Context } = createStore(model);

export { WithStore, useStore, Context };
