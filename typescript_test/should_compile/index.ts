import {createSelector} from '../../src/reselect.d.ts';
import * as common from '../common';

// Explicitly typed.
const explicitlyTypedSelector = createSelector<
  common.RootState, common.DeleteButtonContainerProps, common.DeleteButtonStateProps,
  boolean
> (
  (state, props) => !!state.items[props.itemId],
  (itemExists: boolean) => ({
    disabled: !itemExists,
  })
);
common.selectorConsumer(explicitlyTypedSelector);
explicitlyTypedSelector(
  common.rootState,
  {
    itemId: 'abcd',
  }
);

// Implicitly typed.
const implicitlyTypedSelector = createSelector(
  (state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
  (itemExists: boolean) => ({
    disabled: !itemExists,
  })
);
common.selectorConsumer(implicitlyTypedSelector);
implicitlyTypedSelector(
  common.rootState,
  {
    itemId: 'abcd',
  }
);

// Array syntax
const arrayType = createSelector(
  [
    (state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
  ],
  (itemExists: boolean) => ({
    disabled: !itemExists,
  })
);
common.selectorConsumer(arrayType);
arrayType(
  common.rootState,
  {
    itemId: 'abcd',
  }
);

// Array syntax, 5 inputs
// Allows for possible refactoring with upcoming TypeScript 2.1 object spread operator
const arrayTypeFive = createSelector(
  [
    (state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
    (state: common.RootState) => !!state.items,
    (state: common.RootState) => state.items[0],
    (state: common.RootState, props: common.DeleteButtonContainerProps) => state.items[props.itemId],
    (state: common.RootState) => !!state.items[0],
  ],
  (a: boolean, b: boolean, c: {id: string}, d: {id: string}, e: boolean) => ({
    a,
    b,
    c,
    d,
    e,
  })
);
common.selectorConsumer(arrayType);
arrayTypeFive(
  common.rootState,
  {
    itemId: 'abcd',
  }
);
