import Link from '@docusaurus/Link'
import { FC } from 'react'

interface Props {
  readonly text?: string
}

export const ExternalLinks = {
  WeakMap: ({ text = 'WeakMap' }) => (
    <Link
      to="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap"
      title="WeakMap"
    >
      <code>{text}</code>
    </Link>
  ),
  ReferenceEqualityCheck: ({ text = 'Reference Equality Check' }) => (
    <Link
      to="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality"
      title="Reference Equality Check"
    >
      {text}
    </Link>
  ),
  Memoization: ({ text = 'memoization' }) => (
    <Link to="https://en.wikipedia.org/wiki/Memoization" title="Memoization">
      {text}
    </Link>
  ),
  IdentityFunction: ({ text = 'Identity Function' }) => (
    <Link
      to="https://en.wikipedia.org/wiki/Identity_function"
      title="Identity Function"
    >
      {text}
    </Link>
  ),
  UseMemo: ({ text = 'useMemo' }) => (
    <Link
      to="https://react.dev/reference/react/useMemo#usememo"
      title="useMemo"
    >
      <code>{text}</code>
    </Link>
  ),
  UseCallback: ({ text = 'useCallback' }) => (
    <Link
      to="https://react.dev/reference/react/useCallback#usecallback"
      title="useCallback"
    >
      <code>{text}</code>
    </Link>
  ),
  ReReselect: ({ text = 're-reselect' }) => (
    <Link to="https://github.com/toomuchdesign/re-reselect" title="re-reselect">
      {text}
    </Link>
  ),
  Redux: ({ text = 'Redux' }) => (
    <Link to="https://redux.js.org" title="Redux">
      {text}
    </Link>
  ),
  React: ({ text = 'React' }) => (
    <Link to="https://react.dev" title="React">
      {text}
    </Link>
  ),
  ReactRedux: ({ text = 'React-Redux' }) => (
    <Link to="https://react-redux.js.org" title="React-Redux">
      {text}
    </Link>
  ),
  ReduxToolkit: ({ text = 'Redux-Toolkit' }) => (
    <Link to="https://redux-toolkit.js.org" title="Redux-Toolkit">
      {text}
    </Link>
  )
} as const satisfies Record<string, FC<Props>>

export const AllExternalLinks: FC = () => {
  return (
    <ul>
      {Object.values(ExternalLinks).map((ExternalLink, index) => (
        <li key={index}>
          <b>
            <ExternalLink />
          </b>
        </li>
      ))}
    </ul>
  )
}
