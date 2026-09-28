import type { SandstoneConfig } from 'sandstone'

export default {
  name: 'yAdventures',
  packs: {
    datapack: {
      // CI sets PACK_VERSION (the release tag, or dev-<sha>)
      description: `yAdventures ${process.env.PACK_VERSION ?? 'dev'}`,
      packFormat: 121,
    },
  },
  onConflict: {
    default: 'warn',
  },
  namespace: 'yadventures',
  packUid: 'yadv',
  mcmeta: 'latest',
  saveOptions: {},
} as SandstoneConfig
