// Sidebar for the Reselect docs on the combined Redux docs site
// (https://redux.js.org/reselect). The site's docs plugin instance for this
// library reads this file. It has no imports because it is loaded from a copy of
// this folder inside the redux repo's website build.

// The subset of Docusaurus's `SidebarsConfig` type that this file uses. The
// site build validates the full sidebar schema and that every doc id exists.
type SidebarItem =
  | string
  | { type: 'doc'; id: string; label?: string }
  | { type: 'link'; label: string; href: string }
  | {
      type: 'category'
      label: string
      collapsed?: boolean
      collapsible?: boolean
      items: SidebarItem[]
    }

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
} satisfies Record<string, SidebarItem[]>

export default sidebars
