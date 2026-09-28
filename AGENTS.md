# yAdventures

Datapack for Minecraft Java 26.3, meant to be published (data pack format 121).
Written in TypeScript with [Sandstone](https://sandstone.dev) 1.2 (which targets 26.3).

- Source: `src/` (entry `src/index.ts`), config in `sandstone.config.ts`.
- Build: `bun dev:build > /dev/null 2>&1`, output goes to `.sandstone/output/datapack/`
  (log in `.sandstone/`). `bun dev:watch` rebuilds on change.
- Typecheck: `bun x tsc --noEmit -p .`
- Commands must only be emitted inside an `MCFunction` body. Objective names get the
  namespace prefix (`Objective.create('compat')` is `yadventures.compat`); keep them
  stable, existing worlds rely on them.
- CI (`.github/workflows/build.yml`) builds every push/PR and uploads the pack as an artifact.
  Pushing a `v*` tag (e.g. `v1.0.0`) also creates a GitHub release with `yAdventures-<tag>.zip`.
- Sandstone docs: https://sandstone.dev, and the typed API in `node_modules/sandstone/src`.

## Sources of information

Use these as the references for Minecraft and datapack/resource pack work, and check them
before relying on memory — data-driven mechanics change a lot between versions:

- [datapack.wiki](https://datapack.wiki) — datapack/resource pack guides and concepts
  (commands, functions, recipes, custom items, worldgen, breaking changes between versions).
- [minecraft.wiki](https://minecraft.wiki) — game mechanics and exact file formats
  (e.g. [Data component format](https://minecraft.wiki/w/Data_component_format),
  [Recipe](https://minecraft.wiki/w/Recipe_(Java_Edition)), entity and item pages).

When the two disagree or are vague, prefer minecraft.wiki for exact formats, and confirm
against the game itself (a test server, or the decompiled 26.3 jar) when it matters.
