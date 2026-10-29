import { Advancement, Data, MCFunction, Selector, _, advancement, attribute, effect, execute, playsound, raw, title } from 'sandstone'
import { bonusHp, bonusHpGained, deaths, left } from './objectives.ts'
import { sources, iceologerMobs, illusionerMobs, invokerMobs, wildfireMobs } from './compat.ts'

const MAX_BONUS_HP = 20
const MODIFIER = 'yadventures:boss_hearts'

type Predicate = Record<string, unknown>

type Source = keyof typeof sources

type Heart = {
  /** Advancement `yadventures:heart/<id>` */
  id: string
  /** Shown in the Boss Hearts advancement tab */
  title: string
  goal: string
  icon: string
  /** Any one of these grants the advancement */
  criteria: Record<string, unknown>
  hp: number
  /** Only counts while the source is installed (1) or missing (0) */
  when?: [Source, 0 | 1]
  /** Extra HP while the source is missing, covering its boss */
  covers?: [Source, number]
}

const killed = (predicate: Predicate) => ({
  trigger: 'minecraft:player_killed_entity',
  conditions: { entity: { type: 'minecraft:entity_properties', entity: 'this', predicate } },
})
const killedType = (type: string) => killed({ 'minecraft:entity_type': type })
const killedTagged = (tag: string) => killed({ 'minecraft:entity_tags': { all_of: [tag] } })

// Totals 20 HP with any combination of optional sources installed
const HEARTS: Heart[] = [
  { id: 'wither',
    title: 'Wither',
    goal: 'Defeat the Wither',
    icon: 'minecraft:nether_star', criteria: { wither: killedType('minecraft:wither') }, hp: 2, covers: ['wildfire', 2] },
  {
    id: 'wildfire',
    title: 'Wildfire',
    goal: 'Defeat the Wildfire',
    icon: 'minecraft:blaze_rod',
    criteria: { datapack: killedTagged('yadventures.boss.wildfire'), mod: killedType(`${wildfireMobs}`) },
    hp: 2,
    when: ['wildfire', 1],
  },
  { id: 'creaking',
    title: 'Creaking',
    goal: 'Defeat a Creaking',
    icon: 'minecraft:creaking_heart', criteria: { creaking: killedType('minecraft:creaking') }, hp: 1, covers: ['iceologer', 1] },
  {
    id: 'iceologer',
    title: 'Iceologer',
    goal: 'Defeat the Iceologer',
    icon: 'minecraft:blue_ice',
    criteria: { datapack: killedTagged('yadventures.boss.iceologer'), mod: killedType(`${iceologerMobs}`) },
    hp: 1,
    when: ['iceologer', 1],
  },
  {
    id: 'bastion',
    title: 'Bastion Treasure',
    goal: 'Loot a bastion treasure chest',
    icon: 'minecraft:gilded_blackstone',
    criteria: {
      bastion: {
        trigger: 'minecraft:player_generates_container_loot',
        conditions: { loot_tables: 'minecraft:chests/bastion_treasure' },
      },
    },
    hp: 1,
    covers: ['illusioner', 1],
  },
  {
    id: 'illusioner',
    title: 'Illusioner',
    goal: 'Defeat the Illusioner',
    icon: 'minecraft:ender_eye',
    criteria: {
      vanilla: killed({
        'minecraft:entity_type': 'minecraft:illusioner',
        'minecraft:entity_tags': { none_of: ['yadventures.boss.illusion'] },
      }),
      // Friends & Foes illusioner clones are the same entity type
      mod: killed({ 'minecraft:entity_type': `${illusionerMobs}`, 'minecraft:nbt': '{IsIllusion:0b}' }),
    },
    hp: 1,
    when: ['illusioner', 1],
  },
  { id: 'invoker',
    title: 'Invoker',
    goal: 'Defeat the Invoker',
    icon: 'minecraft:amethyst_cluster', criteria: { invoker: killedType(`${invokerMobs}`) }, hp: 2, when: ['invoker', 1] },
  {
    id: 'mansion_evoker',
    title: 'Mansion Evoker',
    goal: 'Defeat an Evoker in a woodland mansion',
    icon: 'minecraft:totem_of_undying',
    criteria: {
      mansion_evoker: killed({
        'minecraft:entity_type': 'minecraft:evoker',
        'minecraft:location': { structures: 'minecraft:mansion' },
      }),
    },
    hp: 2,
    when: ['invoker', 0],
  },
  { id: 'ender_dragon',
    title: 'Ender Dragon',
    goal: 'Defeat the Ender Dragon',
    icon: 'minecraft:dragon_head', criteria: { ender_dragon: killedType('minecraft:ender_dragon') }, hp: 2 },
  { id: 'elder_guardian',
    title: 'Elder Guardian',
    goal: 'Defeat an Elder Guardian',
    icon: 'minecraft:wet_sponge', criteria: { elder_guardian: killedType('minecraft:elder_guardian') }, hp: 2 },
  { id: 'warden',
    title: 'Warden',
    goal: 'Defeat a Warden',
    icon: 'minecraft:echo_shard', criteria: { warden: killedType('minecraft:warden') }, hp: 2 },
  {
    id: 'ominous_vault',
    title: 'Ominous Vault',
    goal: 'Open an ominous vault',
    icon: 'minecraft:ominous_trial_key',
    criteria: {
      ominous_vault: {
        trigger: 'minecraft:item_used_on_block',
        conditions: {
          location: {
            type: 'minecraft:all_of',
            terms: [
              {
                type: 'minecraft:location_check',
                predicate: { block: { blocks: 'minecraft:vault', state: { ominous: 'true' } } },
              },
              { type: 'minecraft:match_tool', predicate: { items: 'minecraft:ominous_trial_key' } },
            ],
          },
        },
      },
    },
    hp: 2,
  },
  { id: 'raid',
    title: 'Hero of the Village',
    goal: 'Win a raid',
    icon: 'minecraft:bell', criteria: { raid: { trigger: 'minecraft:hero_of_the_village' } }, hp: 2 },
]

