import js from '@eslint/js'
import vitestPlugin from '@vitest/eslint-plugin'
import prettierConfig from 'eslint-config-prettier/flat'
import type { ConfigArray } from 'typescript-eslint'
import { config, configs, parser } from 'typescript-eslint'

const eslintConfig: ConfigArray = config(
  {
    name: 'global-ignores',
    ignores: [
      '**/dist/',
      '**/build/',
      '**/lib/',
      '**/coverage/',
      '**/__snapshots__/',
      '**/temp/',
      '**/.temp/',
      '**/.tmp/',
      '**/.yalc/',
      '**/.yarn/',
      '**/.docusaurus/',
      '**/.next/',
      '**/__testfixtures__/',
    ],
  },
  {
    name: `${js.meta.name}/recommended`,
    ...js.configs.recommended,
  },

  configs.recommended,
  configs.stylistic,

  vitestPlugin.configs.recommended,
  vitestPlugin.configs.env,

  {
    name: 'main',
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        2,
        {
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        2,
        { fixMixedExportsWithInlineTypeSpecifier: false },
      ],
      '@typescript-eslint/no-explicit-any': [
        2,
        {
          fixToUnknown: false,
          ignoreRestArgs: false,
        },
      ],
      '@typescript-eslint/no-empty-object-type': [
        2,
        {
          allowInterfaces: 'never',
          allowObjectTypes: 'never',
        },
      ],
      '@typescript-eslint/no-restricted-types': [
        2,
        {
          types: {
            '{}': {
              message: `
- If you want to represent an empty object, use \`type EmptyObject = Record<string, never>\`.
- If you want to represent an object literal, use either \`type AnyObject = Record<string, any>\` or \`object\`.
- If you want to represent any non-nullish value, use \`type AnyNonNullishValue = NonNullable<unknown>\`.`,
              suggest: [
                'AnyNonNullishValue',
                'EmptyObject',
                'AnyObject',
                'object',
                'Record<string, never>',
                'Record<string, any>',
                'NonNullable<unknown>',
              ],
            },
          },
        },
      ],
      '@typescript-eslint/no-namespace': [
        2,
        {
          allowDeclarations: false,
          allowDefinitionFiles: true,
        },
      ],
      '@typescript-eslint/consistent-type-definitions': [2, 'type'],
      'sort-imports': [
        2,
        {
          allowSeparatedGroups: true,
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],
      '@typescript-eslint/unified-signatures': [
        2,
        {
          ignoreDifferentlyNamedParameters: false,
          ignoreOverloadsWithDifferentJSDoc: false,
        },
      ],
      '@typescript-eslint/no-unnecessary-type-parameters': [2],
      '@typescript-eslint/no-invalid-void-type': [
        2,
        {
          allowAsThisParameter: false,
          allowInGenericTypeArguments: true,
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        2,
        {
          ignoreArrowShorthand: false,
          ignoreVoidOperator: false,
          ignoreVoidReturningFunctions: false,
        },
      ],
      '@typescript-eslint/no-duplicate-type-constituents': [
        2,
        {
          ignoreIntersections: false,
          ignoreUnions: false,
        },
      ],
      '@typescript-eslint/require-await': [2],
      '@typescript-eslint/no-redundant-type-constituents': [2],
      '@typescript-eslint/no-unnecessary-type-arguments': [2],
      '@typescript-eslint/no-unnecessary-type-assertion': [
        2,
        { typesToIgnore: [] },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        2,
        {
          allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
          ignoreBooleanCoercion: false,
          ignoreConditionalTests: true,
          ignoreIfStatements: false,
          ignoreMixedLogicalExpressions: false,
          ignorePrimitives: {
            bigint: false,
            boolean: false,
            number: false,
            string: false,
          },
          ignoreTernaryTests: false,
        },
      ],
      '@typescript-eslint/no-inferrable-types': [
        2,
        {
          ignoreParameters: false,
          ignoreProperties: false,
        },
      ],
      '@typescript-eslint/no-require-imports': [
        2,
        {
          allow: [],
          allowAsImport: true,
        },
      ],
      'object-shorthand': [
        2,
        'always',
        {
          avoidQuotes: true,
          ignoreConstructors: true,
          methodsIgnorePattern: '',
          avoidExplicitReturnArrows: true,
        },
      ],

      'no-undef': [0, { typeof: false }],
      '@typescript-eslint/no-unused-vars': [
        0,
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/ban-ts-comment': [
        0,
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 3,
        },
      ],

      'vitest/valid-title': [0],

      'vitest/no-alias-methods': [2],
      'vitest/no-disabled-tests': [2],
      'vitest/no-focused-tests': [2],
      'vitest/no-test-prefixes': [2],
      'vitest/no-test-return-statement': [2],
      'vitest/prefer-each': [2],
      'vitest/prefer-spy-on': [2],
      'vitest/prefer-to-be': [2],
      'vitest/prefer-to-contain': [2],
      'vitest/prefer-to-have-length': [2],
      'vitest/prefer-describe-function-title': [2],
    },

    settings: {
      vitest: {
        typecheck: true,
      },
    },

    linterOptions: {
      reportUnusedDisableDirectives: 2,
    },
  },

  {
    name: 'commonjs-files',
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': [
        0,
        {
          allow: [],
          allowAsImport: false,
        },
      ],
    },
  },

  prettierConfig,
)

export default eslintConfig
