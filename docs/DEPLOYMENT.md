# Deployment checklist

The repository includes GitHub Actions workflows for build validation and
GitHub Pages deployment. Pages must be configured to use **GitHub Actions**
as its source; the deployment workflow publishes Astro's `dist/`, not Jekyll.

## 1. Content — fill in the placeholders

`src/data/profile.js` and `src/pages/about.astro` still hold template
placeholder text (`Your Name`, `<你的興趣>`, `your-handle`, `you@example.com`,
etc. — see the comment at the top of `profile.js`). Replace these with your
real identity before sharing the site publicly. This is content, not code —
no build changes needed.

## 2. Pick a host and a domain

Any static host works since this is `astro build`'s static output (no
server-side rendering config in `astro.config.mjs`). Common choices for an
Astro site: Vercel, Netlify, Cloudflare Pages, or GitHub Pages. Whichever you
pick, you'll end up with either a platform subdomain (e.g.
`your-project.vercel.app`) or a custom domain you own — either works as the
"real domain" the next step needs.

### GitHub Pages

1. Open **Settings → Pages → Build and deployment** and set **Source** to
   **GitHub Actions**, not **Deploy from a branch**. Logs containing
   `github-pages`, `jekyll`, or `jekyll-theme-primer` belong to the legacy
   Jekyll build, not this site's Astro build.
2. Push these changes to `main`, or run **Deploy to GitHub Pages** from the
   Actions tab on `main`. Other branches and pull requests do not deploy.
3. Wait for both `build` and `deploy` to succeed. The `github-pages`
   environment exposes the published URL.

`.github/workflows/deploy.yml` installs the lockfile with Node.js 24,
builds Astro, checks generated URLs, uploads `dist/` as a Pages artifact,
and deploys it with GitHub's Pages action. No PAT or deployment secret is
needed. `.github/workflows/ci.yml` remains build-only.

The deploy workflow reads the origin and base path from `configure-pages`.
For the default project site these are `https://amemizuki.github.io` and
`/personal-website`. A custom domain configured in Pages uses that domain
and its root path instead; no repository-name prefix needs to be hard-coded.
The Pages deployment does not use the CI-only repository variable `SITE_URL`.

To check the project-site output locally in PowerShell:

```powershell
$env:SITE_URL = 'https://amemizuki.github.io'
$env:SITE_BASE = '/personal-website'
npm run build
node scripts/check-pages-build.mjs
npm run preview
```

Visit `/personal-website/` on the preview server. Unset `SITE_BASE` (or set
it to `/`) when building for a host that serves this site at its root.

## 3. Configure the production origin and SEO

Set **`SITE_URL`** in your host's build environment to the actual public
origin, including HTTPS (for example, the platform subdomain assigned in
step 2). Use the origin only: no path, query string, or fragment.
The same value must be present whenever you run `astro build`.

For a local PowerShell production build:

```powershell
$env:SITE_URL = 'https://your-actual-domain'
npm run build
```

`astro.config.mjs` reads this environment variable into `site` and optional
`SITE_BASE` into `base` (default `/`). Internal navigation, public assets,
RSS, and sitemap URLs include the configured base path. The existing
`https://example.com` fallback remains for local development and build-only
CI; production deployment must use the real origin. The Pages workflow
supplies both values automatically. Rebuild after changing either value.

SEO is implemented in `src/components/SeoHead.astro`, used by the shared
layout. Pages supply descriptive titles and descriptions; journal articles
use their frontmatter `title`, `excerpt`, and `date`, with the author's name
from `src/data/profile.js`. The component emits canonical URLs, Open Graph
and Twitter metadata, article publication time and Article JSON-LD. The
404 page is marked `noindex`. There is no suitable local share image, so
image metadata is intentionally omitted rather than pointing to a fake asset.

`/sitemap.xml`, `/robots.txt`, and `/rss.xml` are generated during the static
build from the same configured `Astro.site`. The sitemap includes the five
public static pages and every journal article, not 404 or invented per-note,
per-project, or locale routes. When adding a new static page, add its path to
`src/pages/sitemap.xml.js`. URLs use trailing slashes to match Astro's
existing default directory output; RSS links already follow this convention.
Browser language switching does not create separate locale URLs.

After configuring the real origin, run `npm run build` and `npm run preview`.
Inspect page metadata, a journal article's JSON-LD, `/sitemap.xml`,
`/robots.txt`, `/rss.xml`, and `/404` before publishing. Confirm all public
URLs use the configured origin and 404 remains `noindex`. Search engines and
social preview tools must be able to access the deployed origin; local
metadata alone cannot make the site discoverable.

The older `plans/004-seo-sharing-metadata.md` is historical planning, not
an outstanding implementation or an instruction to add another sitemap
integration. No SEO dependency is needed.

## 4. Before going live, also consider

- **`plans/001-upgrade-astro.md`** — the currently-installed Astro version
  has a few known vulnerabilities (`npm audit`), including two low-severity
  XSS advisories in the exact `transition:*` directive family this site uses
  heavily (`transition:persist` on the header, background, and footer).
  Worth landing before the site is public, not required before that.
- **`npm run build`** — confirm it still exits 0 with no new errors right
  before deploying (routes shift if you add/remove pages).
- **`npm run typecheck`** (added by `plans/002`, if it's landed) — currently
  reports 6 pre-existing errors, all one root cause: `.sort((a, b) =>
  b.data.date - a.data.date)` needs `.getTime()` on both sides, in
  `src/pages/index.astro`, `src/pages/journal/index.astro`, and
  `src/pages/notes/index.astro`. Harmless at runtime (JS coerces `Date` to a
  number in subtraction the same way `.getTime()` would), but worth a 3-line
  fix before or after launch.
- **HTTPS** — every host listed in step 2 provisions this automatically for
  both platform subdomains and custom domains; nothing in this codebase
  needs to change for it.

## Not covered here

Analytics, a CMS, or any dynamic backend — this site has none of those and
adding any would be a separate, deliberate decision, not part of "deploying
what already exists."
