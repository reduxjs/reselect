import type { Check, SizeLimitConfig } from 'size-limit'
import type { Configuration } from 'webpack'

/**
 * An array of all possible Node environments.
 */
const allNodeEnvs = ['production'] as const

const allPackageEntryPoints = ['./dist/reselect.mjs'] as const

const sizeLimitConfig: SizeLimitConfig = (
  await Promise.all(
    allNodeEnvs.flatMap(nodeEnv => {
      const modifyWebpackConfig = ((config: Configuration) => {
        ;(config.optimization ??= {}).nodeEnv = nodeEnv

        return config
      }) satisfies Check['modifyWebpackConfig']

      return allPackageEntryPoints.map(async (entryPoint, index) => {
        const allNamedImports = Object.keys(await import(entryPoint)).filter(
          namedImport => namedImport !== 'default'
        )

        const sizeLimitConfigWithDependencies = allNamedImports
          .map<Check>((namedImport, namedImportIndex) => ({
            path: entryPoint,
            name: `${index + 1}-${
              namedImportIndex + 1
            }. import { ${namedImport} } from "${entryPoint}" ('${nodeEnv}' mode)`,
            import: `{ ${namedImport} }`,
            modifyWebpackConfig
          }))
          .concat([
            {
              path: entryPoint,
              name: `${index + 1}-${
                allNamedImports.length + 1
              }. import * from "${entryPoint}" ('${nodeEnv}' mode)`,
              import: '*',
              modifyWebpackConfig
            },
            {
              path: entryPoint,
              name: `${index + 1}-${
                allNamedImports.length + 2
              }. import "${entryPoint}" ('${nodeEnv}' mode)`,
              modifyWebpackConfig
            }
          ])

        return sizeLimitConfigWithDependencies
      })
    })
  )
).flat()

export default sizeLimitConfig
