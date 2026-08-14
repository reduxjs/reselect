import type { FallbackIfUnknown, IfUnknown, IsAny } from '@internal/types'
import { createSelector } from 'reselect'
import { describe, expectTypeOf, test } from 'vitest'

/**
 * Every property is optional, which makes this a "weak type": with
 * `strictNullChecks: false`, `undefined` inhabits every type, so such a type
 * demands nothing and `unknown extends WeakConfig` holds. An assignability-only
 * check therefore mistakes it for `unknown`.
 *
 * These assertions are deliberately setting-independent, and this file is
 * checked twice: under `strict` through the vitest typecheck run, and under
 * `strictNullChecks: false` through `tsconfig.looseNullChecks.json`.
 */
interface WeakConfig {
  showHeader?: boolean
  nested?: { enabled?: boolean }
}

interface RootState {
  config: WeakConfig
}

const state: RootState = { config: {} }

const selectConfig = (rootState: RootState): WeakConfig => rootState.config

const selectUnknown = (rootState: RootState): unknown => rootState.config

describe('IsAny', () => {
  test('holds for `any` and nothing else', () => {
    expectTypeOf<IsAny<any>>().toEqualTypeOf<true>()
    expectTypeOf<IsAny<unknown>>().toEqualTypeOf<false>()
    expectTypeOf<IsAny<never>>().toEqualTypeOf<false>()
    expectTypeOf<IsAny<WeakConfig>>().toEqualTypeOf<false>()
  })
})

describe('IfUnknown', () => {
  test('takes the fallback branch for `unknown` only', () => {
    expectTypeOf<
      IfUnknown<unknown, 'fallback', 'kept'>
    >().toEqualTypeOf<'fallback'>()
    expectTypeOf<IfUnknown<any, 'fallback', 'kept'>>().toEqualTypeOf<'kept'>()
    expectTypeOf<IfUnknown<never, 'fallback', 'kept'>>().toEqualTypeOf<'kept'>()
    expectTypeOf<
      IfUnknown<string, 'fallback', 'kept'>
    >().toEqualTypeOf<'kept'>()
    expectTypeOf<
      IfUnknown<{ showHeader: boolean }, 'fallback', 'kept'>
    >().toEqualTypeOf<'kept'>()
  })

  test('does not treat a type whose properties are all optional as `unknown`', () => {
    expectTypeOf<
      IfUnknown<WeakConfig, 'fallback', 'kept'>
    >().toEqualTypeOf<'kept'>()
    expectTypeOf<
      FallbackIfUnknown<WeakConfig, any>
    >().toEqualTypeOf<WeakConfig>()
  })

  test('still falls back for `unknown`', () => {
    expectTypeOf<FallbackIfUnknown<unknown, any>>().toBeAny()
  })
})

describe('combiner argument inference', () => {
  test('keeps a dependency result whose properties are all optional', () => {
    const selectFromWeak = createSelector([selectConfig], config => config)

    expectTypeOf(selectFromWeak.resultFunc)
      .parameter(0)
      .toEqualTypeOf<WeakConfig>()
    expectTypeOf(selectFromWeak(state)).toEqualTypeOf<WeakConfig>()
  })

  test('still widens an `unknown` dependency result to `any`', () => {
    const selectFromUnknown = createSelector([selectUnknown], value => value)

    expectTypeOf(selectFromUnknown.resultFunc).parameter(0).toBeAny()
  })
})
