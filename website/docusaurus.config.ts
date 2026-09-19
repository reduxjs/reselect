import type { Options, ThemeConfig } from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'

const config: Config = {
  title: 'Reselect',
  tagline: 'A memoized selector library for Redux',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://reselect.js.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'reduxjs', // Usually your GitHub org/user name.
  projectName: 'reselect', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: true,
          routeBasePath: '/',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/reduxjs/reselect/edit/master/website'
        },
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Options
    ]
  ],
  themes: [require.resolve('@getcanary/docusaurus-theme-search-pagefind')],
  headTags: [
    {
      // Rspack (`future.v4.fasterByDefault`) bundles the dynamic
      // `import(path ?? '/pagefind/pagefind.js')` inside @getcanary/web's
      // pagefind provider instead of leaving it as a browser import, so it fails
      // at runtime with MODULE_NOT_FOUND and search shows no results. The
      // provider uses `window.pagefind` when present, so load the module here.
      tagName: 'script',
      attributes: { type: 'module' },
      innerHTML: `import('/pagefind/pagefind.js').then(m => { window.pagefind = m }).catch(() => {})`
    }
  ],
  themeConfig: {
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4
    },
    // Replace with your project's social card
    // image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Reselect',

      items: [
        {
          type: 'doc',
          position: 'right',
          label: 'Getting Started',
          docId: 'introduction/getting-started'
        },
        {
          type: 'doc',
          position: 'right',
          label: 'API',
          docId: 'api/createSelector'
        },
        {
          href: 'https://www.github.com/reduxjs/reselect',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/reselect'
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/0ZcbPKXt5bZ6au5t'
            }
          ]
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/reduxjs/reselect'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} by the Redux Maintainers. Built with Docusaurus.`
    },
    prism: {
      theme: require('./monokaiTheme.js')
    }
  } satisfies ThemeConfig,
  future: {
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
      fasterByDefault: true
    }
  }
}

export default config
