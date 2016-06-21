import {createSelector} from '../../../src/reselect.d.ts';
import * as common from '../common';


// Explicitly typed.
const explicitlyTypedSelector = createSelector<
  common.RootState, common.DeleteButtonContainerProps, common.DeleteButtonStateProps,
  boolean
> (
  (state, props) => !!state.items[props.itemId],
  (itemExists: boolean) => ({
    disabled: !itemExists
  })
);
common.selectorConsumer(explicitlyTypedSelector);
explicitlyTypedSelector(
  common.rootState,
  {
    itemId: 'abcd',
  }
)


// Implicitly typed.
const implicitlyTypedSelector = createSelector(
  (state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
  (itemExists: boolean) => ({
    disabled: !itemExists
  })
);
common.selectorConsumer(implicitlyTypedSelector);
implicitlyTypedSelector(
  common.rootState,
  {
    itemId: 'abcd',
  }
)
