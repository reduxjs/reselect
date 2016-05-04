
export type RootState = {
	items: {[key: string]: {
		id: string
	}}
}

export type DeleteButtonStateProps = {
    disabled: boolean
}

export type DeleteButtonContainerProps = {
    itemId: string
}

export function selectorConsumer (selector: (state: RootState, props: DeleteButtonContainerProps) => DeleteButtonStateProps) {}
