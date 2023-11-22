import Link from '@docusaurus/Link'
import { FC } from 'react'

export const ExternalLinks = {
  WeakMap: () => (
    <Link
      to="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap"
      title="WeakMap"
    >
      WeakMap
    </Link>
  ),
  ReferenceEqualityCheck: () => (
    <Link
      to="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality"
      title="Reference Equality Check"
    >
      Reference Equality Check
    </Link>
  ),
  Memoization: () => (
    <Link to="https://en.wikipedia.org/wiki/Memoization" title="Memoization">
      memoization
    </Link>
  ),
  IdentityFunction: () => (
    <Link
      to="https://en.wikipedia.org/wiki/Identity_function"
      title="Identity Function"
    >
      Identity Function
    </Link>
  ),
  UseMemo: () => (
    <Link
      to="https://react.dev/reference/react/useMemo#usememo"
      title="useMemo"
    >
      useMemo
    </Link>
  ),
  UseCallback: () => (
    <Link
      to="https://react.dev/reference/react/useCallback#usecallback"
      title="useCallback"
    >
      useCallback
    </Link>
  ),
  ReReselect: () => (
    <Link to="https://github.com/toomuchdesign/re-reselect" title="re-reselect">
      re-reselect
    </Link>
  ),
  Redux: () => (
    <Link to="https://redux.js.org" title="Redux">
      Redux
    </Link>
  ),
  React: () => (
    <Link to="https://react.dev" title="React">
      React
    </Link>
  ),
  ReactRedux: () => (
    <Link to="https://react-redux.js.org" title="React-Redux">
      React-Redux
    </Link>
  ),
  ReduxToolkit: () => (
    <Link to="https://redux-toolkit.js.org" title="Redux-Toolkit">
      Redux-Toolkit
    </Link>
  )
} as const satisfies Record<string, FC>
