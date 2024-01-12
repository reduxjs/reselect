import type {
  ASTPath,
  ArrayExpression,
  CallExpression,
  Collection,
  Identifier,
  JSCodeshift,
  Transform,
  VariableDeclaration,
  VariableDeclarator
} from 'jscodeshift'

import type { TestOptions } from 'jscodeshift/src/testUtils'

type CallExpressionArgument = CallExpression['arguments'][number]

type FirstArgumentAsArray = [ArrayExpression, ...CallExpressionArgument[]]

interface CallExpressionWithFirstArgumentAsArray
  extends ASTPath<CallExpression> {
  arguments: FirstArgumentAsArray
}

interface SelectorCreator extends CallExpression {
  callee: Identifier
}

interface SelectorCreatorDeclarator extends VariableDeclarator {
  id: Identifier
}

interface SelectorCreatorDeclaration extends VariableDeclaration {
  declarations: SelectorCreatorDeclarator[]
}

const CREATE_SELECTOR_CREATOR = 'createSelectorCreator'

const CREATE_SELECTOR = 'createSelector'

const isSelectorCreator = (
  j: JSCodeshift,
  path: ASTPath<VariableDeclaration>
): path is ASTPath<SelectorCreatorDeclaration> => {
  const [selectorCreatorDeclarator] = path.value.declarations

  return (
    j.VariableDeclarator.check(selectorCreatorDeclarator) &&
    j.Identifier.check(selectorCreatorDeclarator.id)
  )
}

const collectSelectorCreators = (j: JSCodeshift, root: Collection) => {
  return root
    .find(j.VariableDeclaration, {
      declarations: [{ init: { callee: { name: CREATE_SELECTOR_CREATOR } } }]
    })
    .filter(
      (
        variableDeclaration
      ): variableDeclaration is ASTPath<SelectorCreatorDeclaration> =>
        isSelectorCreator(j, variableDeclaration)
    )
}

const collectSelectorCreatorsNames = (j: JSCodeshift, root: Collection) => {
  const selectorCreatorsNames: string[] = [CREATE_SELECTOR]

  const selectorCreators = collectSelectorCreators(j, root)

  selectorCreators.forEach((path) => {
    selectorCreatorsNames.push(path.value.declarations[0].id.name)
  })

  return selectorCreatorsNames
}

const isLastArgumentObject = (
  j: JSCodeshift,
  path: ASTPath<CallExpression>
) => {
  const lastArgument = path.value.arguments[path.value.arguments.length - 1]

  return j.ObjectExpression.check(lastArgument)
}

const transform: Transform = (file, api) => {
  const { j } = api

  const root = j(file.source)

  const allCallExpressions = root
    .find(j.CallExpression)
    .filter((path): path is ASTPath<SelectorCreator> =>
      j.Identifier.check(path.value.callee)
    )

  const selectorCreatorsNames = collectSelectorCreatorsNames(j, root)

  const isFirstArgumentArray = (path: ASTPath<CallExpression>) => {
    if (path.value.arguments.length < 2) return true

    const [firstArgument] = path.value.arguments

    if (j.ArrayExpression.check(firstArgument)) return true

    if (!j.Identifier.check(firstArgument)) return false

    const variableDeclarators = root.find(j.VariableDeclarator, {
      id: { name: firstArgument.name }
    })

    const [firstArgumentVariableDeclarator] = variableDeclarators.nodes()

    if (
      variableDeclarators.size() === 0 ||
      j.ArrayExpression.check(firstArgumentVariableDeclarator.init) ||
      firstArgumentVariableDeclarator?.init == null ||
      ('expression' in firstArgumentVariableDeclarator.init &&
        typeof firstArgumentVariableDeclarator.init.expression === 'object' &&
        'type' in firstArgumentVariableDeclarator.init.expression &&
        j.ArrayExpression.check(
          firstArgumentVariableDeclarator.init.expression
        )) ||
      (j.VariableDeclarator.check(firstArgumentVariableDeclarator) &&
        j.ArrayExpression.check(firstArgumentVariableDeclarator.init))
    ) {
      return true
    }

    return false
  }

  const needsToBeTransformed = allCallExpressions
  .filter(
    (path) =>
      selectorCreatorsNames.includes(path.value.callee.name) &&
      !isFirstArgumentArray(path)
  )

  if (needsToBeTransformed.length === 0) {
    return file.source
  }

  needsToBeTransformed
    .replaceWith((path) => {
      const { arguments: args, callee } = path.value

      const transformedArguments = isLastArgumentObject(j, path)
        ? [
            j.arrayExpression(args.slice(0, -2)),
            args[args.length - 2],
            args[args.length - 1]
          ]
        : [j.arrayExpression(args.slice(0, -1)), args[args.length - 1]]

      return j.callExpression(j.identifier(callee.name), transformedArguments)
    })

  return root.toSource({ lineTerminator: '\n' })
}

export const parser = 'tsx' satisfies TestOptions['parser']

export default transform
