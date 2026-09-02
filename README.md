# FlashCards

[![Deploy](https://github.com/Aspenini/FlashCards/actions/workflows/deploy.yml/badge.svg)](https://github.com/Aspenini/FlashCards/actions/workflows/deploy.yml)
[![GitHub Stars](https://img.shields.io/github/stars/Aspenini/FlashCards?style=flat)](https://github.com/Aspenini/FlashCards/stargazers)

<img width="256" height="256" alt="FlashCards" src="https://github.com/user-attachments/assets/c1baf0aa-698c-4f38-bfeb-f6bfcd60182e" />

Create, study, and print flashcard sets in the browser. SvelteKit 2 + Svelte 5, Bun, and TypeScript 7. Offline-capable PWA.

**Live:** [flashcards.aspenini.com](https://flashcards.aspenini.com)

## Quick Start

```bash
bun install
bun run dev      # dev server
bun run build    # production build → dist/
bun test         # run tests
```

Requires [Bun](https://bun.sh).

## Answer Syntax

`(A/B)` for interchangeable words, `[X]` for optional parts. Nest freely: `(GAMETE[S]/SEX CELLS)` matches "GAMETE", "GAMETES", or "SEX CELLS".

## Stack

- **Bun** — install, test runner, scripts
- **TypeScript 7** — native compiler
- **SvelteKit 2 + Svelte 5** — file-based routing, runes, static adapter
- **Vite 7** — bundler
- Client-only PWA (GitHub Pages), localStorage for your sets
