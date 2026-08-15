/**
 * The number of distinct primitive values a single argument position can
 * accumulate before {@linkcode runCacheSizeCheck} warns about unbounded cache
 * growth.
 *
 * @since 5.3.0
 * @internal
 */
export const CACHE_SIZE_CHECK_THRESHOLD = 1000

/**
 * Warns that a `weakMapMemoize`-memoized function has accumulated a large
 * number of results keyed by primitive arguments. Unlike results keyed by
 * objects, which live in `WeakMap`s and are released once the key becomes
 * unreachable, results keyed by primitives are held strongly in regular
 * `Map`s and stay in memory for as long as the memoized function itself is
 * alive. A function that keeps seeing new primitive values (ids, offsets,
 * page numbers) therefore grows its cache without bound.
 *
 * @param cacheSize - The number of distinct primitive values cached for the argument position that passed the threshold.
 * @param funcName - The name of the function that was memoized, if it has one.
 *
 * @see {@link https://github.com/reduxjs/reselect/issues/635 `weakMapMemoize` memory usage discussion}
 *
 * @since 5.3.0
 * @internal
 */
export const runCacheSizeCheck = (cacheSize: number, funcName: string) => {
  let stack: string | undefined = undefined
  try {
    throw new Error()
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi, no-extra-semi
    ;({ stack } = e as Error)
  }
  console.warn(
    `A function memoized with weakMapMemoize${
      funcName ? ` (\`${funcName}\`)` : ''
    } has seen over ${cacheSize} distinct values for the same primitive argument position.` +
      '\nResults keyed by primitive arguments are held strongly and are only released by `clearCache()`, so this cache will keep growing for as long as the function keeps seeing new values.' +
      '\nIf it is called with ever-changing primitives (ids, offsets, timestamps), pass the `maxSize` option to bound the cache, switch to `lruMemoize`, or call `.clearCache()` at a suitable point.' +
      '\nSee https://reselect.js.org/api/development-only-checks#cachesizecheck for details.',
    { stack }
  )
}
