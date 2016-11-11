import {createSelector, subscribeToErrors, OnError, Unsubscribe} from '../../src/reselect.d';
import * as common from '../common';


// Explicitly typed.
const explicitlyTypedSelector = createSelector<
  common.RootState, common.DeleteButtonStateProps, boolean
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

const onError: OnError = (error, combiner, args, dependencies) => {
  console.log(error, combiner, args, dependencies);
};

const errorSubscription : Unsubscribe = subscribeToErrors(onError);
