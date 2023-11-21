---
id: getting-started
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started with Reselect

A library for creating memoized "selector" functions. Commonly used with Redux, but usable with any plain JS immutable data as well.

- Selectors can compute derived data, allowing [Redux] to store the minimal possible state.
- Selectors are efficient. A selector is not recomputed unless one of its arguments changes.
- Selectors are composable. They can be used as input to other selectors.

The **Redux docs usage page on [Deriving Data with Selectors](https://redux.js.org/usage/deriving-data-selectors)** covers the purpose and motivation for selectors, why memoized selectors are useful, typical Reselect usage patterns, and using selectors with [React-Redux].

## Installation

### Redux Toolkit

While Reselect is not exclusive to [Redux], it is already included by default in [the official Redux Toolkit package](https://redux-toolkit.js.org) - no further installation needed.

```ts
import { createSelector } from '@reduxjs/toolkit'
```

### Standalone

For standalone usage, install the `reselect` package:

<Tabs>

<TabItem value="npm" label="NPM" default>

```bash
npm install reselect
```

</TabItem>

<TabItem value="yarn" label="Yarn" >

```bash
yarn add reselect
```

</TabItem>

<TabItem value="bun" label="Bun" >

```bash
bun add reselect
```

</TabItem>

<TabItem value="pnpm" label="PNPM" >

```bash
pnpm add reselect
```

</TabItem>

</Tabs>

---
