import createStore, { combineModels } from '../../src';
import user from './user';
import work from './work';

const model = combineModels({ user, work });
const { WithStore, useStore, Context } = createStore(model);

export { WithStore, useStore, Context };