import type { SandstoneConfig } from 'sandstone'

export default {
  name: 'yAdventures',
  packs: {
    datapack: {
      // CI sets PACK_VERSION from the git tag
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
