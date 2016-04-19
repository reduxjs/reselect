import {createSelector} from '../../src/reselect.d.ts';


// Some definitions.

type RootState = {
	items: {[key: string]: {
		id: string
	}}
}

type DeleteButtonStateProps = {
    disabled: boolean
}

type DeleteButtonContainerProps = {
    itemId: string
}

function selectorConsumer (selector: (state: RootState, props: DeleteButtonContainerProps) => DeleteButtonStateProps) {}


// Tests

// Explicitly typed.
selectorConsumer(createSelector<
	RootState, DeleteButtonContainerProps, DeleteButtonStateProps,
	boolean
> (
	(state, props) => !!state.items[props.itemId],
	(itemExists: boolean) => ({
		disabled: !itemExists
	})
));


// Implicitly typed.
selectorConsumer(createSelector(
	(state: RootState, props: DeleteButtonContainerProps) => !!state.items[props.itemId],
	(itemExists: boolean) => ({
		disabled: !itemExists
	})
));
