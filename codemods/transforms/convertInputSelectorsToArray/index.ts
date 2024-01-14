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

interface NamedFunctionCallExpression extends CallExpression {
  callee: Identifier
}

interface NamedVariableDeclarator extends VariableDeclarator {
  id: Identifier
}

interface NamedVariableDeclaration extends VariableDeclaration {
  declarations: NamedVariableDeclarator[]
}

const CREATE_SELECTOR_CREATOR = 'createSelectorCreator'

const CREATE_SELECTOR = 'createSelector'

const isNamedFunctionCallExpression = (
  j: JSCodeshift,
  path: ASTPath<CallExpression>
): path is ASTPath<NamedFunctionCallExpression> => {
  return j.Identifier.check(path.value.callee)
}

const isNamedVariableDeclaration = (
  j: JSCodeshift,
  path: ASTPath<VariableDeclaration>
): path is ASTPath<NamedVariableDeclaration> => {
  const [selectorCreatorDeclarator] = path.value.declarations

  return (
    j.VariableDeclarator.check(selectorCreatorDeclarator) &&
    j.Identifier.check(selectorCreatorDeclarator.id)
  )
}

const collectSelectorCreators = (j: JSCodeshift, root: Collection) => {
  return root
    .find(j.VariableDeclaration)
    .filter(
      (
        variableDeclaration
      ): variableDeclaration is ASTPath<NamedVariableDeclaration> => {
        return isNamedVariableDeclaration(j, variableDeclaration)
      }
    )
    .filter(
      (namedVariableDeclaration) =>
        j.CallExpression.check(
          namedVariableDeclaration.value.declarations[0].init
        ) &&
        j.Identifier.check(
          namedVariableDeclaration.value.declarations[0].init.callee
        ) &&
        namedVariableDeclaration.value.declarations[0].init.callee.name ===
          CREATE_SELECTOR_CREATOR
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

const collectSelectorCreatorsNamesWithTypes = (
  j: JSCodeshift,
  root: Collection
) => {
  const selectorCreatorsNamesWithTypes: string[] = []

  const selectorCreatorsNames = collectSelectorCreatorsNames(j, root)

  root.find(j.VariableDeclarator).forEach((path) => {
    if (
      j.CallExpression.check(path.value.init) &&
      j.Identifier.check(path.value.id) &&
      j.MemberExpression.check(path.value.init.callee) &&
      j.Identifier.check(path.value.init.callee.property) &&
      ((j.Identifier.check(path.value.init.callee.object) &&
        selectorCreatorsNames.includes(path.value.init.callee.object.name)) ||
        (j.CallExpression.check(path.value.init.callee.object) &&
          j.Identifier.check(path.value.init.callee.object.callee) &&
          path.value.init.callee.object.callee.name ===
            CREATE_SELECTOR_CREATOR))
    ) {
      selectorCreatorsNamesWithTypes.push(path.value.id.name)
    }
  })

  return selectorCreatorsNamesWithTypes.concat(selectorCreatorsNames)
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

  const allNamedFunctionCallExpressions = root
    .find(j.CallExpression)
    .filter((path): path is ASTPath<NamedFunctionCallExpression> => {
      return isNamedFunctionCallExpression(j, path)
    })

  const selectorCreatorsNames = collectSelectorCreatorsNamesWithTypes(j, root)

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

  const needsToBeTransformed = allNamedFunctionCallExpressions.filter(
    (path) =>
      selectorCreatorsNames.includes(path.value.callee.name) &&
      !isFirstArgumentArray(path)
  )

  if (needsToBeTransformed.length === 0) {
    return file.source
  }

  needsToBeTransformed.replaceWith((path) => {
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
