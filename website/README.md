# Investment Agent Documentation Site

This directory contains the Astro Starlight documentation site for Investment Agent.

## Content

- Product docs live in `src/content/docs/`.
- Sidebar navigation is configured in `astro.config.mjs`.
- Static images live in `public/asset/`.
- The generated documentation is published at https://ishenli.github.io/investment-agent/.

## Generative UI Docs

The Server-driven Generative UI feature is documented in:

- `src/content/docs/generative-ui.mdx`
- `src/content/docs/features.mdx`

It covers the `UIArtifact` protocol, whitelisted renderers, SSE `ui_artifact` events, persistence, fallback text, and trade intent safety boundaries.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```
