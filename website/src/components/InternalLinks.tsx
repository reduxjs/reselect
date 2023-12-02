import Link from '@docusaurus/Link'
import { FC } from 'react'

interface Props {
  readonly text: string
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
      to="/debugging-tools/output-selector-fields"
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
    <Link to="/api/memoization-functions/lruMemoize" title="lruMemoize">
      <code>lruMemoize</code>
    </Link>
  ),
  WeakMapMemoize: () => (
    <Link to="/api/memoization-functions/weakMapMemoize" title="weakMapMemoize">
      <code>weakMapMemoize</code>
    </Link>
  ),
  UnstableAutotrackMemoize: () => (
    <Link
      to="/api/memoization-functions/unstable_autotrackMemoize"
      title="unstable_autotrackMemoize"
    >
      <code>unstable_autotrackMemoize</code>
    </Link>
  ),
  CreateStructuredSelector: () => (
    <Link to="/api/createStructuredSelector" title="createStructuredSelector">
      <code>createStructuredSelector</code>
    </Link>
  )
} as const satisfies Record<string, FC<Props>>
