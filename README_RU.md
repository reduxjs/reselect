# Reselect

[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

Простая библиотека “селекторов” для Redux, вдохновлённая геттерами в [NuclearJS](https://github.com/optimizely/nuclear-js.git), [подписками](https://github.com/Day8/re-frame#just-a-read-only-cursor) в [re-frame](https://github.com/Day8/re-frame) и этим [предложением](https://github.com/reduxjs/redux/pull/169) от [speedskater](https://github.com/speedskater).

* Селекторы могут вычислять производные данные, позволяя Redux сохранять (store) минимально возможное состояние (state).
* Селекторы эффективны. Селектор не производит вычислений, пока один из его аргументов не изменился.
* Селекторы являются составными. Они могут использоваться в качестве входных для других селекторов.

```js
import { createSelector } from "reselect";

const shopItemsSelector = state => state.shop.items;
const taxPercentSelector = state => state.shop.taxPercent;

const subtotalSelector = createSelector(shopItemsSelector, items =>
  items.reduce((acc, item) => acc + item.value, 0)
);

const taxSelector = createSelector(
  subtotalSelector,
  taxPercentSelector,
  (subtotal, taxPercent) => subtotal * (taxPercent / 100)
);

export const totalSelector = createSelector(
  subtotalSelector,
  taxSelector,
  (subtotal, tax) => ({ total: subtotal + tax })
);

let exampleState = {
  shop: {
    taxPercent: 8,
    items: [{ name: "apple", value: 1.2 }, { name: "orange", value: 0.95 }]
  }
};

console.log(subtotalSelector(exampleState)); // 2.15
console.log(taxSelector(exampleState)); // 0.172
console.log(totalSelector(exampleState)); // { total: 2.322 }
```

## Содержание

* [Установка](#Установка)
* [Примеры](#Примеры)
  * [Причины использовать Мемоизированные Селекторы](#Причины-использовать-Мемоизированные-Селекторы)
  * [Создание Мемоизированного Селектора](#Создание-Мемоизированного-Селектора)
  * [Композиция Селекторов](#Композиция-Селекторов)
  * [Подключение Селектора к Redux Store](#Подключение-Селектора-к-redux-store)
  * [Доступ к React Props в Селекторах](#Доступ-к-react-props-в-Селекторах)
  * [Совместное использование селекторов с Props в многокомпонентных вхождениях](#Совместное-использование-селекторов-с-props-в-многокомпонентных-вхождениях)
* [API](#api)
  * [`createSelector`](#createselectorinputselectors--inputselectors-resultfunc)
  * [`defaultMemoize`](#defaultmemoizefunc-equalitycheck-defaultequalitycheck)
  * [`createSelectorCreator`](#createselectorcreatormemoize-memoizeoptions)
  * [`createStructuredSelector`](#createstructuredselectorinputselectors-selectorcreator--createselector)
* [FAQ](#faq)

  * [Почему мой селектор не производит вычисления, когда изменяется входное состояние?](#q-Почему-мой-входной-селектор-не-производит-вычисления-когда-изменяется-входное-состояние)
  * [Почему мой селектор производит перерасчёт когда входное состояние остаётся прежним?](#q-Почему-мой-селектор-производит-перерасчёт-когда-входное-состояние-остаётся-прежним)
  * [Могу ли я использовать Reselect без Redux?](#q-Могу-ли-я-использовать-reselect-без-redux)
  * [Мне не подходит функция мемоизации по умолчанию, можно ли использовать другую?](#q-Мне-не-подходит-функция-мемоизации-по-умолчанию-можно-ли-использовать-другую)
  * [Как протестировать селектор?](#q-Как-протестировать-селектор)
  * [Как создать селектор, который принимает аргумент?](#q-Как-создать-селектор-который-принимает-аргумент)
  * [Как мне использовать Reselect с Immutable.js?](#q-Как-мне-использовать-reselect-с-immutablejs)
  * [Могу ли я использовать селектор в многокомпонентных вхождениях?](#q-Могу-ли-я-использовать-селектор-в-многокомпонентных-вхождениях)
  * [Существуют ли типы TypeScript?](#q-Существуют-ли-типы-typescript)
  * [Как сделать каррированный селектор?](#q-Как-я-могу-сделать-каррированный-селектор)

* [Связанные проекты](#Связанные-проекты)
* [Лицензия](#Лицензия)

## Установка

    npm install reselect

## Примеры

Если Вы предпочитаете видео урок, вы можете найти его [здесь](https://www.youtube.com/watch?v=6Xwo5mVxDqI).

### Причины использовать Мемоизированные Селекторы

> Примеры в этом разделе основаны на [списке задач Redux (Todos List)](http://redux.js.org/docs/basics/UsageWithReact.html).

#### `containers/VisibleTodoList.js`

```js
import { connect } from "react-redux";
import { toggleTodo } from "../actions";
import TodoList from "../components/TodoList";

const getVisibleTodos = (todos, filter) => {
  switch (filter) {
    case "SHOW_ALL":
      return todos;
    case "SHOW_COMPLETED":
      return todos.filter(t => t.completed);
    case "SHOW_ACTIVE":
      return todos.filter(t => !t.completed);
  }
};

const mapStateToProps = state => {
  return {
    todos: getVisibleTodos(state.todos, state.visibilityFilter)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onTodoClick: id => {
      dispatch(toggleTodo(id));
    }
  };
};

const VisibleTodoList = connect(mapStateToProps, mapDispatchToProps)(TodoList);

export default VisibleTodoList;
```

В приведённом выше примере, `mapStateToProps` вызывает `getVisibleTodos` чтобы посчитать `todos`. Это отлично работает, но есть недостаток: `todos` рассчитывается каждый раз, когда компонент обновляется. Если дерево состояний велико, или вычисление требует больших затрат, повторение вычисления при каждом обновлении может привести к проблемам с производительностью. Reselect может помочь избежать этих излишних пересчётов.

### Создание Мемоизированного Селектора

Мы хотели бы заменить `getVisibleTodos` на мемоизированный селектор, который пересчитывает `todos` когда значение `state.todos` или `state.visibilityFilter` изменяется, но не тогда когда изменения происходят в других (независимых) частях дерева состояний.

Reselect предоставляет функцию `createSelector` для создания мемоизированных селекторов. В качестве аргументов `createSelector` принимает массив входных селекторов и функцию преобразования. Если дерево состояний Redux изменится таким образом, что послужит причиной изменения значения входного селектора, селектор вызовет свою функцию преобразования со значениями входных селекторов в качестве аргументов и вернёт результат. Если значения входных селекторов такие же как и в предыдущем вызове селектора, он вернёт ранее вычисленное значение, вместо того чтобы вызывать функцию преобразования.

Давайте определим мемоизированный селектор с именем `getVisibleTodos` на замену мемоизированной версии выше:

#### `selectors/index.js`

```js
import { createSelector } from "reselect";

const getVisibilityFilter = state => state.visibilityFilter;
const getTodos = state => state.todos;

export const getVisibleTodos = createSelector(
  [getVisibilityFilter, getTodos],
  (visibilityFilter, todos) => {
    switch (visibilityFilter) {
      case "SHOW_ALL":
        return todos;
      case "SHOW_COMPLETED":
        return todos.filter(t => t.completed);
      case "SHOW_ACTIVE":
        return todos.filter(t => !t.completed);
    }
  }
);
```

В примере выше, `getVisibilityFilter` и `getTodos` это входные селекторы. Они создаются как обычные не мемоизированные селекторные функции, потому что они не преобразуют данные, которые они выбирают. Что же касается `getVisibleTodos` - это мемоизированный селектор. Он принимает `getVisibilityFilter` и `getTodos` в качестве входных селекторов, и функцию преобразования, которая вычисляет отфильтрованный список задач (todos list).

### Композиция Селекторов

Мемоизированный селектор сам по себе может быть входным селектором для другого мемоизированного селектора. Здесь `getVisibleTodos` используется в качестве входного селектора для селектора, который затем фильтрует todos по ключевому слову:

```js
const getKeyword = state => state.keyword;

const getVisibleTodosFilteredByKeyword = createSelector(
  [getVisibleTodos, getKeyword],
  (visibleTodos, keyword) =>
    visibleTodos.filter(todo => todo.text.includes(keyword))
);
```

### Подключение Селектора к Redux Store

Если Вы используете [React Redux](https://github.com/reduxjs/react-redux), Вы можете вызывать селекторы в качестве регулярных функций внутри `mapStateToProps()`:

#### `containers/VisibleTodoList.js`

```js
import { connect } from "react-redux";
import { toggleTodo } from "../actions";
import TodoList from "../components/TodoList";
import { getVisibleTodos } from "../selectors";

const mapStateToProps = state => {
  return {
    todos: getVisibleTodos(state)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onTodoClick: id => {
      dispatch(toggleTodo(id));
    }
  };
};

const VisibleTodoList = connect(mapStateToProps, mapDispatchToProps)(TodoList);

export default VisibleTodoList;
```

### Доступ к React Props в Селекторах

> В этом разделе предоставлено гипотетическое расширение нашего приложения, которое позволяет ему поддерживать любое количество списков задач (Todo Lists). Пожалуйста, обратите внимание, полная реализация этого расширения требует изменений в редюсерах (reducers), компонентах (components), действиях (actions) и т.д., которые не имеют прямого отношения к обсуждаемым темам и для краткости были опущены.

До сих пор мы видели что селекторы получают состояние хранилище (store state) Redux в качестве аргумента, но селектор также может получать props.

Вот компонент `App`, который отображает три `VisibleTodoList` компонента, каждый из которых имеет `listId` prop:

#### `components/App.js`

```js
import React from "react";
import Footer from "./Footer";
import AddTodo from "../containers/AddTodo";
import VisibleTodoList from "../containers/VisibleTodoList";

const App = () => (
  <div>
    <VisibleTodoList listId="1" />
    <VisibleTodoList listId="2" />
    <VisibleTodoList listId="3" />
  </div>
);
```

Каждый `VisibleTodoList` контейнер должен выбирать различный срез состояния (state) в зависимости от значения `listId` prop, поэтому давайте модифицируем `getVisibilityFilter` и `getTodos` для приёма аргумента props:

#### `selectors/todoSelectors.js`

```js
import { createSelector } from "reselect";

const getVisibilityFilter = (state, props) =>
  state.todoLists[props.listId].visibilityFilter;

const getTodos = (state, props) => state.todoLists[props.listId].todos;

const getVisibleTodos = createSelector(
  [getVisibilityFilter, getTodos],
  (visibilityFilter, todos) => {
    switch (visibilityFilter) {
      case "SHOW_COMPLETED":
        return todos.filter(todo => todo.completed);
      case "SHOW_ACTIVE":
        return todos.filter(todo => !todo.completed);
      default:
        return todos;
    }
  }
);

export default getVisibleTodos;
```

`props` может быть передан `getVisibleTodos` из `mapStateToProps`:

```js
const mapStateToProps = (state, props) => {
  return {
    todos: getVisibleTodos(state, props)
  };
};
```

Итак, теперь `getVisibleTodos` имеет доступ к `props`, и всё кажется работает нормально.

**Но есть проблема!**

Использование селектора `getVisibleTodos` с множественными вхождениями контейнера `VisibleTodoList` не будет правильно мемоизировано:

#### `containers/VisibleTodoList.js`

```js
import { connect } from "react-redux";
import { toggleTodo } from "../actions";
import TodoList from "../components/TodoList";
import { getVisibleTodos } from "../selectors";

const mapStateToProps = (state, props) => {
  return {
    // ВНИМАНИЕ: СЛЕДУЮЩИЙ СЕЛЕКТОР МЕМОИЗИРУЕТСЯ НЕ ПРАВИЛЬНО
    todos: getVisibleTodos(state, props)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onTodoClick: id => {
      dispatch(toggleTodo(id));
    }
  };
};

const VisibleTodoList = connect(mapStateToProps, mapDispatchToProps)(TodoList);

export default VisibleTodoList;
```

Селектор созданный с помощью `createSelector` возвращает только кэшированное значение, когда его набор аргументов совпадает с предыдущим набором аргументов. Если мы отображаем поочерёдно `<VisibleTodoList listId="1" />` и `<VisibleTodoList listId="2" />`, общий селектор будет поочерёдно принимать `{listId: 1}` и `{listId: 2}` как аргумент `props`. Это приведёт к тому что аргументы будут разными для каждого вызова, поэтому селектор всегда будет производить вычисления, вместо того чтобы возвращать кэшированное значение. Мы увидим как преодолеть это ограничение в следующем разделе.

### Совместное использование селекторов с Props в многокомпонентных вхождениях

> Примеры в этом разделе требуют React Redux v4.3.0 или выше  
> Альтернативный подход можно найти в [re-reselect](https://github.com/toomuchdesign/re-reselect)

Чтобы совместно использовать селектор для нескольких вхождений `VisibleTodoList` при передаче в `props` **и** сохранять мемоизацию, каждому вхождению компонента нужна собственная личная копия селектора.

Давайте создадим функцию `makeGetVisibleTodos`, которая возвращает новую копию селектора `getVisibleTodos` при каждом вызове:

#### `selectors/todoSelectors.js`

```js
import { createSelector } from "reselect";

const getVisibilityFilter = (state, props) =>
  state.todoLists[props.listId].visibilityFilter;

const getTodos = (state, props) => state.todoLists[props.listId].todos;

const makeGetVisibleTodos = () => {
  return createSelector(
    [getVisibilityFilter, getTodos],
    (visibilityFilter, todos) => {
      switch (visibilityFilter) {
        case "SHOW_COMPLETED":
          return todos.filter(todo => todo.completed);
        case "SHOW_ACTIVE":
          return todos.filter(todo => !todo.completed);
        default:
          return todos;
      }
    }
  );
};

export default makeGetVisibleTodos;
```

Нам также нужен способ предоставить каждому экземпляру контейнера доступ к его собственному селектору. Аргумент `mapStateToProps` от `connect` может помочь в этом.

**Если аргумент `mapStateToProps` предоставленный `connect` возвращает функцию вместо объекта, он будет использоваться для создания отдельной функции `mapStateToProps` для каждого экземпляра контейнера.**

В приведённом ниже примере `makeMapStateToProps` создаёт новый `getVisibleTodos` селектор, и возвращает функцию `mapStateToProps`, которая имеет эксклюзивный доступ к новому селектору:

```js
const makeMapStateToProps = () => {
  const getVisibleTodos = makeGetVisibleTodos();
  const mapStateToProps = (state, props) => {
    return {
      todos: getVisibleTodos(state, props)
    };
  };
  return mapStateToProps;
};
```

Если мы передадим `makeMapStateToProps`  `connect`, каждый экземпляр контейнера `VisibleTodosList` получит свою собственную функцию `mapStateToProps` с собственным селектором `getVisibleTodos`. Мемоизация теперь будет работать правильно, независимо от порядка отображения контейнеров `VisibleTodoList`.

#### `containers/VisibleTodoList.js`

```js
import { connect } from "react-redux";
import { toggleTodo } from "../actions";
import TodoList from "../components/TodoList";
import { makeGetVisibleTodos } from "../selectors";

const makeMapStateToProps = () => {
  const getVisibleTodos = makeGetVisibleTodos();
  const mapStateToProps = (state, props) => {
    return {
      todos: getVisibleTodos(state, props)
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = dispatch => {
  return {
    onTodoClick: id => {
      dispatch(toggleTodo(id));
    }
  };
};

const VisibleTodoList = connect(makeMapStateToProps, mapDispatchToProps)(
  TodoList
);

export default VisibleTodoList;
```

## API

### createSelector(...inputSelectors | [inputSelectors], resultFunc)

Принимает один или несколько селекторов, или массив селекторов, вычисляет их значения и передаёт их в качестве аргументов `resultFunc`.

`createSelector` при помощи строгого равенства (`===`) определяет, изменилось ли значение, возвращаемое входным селектором при каждом вызове. Входные данные для селекторов, созданных с помощью `createSelector` должны быть неизменяемыми.

Селекторы, созданные с помощью `createSelector` имеют размер кеша 1. Это означает, что они всегда пересчитываются, когда изменяется значение входного селектора, так как селектор сохраняет только своё предыдущее значение каждого входного селектора.

```js
const mySelector = createSelector(
  state => state.values.value1,
  state => state.values.value2,
  (value1, value2) => value1 + value2
);

// Вы также можете передать массив селекторов
const totalSelector = createSelector(
  [state => state.values.value1, state => state.values.value2],
  (value1, value2) => value1 + value2
);
```

Может быть полезно получить доступ к props компонента внутри селектора. Когда селектор подключен к компоненту с `connect`, props компонента передаются в качестве второго аргумента в селектор:

```js
const abSelector = (state, props) => state.a * props.b;

// только props (игнорирование аргумента state)
const cSelector = (_, props) => props.c;

// только state (аргумент props опущен, так как не требуется)
const dSelector = state => state.d;

const totalSelector = createSelector(
  abSelector,
  cSelector,
  dSelector,
  (ab, c, d) => ({
    total: ab + c + d
  })
);
```

### defaultMemoize(func, equalityCheck = defaultEqualityCheck)

`defaultMemoize` запоминает (мемоизирует) функцию, переданную в параметре func. Это мемоизирующая функция, используемая `createSelector`.

`defaultMemoize` имеет размер кеша 1. Это значит, что он всегда пересчитывается, когда значение аргумента изменяется.

`defaultMemoize` определяет, изменился ли аргумент, вызывая функцию `equalityCheck`. Поскольку `defaultMemoize` предназначен для использования с неизменяемыми данными, функция по умолчанию `equalityCheck` проверяет наличие изменений с использованием строгого равенства:

```js
function defaultEqualityCheck(currentVal, previousVal) {
  return currentVal === previousVal;
}
```

`defaultMemoize` может использовать `createSelectorCreator`, чтобы [кастомизировать функцию `equalityCheck`](#Настройте-equalitycheck-для-defaultmemoize).

### createSelectorCreator(memoize, ...memoizeOptions)

`createSelectorCreator` может использоваться для создания кастомной версии `createSelector`.

Аргумент `memoize` является функцией мемоизации для замены `defaultMemoize`.

Rest параметры `...memoizeOptions` это нулевые или добавочные параметры конфигурации, которые будут переданы в `memoizeFunc`. Селекторы `resultFunc` передаются как первый аргумент `memoize`, а `memoizeOptions` передаются как второй аргумент:

```js
const customSelectorCreator = createSelectorCreator(
  customMemoize, // функция, которая будет использоваться для мемоизации resultFunc
  option1, // option1 будет передан как второй аргумент customMemoize
  option2, // option2 будет передан как третий аргумент customMemoize
  option3 // option3 будет передан как четвёртый аргумент customMemoize
);

const customSelector = customSelectorCreator(
  input1,
  input2,
  resultFunc // resultFunc будет передан как первый аргумент customMemoize
);
```

Внутренний `customSelector` вызывает функцию мемоизации следующим образом:

```js
customMemoize(resultFunc, option1, option2, option3);
```

Вот несколько примеров того, как вы можете использовать `createSelectorCreator`:

#### Настройте `equalityCheck` для `defaultMemoize`

```js
import { createSelectorCreator, defaultMemoize } from "reselect";
import isEqual from "lodash.isEqual";

// создайте «конструктор селекторов», который использует lodash.isEqual вместо ===
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual);

// используйте новый «конструктор селекторов», чтобы создать селектор
const mySelector = createDeepEqualSelector(
  state => state.values.filter(val => val < 5),
  values => values.reduce((acc, val) => acc + val, 0)
);
```

#### Используйте функцию memoize из lodash для неограниченного кеша

```js
import { createSelectorCreator } from "reselect";
import memoize from "lodash.memoize";

let called = 0;
const hashFn = (...args) =>
  args.reduce((acc, val) => acc + "-" + JSON.stringify(val), "");
const customSelectorCreator = createSelectorCreator(memoize, hashFn);
const selector = customSelectorCreator(
  state => state.a,
  state => state.b,
  (a, b) => {
    called++;
    return a + b;
  }
);
```

### createStructuredSelector({inputSelectors}, selectorCreator = createSelector)

`createStructuredSelector` это вспомогательная функция для общего шаблона, который реализовывается в случае использования Reselect. Селектор, переданный декоратору `connect`, часто просто принимает значения его входных селекторов и сопоставляет их с ключами в объекте:

```js
const mySelectorA = state => state.a;
const mySelectorB = state => state.b;

// Результирующая функция в следующем селекторе
// это просто создание объекта из входных селекторов
const structuredSelector = createSelector(
  mySelectorA,
  mySelectorB,
  mySelectorC,
  (a, b, c) => ({
    a,
    b,
    c
  })
);
```

`createStructuredSelector` принимает объект, свойства которого являются входными селекторами и возвращает структурированный селектор. Структурированный селектор возвращает объект с теми же ключами, что и аргумент `inputSelectors`, но с заменой селекторов на их значения.

```js
const mySelectorA = state => state.a;
const mySelectorB = state => state.b;

const structuredSelector = createStructuredSelector({
  x: mySelectorA,
  y: mySelectorB
});

const result = structuredSelector({ a: 1, b: 2 }); // will produce { x: 1, y: 2 }
```

Структурированные селекторы могут быть вложенными:

```js
const nestedSelector = createStructuredSelector({
  subA: createStructuredSelector({
    selectorA,
    selectorB
  }),
  subB: createStructuredSelector({
    selectorC,
    selectorD
  })
});
```

## FAQ

### Q: Почему мой входной селектор не производит вычисления, когда изменяется входное состояние?

A: Убедитесь, что функция мемоизации совместима с вашей функцией обновления состояния (например, редюсер, если вы используете Redux). Например, селектор, созданный с помощью `createSelector`, не будет работать с функцией обновления состояния, которая изменяет существующий объект, а не создает новый каждый раз. `createSelector` использует проверку идентичности (`===`), чтобы проверить, что входная информация была изменена, поэтому изменение существующего объекта не приведет к перепрограммированию селектора, поскольку изменение объекта не изменит его определение. Обратите внимание, что если вы используете Redux, изменение объекта состояния [почти наверняка ошибка](http://redux.js.org/docs/Troubleshooting.html).

В следующем примере определяется простой селектор, который устанавливает, был ли выполнен первый объект todo в массиве todos:

```js
const isFirstTodoCompleteSelector = createSelector(
  state => state.todos[0],
  todo => todo && todo.completed
);
```

Следующая функция обновления состояния **не будет** работать с `isFirstTodoCompleteSelector`:

```js
export default function todos(state = initialState, action) {
  switch (action.type) {
    case COMPLETE_ALL:
      const areAllMarked = state.every(todo => todo.completed);
      // BAD: mutating an existing object
      return state.map(todo => {
        todo.completed = !areAllMarked;
        return todo;
      });

    default:
      return state;
  }
}
```

Следующая функция обновления состояния **будет** работать с `isFirstTodoCompleteSelector`:

```js
export default function todos(state = initialState, action) {
  switch (action.type) {
    case COMPLETE_ALL:
      const areAllMarked = state.every(todo => todo.completed);
      // GOOD: returning a new object each time with Object.assign
      return state.map(todo =>
        Object.assign({}, todo, {
          completed: !areAllMarked
        })
      );

    default:
      return state;
  }
}
```

Если вы не используете Redux и вам необходимо работать с изменяемыми данными, вы можете использовать `createSelectorCreator` для чтобы заменить функцию мемоизации по умолчанию и/или использовать другую функцию проверки равенства. См. [здесь](#Используйте-функцию-memoize-из-lodash-для-неограниченного-кеша) и [здесь](#Настройте-equalitycheck-для-defaultmemoize) для примеров.

### Q: Почему мой селектор производит перерасчёт когда входное состояние остаётся прежним?

A: Убедитесь, что ваша функция мемоизации совместима с вашей функцией обновления состояния (т. е. редюсер, если вы используете Redux). Например, селектор, созданный с `createSelector`, который неожиданно производит перерасчёт, может получать новый объект при каждом обновлении, не смотря на то изменились значения которые он содержит или нет. `createSelector` использует проверку на идентичность (`===`), чтобы обнаружить что входные данные изменились , поэтому возврат нового объекта при каждом обновлении означает что селектор будет производить перерасчёт при каждом обновлении.

```js
import { REMOVE_OLD } from "../constants/ActionTypes";

const initialState = [
  {
    text: "Use Redux",
    completed: false,
    id: 0,
    timestamp: Date.now()
  }
];

export default function todos(state = initialState, action) {
  switch (action.type) {
    case REMOVE_OLD:
      return state.filter(todo => {
        return todo.timestamp + 30 * 24 * 60 * 60 * 1000 > Date.now();
      });
    default:
      return state;
  }
}
```

Следующий селектор собирается производить перерасчёт каждый раз, когда REMOVE_OLD вызывается, потому что Array.filter всегда возвращает новый объект. Однако, в большинстве случаев, REMOVE_OLD action не изменяет список задач (todos), поэтому перерасчёт не нужен.

```js
import { createSelector } from 'reselect'

const todosSelector = state => state.todos

export const visibleTodosSelector = createSelector(
  todosSelector,
  (todos) => {
    ...
  }
)
```

Вы можете устранить ненужные повторные вычисления, вернув новый объект из функции обновления состояния только тогда, когда проверка на идентичность обнаружила, что список задач действительно изменился:

```js
import { REMOVE_OLD } from "../constants/ActionTypes";
import isEqual from "lodash.isEqual";

const initialState = [
  {
    text: "Use Redux",
    completed: false,
    id: 0,
    timestamp: Date.now()
  }
];

export default function todos(state = initialState, action) {
  switch (action.type) {
    case REMOVE_OLD:
      const updatedState = state.filter(todo => {
        return todo.timestamp + 30 * 24 * 60 * 60 * 1000 > Date.now();
      });
      return isEqual(updatedState, state) ? state : updatedState;
    default:
      return state;
  }
}
```

В качестве альтернативы, функция по умолчанию `equalityCheck` в селекторе может быть заменена глубокой проверкой на идентичность:

```js
import { createSelectorCreator, defaultMemoize } from 'reselect'
import isEqual from 'lodash.isEqual'

const todosSelector = state => state.todos

// создадим "selector creator", который использует lodash.isEqual вместо ===
const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  isEqual
)

// используем новый "selector creator" чтобы создать селектор
const mySelector = createDeepEqualSelector(
  todosSelector,
  (todos) => {
    ...
  }
)
```

Следует всегда контролировать, что альтернативная функция `equalityCheck` или глубокая проверка на идентичность в функции обновления состояния не окажется дороже с точки зрения производительности, чем перерасчёт каждый раз. Если постоянный перерасчёт будет более выгодным вариантом, возможно, в этом случае Reselect не даёт вам никакой пользы вместо передачи чистой функции `mapStateToProps` к `connect`.

### Q: Могу ли я использовать Reselect без Redux?

A: Да. Reselect не имеет зависимости от какого-либо другого пакета, так что хотя он был разработан для использования с Redux он может использоваться независимо. В настоящее время он успешно используется в традиционных приложениях Flux.

> Если вы создаете селекторы, используя `createSelector`, убедитесь что его аргументы неизменны.
> См. [здесь](#createselectorinputselectors--inputselectors-resultfunc)

### Q: Как создать селектор, который принимает аргумент?

A: Имейте в виду, что селекторы могут получить доступ к React props, поэтому, если ваши аргументы являются (или могут быть доступны как) React props, вы можете использовать эту функциональность. [Подробности см. здесь.](#Доступ-к-react-props-в-Селекторах)

В других случаях, Reselect не имеет встроенной поддержки для создания селекторов, которые принимают аргументы, но вот некоторые предложения по реализации аналогичной функциональности...

Если аргумент не является динамическим, вы можете использовать фабричную функцию:

```js
const expensiveItemSelectorFactory = minValue => {
  return createSelector(shopItemsSelector, items =>
    items.filter(item => item.value > minValue)
  );
};

const subtotalSelector = createSelector(
  expensiveItemSelectorFactory(200),
  items => items.reduce((acc, item) => acc + item.value, 0)
);
```

Общее решение [здесь](https://github.com/reduxjs/reselect/issues/38) и [посредством nuclear-js](https://github.com/optimizely/nuclear-js/issues/14) заключается в том, что если селектору нужен динамический аргумент, то этот аргумент, вероятно, должен иметь своё состояние (state) в хранилище (store). Если вы решите, что вам нужен селектор с динамическим аргументом, то подходящим окажется селектор, который возвращает мемоизированную функцию:

```js
import { createSelector } from "reselect";
import memoize from "lodash.memoize";

const expensiveSelector = createSelector(
  state => state.items,
  items => memoize(minValue => items.filter(item => item.value > minValue))
);

const expensiveFilter = expensiveSelector(state);

const slightlyExpensive = expensiveFilter(100);
const veryExpensive = expensiveFilter(1000000);
```

### Q: Мне не подходит функция мемоизации по умолчанию, можно ли использовать другую?

A: Мы всё же считаем, что это отлично работает для многих случаев использования. См [эти примеры](#Настройте-equalitycheck-для-defaultmemoize).

### Q: Как протестировать селектор?

A: Для одних тех же данных на входе, селектор должен всегда возвращать один и тот же результат. По этой причине их легко тестировать (unit test).

```js
const selector = createSelector(
  state => state.a,
  state => state.b,
  (a, b) => ({
    c: a * 2,
    d: b * 3
  })
);

test("selector unit test", () => {
  assert.deepEqual(selector({ a: 1, b: 2 }), { c: 2, d: 6 });
  assert.deepEqual(selector({ a: 2, b: 3 }), { c: 4, d: 9 });
});
```

Также может быть полезно проверить, что функция мемоизации для селектора корректно работает с функцией обновления состояния (т.е. редюсера, если вы используете Redux). Каждый селектор имеет метод `recomputations`, который возвращает количество повторных вычислений:

```js
suite("selector", () => {
  let state = { a: 1, b: 2 };

  const reducer = (state, action) => ({
    a: action(state.a),
    b: action(state.b)
  });

  const selector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => ({
      c: a * 2,
      d: b * 3
    })
  );

  const plusOne = x => x + 1;
  const id = x => x;

  test("selector unit test", () => {
    state = reducer(state, plusOne);
    assert.deepEqual(selector(state), { c: 4, d: 9 });
    state = reducer(state, id);
    assert.deepEqual(selector(state), { c: 4, d: 9 });
    assert.equal(selector.recomputations(), 1);
    state = reducer(state, plusOne);
    assert.deepEqual(selector(state), { c: 6, d: 12 });
    assert.equal(selector.recomputations(), 2);
  });
});
```

Кроме того, селекторы сохраняют ссылку на последнюю функцию результата как `.resultFunc`. Если у вас есть селекторы, состоящие из многих других селекторов, это может помочь вам протестировать каждый селектор, не связывая все ваши тесты с конфигурацией вашего состояния.

Например, если у вас есть набор селекторов, наподобие :

#### selectors.js

```js
export const firstSelector = createSelector( ... )
export const secondSelector = createSelector( ... )
export const thirdSelector = createSelector( ... )

export const myComposedSelector = createSelector(
  firstSelector,
  secondSelector,
  thirdSelector,
  (first, second, third) => first * second < third
)
```

Тогда набор юнит-тестов, будет следующим:

#### test/selectors.js

```js
// тесты для первых трех селекторов...
test("firstSelector unit test", () => { ... })
test("secondSelector unit test", () => { ... })
test("thirdSelector unit test", () => { ... })

// Мы уже тестировали предыдущие
// три селектора, поэтому мы можем просто вызвать `.resultFunc`
// со значениями, которые мы хотим проверить непосредственно:
test("myComposedSelector unit test", () => {
  // here instead of calling selector()
  // we just call selector.resultFunc()
  assert(myComposedSelector.resultFunc(1, 2, 3), true)
  assert(myComposedSelector.resultFunc(2, 2, 1), false)
})
```

Наконец, каждый селектор имеет метод `resetRecomputations`, который устанавливает пересчёт назад в 0.  
Предполагается использовать для сложного селектора, который может иметь много независимых тестов, а также если вы не хотите вручную управлять подсчетом вычислений или создать «фиктивный» селектор для каждого теста.

### Q: Как мне использовать Reselect с Immutable.js?

A: Селекторы, созданные с помощью `createSelector` должны отлично работать со структурами данных Immutable.js.

Если ваш селектор производит пересчёт, и вы не думаете, что состояние изменилось, убедитесь, что вы знаете, какие методы обновления Immutable.js **всегда** возвращают только новый объект и какие методы обновления возвращают новый объект только **когда коллекция действительно меняется**.

```js
import Immutable from "immutable";

let myMap = Immutable.Map({
  a: 1,
  b: 2,
  c: 3
});

// set, merge и др. только возвращают новый объект во время обновления изменений коллекции
let newMap = myMap.set("a", 1);
assert.equal(myMap, newMap);
newMap = myMap.merge({ a: 1 });
assert.equal(myMap, newMap);
// map, reduce, filter и др. всегда возвращают новый объект
newMap = myMap.map(a => a * 1);
assert.notEqual(myMap, newMap);
```

Если входные параметры селектора обновляются операцией, которая всегда возвращает новый объект, он может выполнять ненужные повторные вычисления. См. [здесь](#q-Почему-мой-селектор-производит-перерасчёт-когда-входное-состояние-остаётся-прежним) для обсуждения плюсов и минусов использования глубокой проверки на идентичность, такой как `Immutable.is`, чтобы устранить ненужные повторные вычисления.

### Q: Могу ли я использовать селектор в многокомпонентных вхождениях?

A: Селекторы, созданные с использованием `createSelector` имеют размер кэша, равным единице. Это может сделать их непригодными для совместного использования в нескольких экземплярах, если аргументы селектора различны для каждого экземпляра компонента. Есть несколько способов обойти это:

* Создайте фабричную функцию, которая возвращает новый селектор для каждого экземпляра компонента. Существует встроенная поддержка фабричных функций в React Redux v4.3 или выше. См. [здесь](#Совместное-использование-селекторов-с-props-в-многокомпонентных-вхождениях) для примера.

* Создайте собственный селектор с размером кеша больше единицы.

### Q: Существуют ли типы TypeScript?

A: Да! Они включены и указаны в `package.json`. Они должны "тупо" работать.

### Q: Как я могу сделать [каррированный](https://github.com/hemanth/functional-programming-jargon#currying) селектор?

A: Попробуйте эти [вспомогательные функции](https://github.com/reduxjs/reselect/issues/159#issuecomment-238724788), любезно предоставленные [MattSPalmer](https://github.com/MattSPalmer)

## Связанные проекты

### [re-reselect](https://github.com/toomuchdesign/re-reselect)

Улучшает выбор селекторов путём обёртывания `createSelector` и возвращает мемоизированную коллекцию селекторов, проиндексированную ключом кэша, который возвращает пользовательская функция преобразования.

Полезно сокращать селекторные вычисления, когда один и тот же селектор неоднократно вызывается с одним/несколькими различными аргументами.

### [reselect-tools](https://github.com/skortchmark9/reselect-tools)

[Расширение Chrome](https://chrome.google.com/webstore/detail/reselect-devtools/cjmaipngmabglflfeepmdiffcijhjlbb?hl=en) а также [дополнительная библиотека](https://github.com/skortchmark9/reselect-tools) для отладки селекторов.

* Измерение селекторных вычислений и определение узких мест производительности
* Проверка зависимостей селекторов, входных, выходных данных, повторных вычислений в любое время при помощи расширения chrome
* Статический экспорт JSON-представления вашего селекторного дерева для последующего анализа

### [reselect-map](https://github.com/HeyImAlex/reselect-map)

Может принести пользу при выполнении **очень дорогостоящих** вычислений на элементах коллекции, потому что Reselect возможно не даёт достаточной детализации кеширования. Ознакомьтесь с README reselect-maps в качестве примеров.

**Оптимизации в reselect-map применяются только в некоторых случаях. Если вы не уверены, что вам это нужно, не делайте это!**

## Лицензия

MIT

[build-badge]: https://img.shields.io/travis/reduxjs/reselect/master.svg?style=flat-square
[build]: https://travis-ci.org/reduxjs/reselect
[npm-badge]: https://img.shields.io/npm/v/reselect.svg?style=flat-square
[npm]: https://www.npmjs.org/package/reselect
[coveralls-badge]: https://img.shields.io/coveralls/reduxjs/reselect/master.svg?style=flat-square
[coveralls]: https://coveralls.io/github/reduxjs/reselect
