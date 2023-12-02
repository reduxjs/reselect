import Link from '@docusaurus/Link'
import type { FC, ReactNode } from 'react'

interface Props {
  readonly text: ReactNode
}

export const InternalLinks = {
  Selector: ({ text = 'selector' }) => (
    <Link
      to="/introduction/getting-started#selector-function"
      title="Selector Function"
    >
      {text}
    </Link>
  ),
  InputSelectors: ({ text = 'input selectors' }) => (
    <Link
      to="/introduction/getting-started#input-selectors"
      title="Input Selectors"
    >
      {text}
    </Link>
  ),
  OutputSelector: ({ text = 'output selector' }) => (
    <Link
      to="/introduction/getting-started#output-selector"
      title="Output Selector"
    >
      {text}
    </Link>
  ),
  ResultFunction: ({ text = 'result function' }) => (
    <Link
      to="/introduction/getting-started#result-function"
      title="Result Function"
    >
      {text}
    </Link>
  ),
  Dependencies: ({ text = 'dependencies' }) => (
    <Link to="/introduction/getting-started#dependencies" title="Dependencies">
      {text}
    </Link>
  ),
  CascadingMemoization: ({ text = 'Cascading Memoization' }) => (
    <Link
      to="/introduction/how-does-reselect-work#cascading-memoization"
      title="Cascading Memoization"
    >
      <b>
        <i>{text}</i>
      </b>
    </Link>
  ),
  OutputSelectorFields: ({ text = 'Output Selector Fields' }) => (
    <Link
      to="/api/createSelector#output-selector-fields"
      title="Output Selector Fields"
    >
      {text}
    </Link>
  ),
  CreateSelector: () => (
    <Link to="/api/createSelector" title="createSelector">
      <code>createSelector</code>
    </Link>
  ),
  CreateSelectorCreator: () => (
    <Link to="/api/createSelectorCreator" title="createSelectorCreator">
      <code>createSelectorCreator</code>
    </Link>
  ),
  LruMemoize: () => (
    <Link to="/api/lruMemoize" title="lruMemoize">
      <code>lruMemoize</code>
    </Link>
  ),
  WeakMapMemoize: () => (
    <Link to="/api/weakMapMemoize" title="weakMapMemoize">
      <code>weakMapMemoize</code>
    </Link>
  ),
  UnstableAutotrackMemoize: () => (
    <Link to="/api/unstable_autotrackMemoize" title="unstable_autotrackMemoize">
      <code>unstable_autotrackMemoize</code>
    </Link>
  ),
  CreateStructuredSelector: () => (
    <Link to="/api/createStructuredSelector" title="createStructuredSelector">
      <code>createStructuredSelector</code>
    </Link>
  )
} as const satisfies Record<string, FC<Props>>