const advancementId = (heart: Heart) => `yadventures:heart/${heart.id}`
const hasHeart = (heart: Heart) => Selector('@s', { advancements: { [advancementId(heart)]: true } })

// Boss Hearts advancement tab. Advancement files can't change once loaded, so hearts from optional
// sources are hidden until earned. yAdventures-bosses overrides the Wildfire, Iceologer and
// Illusioner hearts (and the hearts they cover) to show them, when it loads after this pack.
const ROOT = 'yadventures:heart/root'
const SOURCE_NAMES: Record<Source, string> = {
  wildfire: 'a Wildfire',
  iceologer: 'an Iceologer',
  illusioner: 'an Illusioner',
  invoker: 'an Invoker',
}

/** 1 HP is half a heart */
const hearts = (hp: number) => `+${hp >= 2 ? Math.floor(hp / 2) : ''}${hp % 2 ? '½' : ''} ❤`

const applyArgs = Data('storage', 'yadventures:hearts', 'apply')

const apply = MCFunction('hearts/apply', () => {
  raw(`$attribute @s minecraft:max_health modifier add ${MODIFIER} $(amount) add_value`)
})

/** Recounts @s's bonus max health (in HP, 2 = one heart) from their heart advancements and the installed sources. */
export const recompute = MCFunction('hearts/recompute', () => {
  const hp = bonusHp('@s')
  hp.set(0)

  for (const heart of HEARTS) {
    const counts = heart.when ? execute.if.score(sources[heart.when[0]], 'matches', heart.when[1]) : execute
    counts.if.entity(hasHeart(heart)).run(() => hp.add(heart.hp))
    if (heart.covers) {
      const [source, extra] = heart.covers
      execute.if.score(sources[source], 'matches', 0).if.entity(hasHeart(heart)).run(() => hp.add(extra))
    }
  }

  attribute('@s', 'minecraft:max_health').remove(MODIFIER as any)
  execute.store.result(applyArgs.select('amount'), 'double', 1).run.scoreboard.players.get(hp)
  execute.if.score(hp, 'matches', [1, null]).run.functionCmd(apply, 'with', applyArgs)
})

const announce = MCFunction('hearts/announce', () => {
  title('@s').times(10, 60, 20)
  title('@s').title({ text: '❤', color: 'red' })
  title('@s').subtitle([
    { text: '+', color: 'red' },
    { score: { name: '@s', objective: bonusHpGained }, color: 'red' },
    { text: ' max health ', color: 'red' },
    { text: '(', color: 'gray' },
    { score: { name: '@s', objective: bonusHp }, color: 'gray' },
    { text: `/${MAX_BONUS_HP})`, color: 'gray' },
  ])
  playsound('minecraft:ui.toast.challenge_complete', 'master', '@s')
  effect.give('@s', 'minecraft:instant_health', 1, 0, true)
})

/** Heart advancement reward: recount, then announce if the total went up */
const gained = MCFunction('hearts/gained', () => {
  const old = bonusHp('#old')
  const gain = bonusHpGained('@s')
  old.set(bonusHp('@s'))
  recompute()
  gain.set(bonusHp('@s'))
  gain.remove(old)
  _.if(gain.matches([1, null]), announce)
})

const display = (icon: string, title: string, description: unknown, extra: Record<string, unknown> = {}) => ({
  icon: { id: icon },
  title,
  description,
  frame: 'task',
  show_toast: false,
  announce_to_chat: false,
  hidden: false,
  ...extra,
})

Advancement('heart/root', {
  display: display('minecraft:golden_apple', 'Boss Hearts', `Beat bosses for up to ${hearts(MAX_BONUS_HP)} max health`, {
    background: 'minecraft:gui/advancements/backgrounds/adventure',
  }),
  criteria: { tick: { trigger: 'minecraft:tick' } },
} as any)

for (const heart of HEARTS) {
  const description: unknown[] = [`${heart.goal}\n`, { text: hearts(heart.hp), color: 'red' }]
  if (heart.covers) {
    const [source, extra] = heart.covers
    description.push({ text: ` (${hearts(heart.hp + extra)} without ${SOURCE_NAMES[source]})`, color: 'gray' })
  }
  if (heart.when?.[1] === 0) {
    description.push({ text: ` (none with ${SOURCE_NAMES[heart.when[0]]})`, color: 'gray' })
  }
  Advancement(`heart/${heart.id}`, {
    parent: ROOT,
    display: display(heart.icon, heart.title, description, {
      frame: 'challenge',
      announce_to_chat: true,
      hidden: heart.when?.[1] === 1,
    }),
    criteria: heart.criteria,
    requirements: [Object.keys(heart.criteria)],
    rewards: { function: gained },
  } as any)
}

/** Admin/testing: removes all of @s's boss hearts */
MCFunction('hearts/reset', () => {
  for (const heart of HEARTS) advancement.revoke('@s').only(advancementId(heart))
  recompute()
})

/** Players who left while packs/mods changed get their hearts recounted when they come back */
export const rejoin = MCFunction('hearts/rejoin', () => {
  left('@s').reset()
  recompute()
})

/** Respawning resets max health: put the bonus back and fill it up like a normal respawn */
export const respawn = MCFunction('hearts/respawn', () => {
  deaths('@s').reset()
  recompute()
  effect.give('@s', 'minecraft:instant_health', 1, 4, true)
})
