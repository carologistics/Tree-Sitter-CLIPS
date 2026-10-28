# Tree-Sitter-CLIPS

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for [CLIPS](https://www.clipsrules.net/) 6.4.2, with syntax highlighting queries.

This repository is a fork of [TarikViehmann/tree-sitter-CLIPS](https://github.com/TarikViehmann/tree-sitter-CLIPS), adapted to serve as the parser for the [CLIPS Language Server](https://github.com/carologistics/CLIPS-language-server). It provides the Node.js binding the server builds on and can also be used directly for tree-sitter syntax highlighting in editors such as Neovim.

## Requirements

- Node.js 20 or later
- A C compiler toolchain: Visual Studio Build Tools with the "Desktop development with C++" workload on Windows, Xcode Command Line Tools on macOS, `gcc`/`make` on Linux

The tree-sitter CLI is a development dependency, so `npm install` provides it and you don't need a global installation. Run it with `npx tree-sitter`.


### Syntax highlighting

Editors with built-in tree-sitter support load the grammar as a native library and use the queries in `queries/` for highlighting. The setup is the same everywhere:

**1. Build the parser library** in this repository:

```
npm install
npx tree-sitter build -o clips.so
```

The extension your editor expects depends on the OS: `.so` on Linux, `.dylib` or `.so` on macOS (depending on the editor), `.dll` on Windows.

**2. Make the library and queries available to your editor.** Each editor looks for them in its own location and under its own file name, so check its documentation. Use a symbolic link (`ln -s`) instead of a copy, so that the editor picks up rebuilds and query changes automatically.

**3. Map CLIPS files to the language** (`.clp`, `.CLP` and `.clpd`) and enable tree-sitter highlighting for it, if your editor doesn't do this automatically.

If the editor fails to load the parser with an ABI version error, the generated parser doesn't match the tree-sitter version your editor uses. Regenerate it (see Development) and build again.

### Example: Neovim (0.11+)

Neovim looks for `parser/clips.so` and `queries/clips/` in its data folder (`~/.local/share/nvim/site` on Linux and macOS, `~/AppData/Local/nvim-data/site` on Windows):

```
mkdir -p ~/.local/share/nvim/site/parser ~/.local/share/nvim/site/queries
ln -s <path-to>/Tree-Sitter-CLIPS/clips.so ~/.local/share/nvim/site/parser/clips.so
ln -s <path-to>/Tree-Sitter-CLIPS/queries ~/.local/share/nvim/site/queries/clips
```

Then enable highlighting in `init.lua`:

```lua
vim.filetype.add({ extension = { clp = 'clips', CLP = 'clips', clpd = 'clips' } })

vim.api.nvim_create_autocmd('FileType', {
  pattern = 'clips',
  callback = function() vim.treesitter.start() end,
})
```

To check it, open a `.clp` file and run `:InspectTree` (parser loaded) and `:Inspect` on a keyword (queries loaded). 

**4. Check it.** Open a `.clp` file:

- `:InspectTree` shows the syntax tree, which means the parser loaded.
- `:Inspect` on a keyword such as `defrule` shows its highlight group, which means the queries loaded.

If opening a file fails with "Parser could not be created", run `:lua vim.treesitter.language.add('clips')` to see the exact cause. Usually the library is missing or misnamed, or it has an ABI version your Neovim doesn't support. For an ABI error, regenerate the parser (see Development) and build again.

### Other editors

The same library works in other editors with tree-sitter support. Each one expects it in its own location and under its own name, for example `~/.emacs.d/tree-sitter/libtree-sitter-clips.so` for Emacs 29+. Build it once and link it into each editor; the highlight queries are in `queries/`.

## Development

The grammar is defined in `grammar.js`. The generated parser in `src/` is committed, so users can build without the tree-sitter CLI's generate step.

After changing `grammar.js`, regenerate the parser and run the tests:

```
npx tree-sitter generate
npx tree-sitter test
```

Tests are in `test/corpus/`, and example CLIPS files are in `examples/`. To check a single file, run `npx tree-sitter parse examples/<file>.clp`.

Rebuild the Node.js binding with `npm install` and restart the language server to pick up grammar changes there.

## Repository layout

- `grammar.js`: the grammar definition
- `src/`: the generated parser (`parser.c` and supporting files)
- `queries/`: tree-sitter queries, including `highlights.scm`
- `bindings/node/`: the Node.js binding used by the language server
- `test/corpus/`: grammar tests
- `examples/`: example CLIPS programs
