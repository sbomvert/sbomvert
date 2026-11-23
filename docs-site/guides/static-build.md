---
title: Static build
description: Build SBOMVert as a static site that analyzes and translates SBOMs entirely in the browser, and serve it from any static file host.
---

# Static build

SBOMVert can be built as a static website: plain HTML, JavaScript and CSS files with no server behind them. The static site keeps the two features that need no server, **SBOM Analysis** and **Translate SBOM**. SBOMs are read and translated in the visitor's browser and are never uploaded.

Use it to offer SBOM analysis and translation on a static host such as GitHub Pages, or internally where running a Node.js server is not an option. A public instance runs at [sbomvert.jackops.dev](https://sbomvert.jackops.dev).

## What is included

The static build only contains the pages whose source file is named `*.static.tsx`:

| Page | Path | Notes |
| --- | --- | --- |
| Home | `/` | Says that SBOMs never leave the browser. |
| SBOM Analysis | `/compare/analyze` | Shows the load form directly: paste JSON or choose a file. No name fields. |
| Analysis result | `/compare/analyze/local` | The loaded SBOM's details. |
| Translate SBOM | `/translate` | **Paste JSON** and **File from my computer**; no **Stored SBOM** option. |

The sidebar shows **Home**, **SBOM Analysis** and **Translate SBOM** only.

## What is excluded

Everything that needs a server or stored data:

- SBOM Comparison and CVE Comparison (`/compare`, `/compare/sbom`, `/compare/cve` and their sub-pages).
- Opening stored SBOMs (`/compare/analyze/<image>/<file>`) and the **Stored SBOM** input of the Translate page.
- Upload SBOM, Scan, and sign-in and account pages. Their feature flags are always off in the static build.
- All API routes (`/api/...`).

## Build it

1. Install dependencies as for a [source install](/getting-started/installation#from-source):

   ```bash
   nvm use
   npm install
   ```

2. Run the static build:

   ```bash
   npm run build:static
   ```

   This runs `next build` with `NEXT_PUBLIC_STATIC_MODE=true`. In that mode, `next.config.js` switches Next.js to static export (`output: 'export'`), only picks up `*.static.tsx` pages, turns on `trailingSlash`, and disables the server-side image optimizer.

   **Expected result:** the site is written to `out/`.

3. Check the output:

   ```bash
   ls out out/compare/analyze out/translate
   ```

   **Expected result:** `index.html` at the top level and inside each page folder. Because `trailingSlash` is on, each page is a folder with an `index.html` (`compare/analyze/index.html`), which static hosts serve for `/compare/analyze/`.

## Serve it under a path

If the site is not served at the root of its domain, set `NEXT_PUBLIC_BASE_PATH` **when you build**. It is compiled into the links and asset URLs:

```bash
NEXT_PUBLIC_BASE_PATH=/sbomvert/app npm run build:static
```

The site must then be served at that path, for example `https://example.org/sbomvert/app/`. Without a base path, it must be served at the root.

## Serve it

Any static file server works.

::: code-group

```bash [serve (local test)]
# without NEXT_PUBLIC_BASE_PATH
npx serve out
```

```nginx [nginx]
server {
    listen 80;
    server_name sbom.example.org;

    # contents of out/ (built without NEXT_PUBLIC_BASE_PATH)
    root /var/www/sbomvert;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

```nginx [nginx, under a path]
# built with NEXT_PUBLIC_BASE_PATH=/sbomvert/app,
# contents of out/ copied to /var/www/html/sbomvert/app/
server {
    listen 80;
    root /var/www/html;

    location /sbomvert/app/ {
        try_files $uri $uri/ =404;
    }
}
```

:::

`npx serve` downloads and runs the third-party `serve` package; any other static server, such as `python3 -m http.server --directory out`, works the same for a local test.

**Expected result:** opening the site shows the SBOMVert home page with "Analyze and translate SBOMs right in your browser."

## Privacy

- The SBOM is read from the file you choose or the text you paste, and processed by JavaScript on the page. The static site has no server to send it to, and the analysis and translation pages make no request with it.
- A loaded SBOM is kept in memory only. Reloading the page or closing the tab discards it.
- Translated SBOMs are produced in the browser and downloaded or copied directly from it.

The host still sees ordinary page requests (which pages were opened, from which address), as with any website.

## Related

- [Analyze an SBOM](/guides/analyze-sbom)
- [Translate an SBOM](/guides/translate-sbom)
- [Installation](/getting-started/installation)
