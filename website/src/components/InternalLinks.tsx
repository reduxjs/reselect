import Link from '@docusaurus/Link'
import { FC } from 'react'

interface Props {
  readonly text: string
}

export const InternalLinks = {
  Selector: ({ text = 'selector' }) => (
    <Link to="#selector-function" title="Selector Function">{text}</Link>
  ),
  InputSelectors: ({ text = 'input selectors' }) => (
    <Link to="#input-selectors" title="Input Selectors">{text}</Link>
  ),
  OutputSelector: ({ text = 'output selector' }) => (
    <Link to="#output-selector" title="Output Selector">{text}</Link>
  ),
  ResultFunction: ({ text = 'result function' }) => (
    <Link to="#result-function" title="Result Function">{text}</Link>
  ),
  Dependencies: ({ text = 'dependencies' }) => (
    <Link to="#dependencies" title="Dependencies">{text}</Link>
  ),
  CascadingMemoization: ({ text = 'Cascading Memoization' }) => (
    <Link to="#cascading-memoization" title="Cascading Memoization"><b><i>{text}</i></b></Link>
  ),
  OutputSelectorFields: ({ text = 'Output Selector Fields' }) => (
    <Link to="#output-selector-fields" title="Output Selector Fields">{text}</Link>
  ),
  CreateSelector: () => (
    <Link to="#createselectorinputselectors--inputselectors-resultfunc-createselectoroptions" title="createSelector"><code>createSelector</code></Link>
  ),
  CreateSelectorCreator: () => (
    <Link to="#createselectorcreatormemoize--options-memoizeoptions" title="createSelectorCreator"><code>createSelectorCreator</code></Link>
  ),
  DefaultMemoize: () => (
    <Link to="#defaultmemoizefunc-equalitycheckoroptions--defaultequalitycheck" title="defaultMemoize"><code>defaultMemoize</code></Link>
  ),
  WeakMapMemoize: () => (
    <Link to="#weakmapmemoizefunc---since-500" title="weakMapMemoize"><code>weakMapMemoize</code></Link>
  ),
  UnstableAutotrackMemoize: () => (
    <Link to="#unstable_autotrackmemoizefunc---since-500" title="unstable_autotrackMemoize"><code>unstable_autotrackMemoize</code></Link>
  ),
  CreateStructuredSelector: () => (
    <Link to="#createstructuredselector-inputSelectorsObject--selectorcreator--createselector" title="createStructuredSelector"><code>createStructuredSelector</code></Link>
  )
} as const satisfies Record<string, FC<Props>>
