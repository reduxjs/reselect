# Reselect docs

The pages in this folder are published as part of the combined Redux docs site, at https://redux.js.org/reselect. The site itself (Docusaurus config, theme, search, redirects, build scripts) lives in the [`reduxjs/redux`](https://github.com/reduxjs/redux) repo under `website/`. This folder holds only the Reselect pages.

## What lives where

| What                                                                 | Where                                       |
| -------------------------------------------------------------------- | ------------------------------------------- |
| Reselect pages                                                       | `docs/**/*.{md,mdx}` in this repo           |
| Reselect sidebar                                                     | `docs/sidebars.ts` in this repo             |
| Code examples shown in the pages                                     | `docs/examples/` in this repo               |
| Images used by these pages                                           | `docs/assets/`, referenced by relative path |
| Tutorials, TypeScript setup, style guide, FAQ, troubleshooting       | `docs/` in `reduxjs/redux`                  |
| Site config, navbar, theme, search, redirects (`website/_redirects`) | `website/` in `reduxjs/redux`               |

Topics shared by all the Redux libraries are written once, in the core docs. Deriving data with selectors is covered in the core usage guide at `/usage/deriving-data-selectors`. Link to those pages instead of repeating them here.

## Links

- Other Reselect pages: a relative file link (`../api/createSelector.mdx`) or a site path (`/reselect/api/createSelector`).
- Other libraries and the core docs: site paths, such as `/usage/deriving-data-selectors`, `/toolkit/api/createSelector`, or `/react-redux/api/hooks`. Do not use full `https://redux.js.org/...` URLs.
- When you rename, move, or delete a page, add a redirect for the old URL to `website/_redirects` in `reduxjs/redux`.

## Sidebar

New pages only appear in the navigation once they are listed in `docs/sidebars.ts`. The file has no imports because the site loads it from a copy of this folder. Its local `SidebarItem` type catches misspelled keys:

```bash
pnpm exec tsc -p docs/tsconfig.json --noEmit
```

The site build checks that every doc id in the sidebar exists.

## Code examples

The TypeScript/JavaScript tabs in the pages are generated from the files in `docs/examples/`, which are type-checked against `src/`. To add or change one:

1. Edit or add the file under `docs/examples/`.
2. In the page, add a `{/* START: path/to/example.ts */}` line and a matching `{/* END: path/to/example.ts */}` line where the tabs should go. The path is relative to `docs/examples/`.
3. Run `pnpm docs:examples`. It compiles the examples to JavaScript, writes both versions into the pages between the markers, and formats the result.
4. Commit the updated pages. The site does not run this script; it publishes the pages as committed.

## Previewing a PR

Every PR that changes `docs/` gets a Netlify deploy preview of the whole combined site, with this branch's Reselect docs in place of the published ones.

## Previewing locally

Clone `reduxjs/redux` next to this repo and install the site's dependencies once:

```bash
git clone https://github.com/reduxjs/redux.git ../redux
cd ../redux/docs && pnpm install
cd ../website && pnpm install
```

Then start the dev server from `../redux/website`, pointing it at this checkout:

```bash
DOCS_SOURCE_RESELECT=../../reselect pnpm dev
```

`pnpm dev` copies this repo's docs into `website/external/reselect`, copies each file again when it changes, and runs `docusaurus start`. The other libraries are cloned from GitHub. Set `DOCS_SOURCE_REDUX_TOOLKIT` or `DOCS_SOURCE_REACT_REDUX` as well to use local checkouts of those.

The dev server does not report broken links. To run the same checks as a deploy preview:

```bash
DOCS_SOURCE_RESELECT=../../reselect pnpm fetch-docs --force
pnpm build
```
