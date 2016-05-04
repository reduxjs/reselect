import {createSelector} from '../../../src/reselect.d.ts';
import * as common from '../common';


// Explicitly typed.
common.selectorConsumer(createSelector<
	common.RootState, common.DeleteButtonContainerProps, common.DeleteButtonStateProps,
	boolean
> (
	(state, props) => !!state.items[props.itemId],
	(itemExists: boolean) => ({
		disabled: !itemExists
	})
));


// Implicitly typed.
common.selectorConsumer(createSelector(
	(state: common.RootState, props: common.DeleteButtonContainerProps) => !!state.items[props.itemId],
	(itemExists: boolean) => ({
		disabled: !itemExists
	})
));
