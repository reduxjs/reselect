import { Project } from 'ts-simple-ast';

const project = new Project();

const typings = project.addExistingSourceFile('lib/index.d.ts');

for (let i = 2; i < 12; i++) {
  const [stateTypeParameters, propsTypeParameters, resultTypeParameters] = [
    'S',
    'P',
    'R'
  ].map(prefix =>
    new Array(i).fill(prefix).map((name, index) => `${name}${index + 1}`)
  );

  const dependenciesTypes = new Array(i)
    .fill(undefined)
    .map(
      (name, index) =>
        `Selector<${stateTypeParameters[index]}, ${
          resultTypeParameters[index]
        }>`
    );

  const parametricDependenciesTypes = new Array(i)
    .fill(undefined)
    .map(
      (name, index) =>
        `ParametricSelector<${stateTypeParameters[index]}, ${
          propsTypeParameters[index]
        }, ${resultTypeParameters[index]}>`
    );

  const combinerParameterTypes = resultTypeParameters.map(
    (parameter, index) => `result${index + 1}: ${parameter}`
  );

  const parameters = dependenciesTypes.map((dependencyType, index) => ({
    name: `selector${index + 1}`,
    type: dependencyType
  }));

  const parametricParameters = parametricDependenciesTypes.map(
    (dependencyType, index) => ({
      name: `selector${index + 1}`,
      type: dependencyType
    })
  );

  const combinerType = `(${combinerParameterTypes.join()}) => T`;

  // simple createSelector
  typings.addFunction({
    isExported: true,
    name: 'createSelector',
    typeParameters: [...stateTypeParameters, ...resultTypeParameters, 'T'],
    parameters: [
      ...parameters,
      {
        name: 'combiner',
        type: combinerType
      }
    ],
    returnType: `OutputSelector<${stateTypeParameters.join(
      '&'
    )}, T, ${combinerType}, [${dependenciesTypes.join()}]>`
  });

  // simple createSelector (array argument)
  typings.addFunction({
    isExported: true,
    name: 'createSelector',
    typeParameters: [...stateTypeParameters, ...resultTypeParameters, 'T'],
    parameters: [
      {
        name: 'selectors',
        type: `[${dependenciesTypes.join()}]`
      },
      {
        name: 'combiner',
        type: combinerType
      }
    ],
    returnType: `OutputSelector<${stateTypeParameters.join(
      '&'
    )}, T, ${combinerType}, [${dependenciesTypes.join()}]>`
  });

  // parametric createSelector
  typings.addFunction({
    isExported: true,
    name: 'createSelector',
    typeParameters: [
      ...stateTypeParameters,
      ...propsTypeParameters,
      ...resultTypeParameters,
      'T'
    ],
    parameters: [
      ...parametricParameters,
      {
        name: 'combiner',
        type: combinerType
      }
    ],
    returnType: `OutputParametricSelector<${stateTypeParameters.join(
      '&'
    )}, ${propsTypeParameters.join(
      '&'
    )}, T, ${combinerType}, [${parametricDependenciesTypes.join()}]>`
  });

  // parametric createSelector (array argument)
  typings.addFunction({
    isExported: true,
    name: 'createSelector',
    typeParameters: [
      ...stateTypeParameters,
      ...propsTypeParameters,
      ...resultTypeParameters,
      'T'
    ],
    parameters: [
      {
        name: 'selectors',
        type: `[${parametricDependenciesTypes.join()}]`
      },
      {
        name: 'combiner',
        type: combinerType
      }
    ],
    returnType: `OutputParametricSelector<${stateTypeParameters.join(
      '&'
    )}, ${propsTypeParameters.join(
      '&'
    )}, T, ${combinerType}, [${parametricDependenciesTypes.join()}]>`
  });
}

project.save().then(() => {
  console.log('Additional types generated');
});
