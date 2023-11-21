import type {
  ASTPath,
  CallExpression,
  JSCodeshift,
  Transform
} from 'jscodeshift'

const lastArgIsObject = (j: JSCodeshift, path: ASTPath<CallExpression>) => {
  const lastArg = path.value.arguments[path.value.arguments.length - 1]
  return j.ObjectExpression.check(lastArg)
}

const transform: Transform = (file, api) => {
  const { j } = api

  const root = j(file.source)
  const firstArgIsArray = (path: ASTPath<CallExpression>) => {
    if (path.value.arguments.length < 2) return true
    const [firstArg] = path.value.arguments

    if (j.ArrayExpression.check(firstArg)) return true
    if (!j.Identifier.check(firstArg)) return false

    const variableDeclarators = root.find(j.VariableDeclarator, {
      id: { name: firstArg.name },
      init: { expression: { type: 'ArrayExpression' } }
    })

    const firstArgVariableDeclaration = variableDeclarators.nodes()[0]

    return (
      !!variableDeclarators.size() ||
      (j.VariableDeclarator.check(firstArgVariableDeclaration) &&
        j.ArrayExpression.check(firstArgVariableDeclaration.init))
    )
  }
  const selectorCreators = root.find(j.VariableDeclaration, {
    declarations: [{ init: { callee: { name: 'createSelectorCreator' } } }]
  })
  selectorCreators.forEach(selectorCreator => {
    const selectorCreatorDeclarator = selectorCreator.value.declarations[0]
    if (
      j.VariableDeclarator.check(selectorCreatorDeclarator) &&
      j.Identifier.check(selectorCreatorDeclarator.id)
    ) {
      const selectorCreatorName = selectorCreatorDeclarator.id.name
      root
        .find(j.CallExpression)
        .filter(
          ({ value }) =>
            j.Identifier.check(value.callee) &&
            (value.callee.name === selectorCreatorName ||
              value.callee.name === 'createSelector')
        )
        .filter(path => !firstArgIsArray(path))
        .replaceWith(path => {
          const { arguments: args, callee } = path.value
          return j.callExpression(
            j.identifier(
              j.Identifier.check(callee) ? callee.name : selectorCreatorName
            ),
            lastArgIsObject(j, path)
              ? [
                  j.arrayExpression(args.slice(0, -2)),
                  args[args.length - 2],
                  args[args.length - 1]
                ]
              : [j.arrayExpression(args.slice(0, -1)), args[args.length - 1]]
          )
        })
    }
  })
  return root.toSource({ arrowParensAlways: true })
}

export const parser = 'tsx'

export default transform
