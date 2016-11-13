import {createSelector, subscribeToErrors} from '../../../src/reselect.d';
import * as common from '../common';


const implicitlyTypedSelector = createSelector(
  (state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
  (itemExists: boolean) => ({
    disabled: !itemExists
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
    foo: 'bar'
  }
)

// No missing props
subscribeToErrors(
  (error: Error, combiner: function, args: Array<any>) => {}
);

// No extra props
subscribeToErrors(
  (error: Error, combiner: function, args: Array<any>, dependencies: Array<Function>, foo: any) => {}
);
