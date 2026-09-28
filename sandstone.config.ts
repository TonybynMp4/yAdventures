import type { SandstoneConfig } from 'sandstone'

export default {
  name: 'yAdventures',
  packs: {
    datapack: {
      description: 'yAdventures',
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
