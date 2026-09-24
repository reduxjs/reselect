// Sidebar for the Reselect docs on the combined Redux docs site
// (https://redux.js.org/reselect). The site's docs plugin instance for this
// library reads this file. It has no imports because it is loaded from a copy of
// this folder inside the redux repo's website build.

const sidebars = {
  docsSidebar: [
    {
      type: 'category',
      collapsed: false,
      label: 'Introduction',
      items: [
        'introduction/getting-started',
        'introduction/how-does-reselect-work',
        'introduction/v5-summary'
      ]
    },
    {
      type: 'category',
      collapsed: false,
      label: 'API',
      items: [
        'api/createSelector',
        'api/createSelectorCreator',
        'api/createStructuredSelector',
        'api/development-only-checks',
        {
          type: 'category',
          collapsed: false,
          label: 'Memoization Functions',
          items: ['api/lruMemoize', 'api/weakMapMemoize']
        }
      ]
    },
    {
      type: 'category',
      label: 'Using Reselect',
      items: [
        {
          type: 'link',
          label: 'Deriving Data with Selectors',
          href: '/usage/deriving-data-selectors'
        },
        'usage/best-practices',
        'usage/handling-empty-array-results'
      ]
    },
    'FAQ',
    'external-references',
    'related-projects'
  ]
}

export default sidebars
