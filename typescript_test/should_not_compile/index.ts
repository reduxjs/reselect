import {createSelector} from '../../src/reselect.d.ts';
import * as common from '../common';


const implicitlyTypedSelector = createSelector(
  (state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
  (itemExists: boolean) => ({
    disabled: !itemExists,
  })
);


// No missing props.
implicitlyTypedSelector(
  common.rootState,
  {}
)

// No extra props.
implicitlyTypedSelector(
  common.rootState,
  {
    itemId: 'abcd',
    foo: 'bar',
  }
)

// Array syntax - Return value of createSelector must match combiner function type
createSelector(
  [
    (state: common.RootState) => state.items[0].id,
    (state: common.RootState) => !!state.items[0].id,
  ],
  (id: boolean, exists: boolean) => ({
    id,
    exists,
  })
)

// Array syntax - Return value of createSelector must match combiner function type
createSelector(
  (state: common.RootState) => state.items[0].id,
  (state: common.RootState) => !!state.items[0].id,
  (id: boolean, exists: boolean) => ({
    id,
    exists,
  })
)
