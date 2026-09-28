import type { Score } from 'sandstone'
import { Advancement, Data, MCFunction, Selector, _, advancement, attribute, effect, execute, playsound, raw, title } from 'sandstone'
import { bonusHp, bonusHpGained, deaths, left } from './objectives.ts'
import { sources, iceologerMobs, illusionerMobs, invokerMobs, wildfireMobs } from './compat.ts'

const MAX_BONUS_HP = 20
const MODIFIER = 'yadventures:boss_hearts'

type Predicate = Record<string, unknown>

type Heart = {
  /** Advancement `yadventures:heart/<id>` */
  id: string
  /** Any one of these grants the advancement */
  criteria: Record<string, unknown>
  hp: number
  /** Only counts while the source is installed (1) or missing (0) */
  when?: [Score, 0 | 1]
  /** Extra HP while the source is missing, covering its boss */
  covers?: [Score, number]
}

const killed = (predicate: Predicate) => ({
  trigger: 'minecraft:player_killed_entity',
  conditions: { entity: { type: 'minecraft:entity_properties', entity: 'this', predicate } },
})
const killedType = (type: string) => killed({ 'minecraft:entity_type': type })
const killedTagged = (tag: string) => killed({ 'minecraft:entity_tags': { all_of: [tag] } })

// Totals 20 HP with any combination of optional sources installed
const HEARTS: Heart[] = [
  { id: 'wither', criteria: { wither: killedType('minecraft:wither') }, hp: 2, covers: [sources.wildfire, 2] },
  {
    id: 'wildfire',
    criteria: { datapack: killedTagged('yadventures.boss.wildfire'), mod: killedType(`${wildfireMobs}`) },
    hp: 2,
    when: [sources.wildfire, 1],
  },
  { id: 'creaking', criteria: { creaking: killedType('minecraft:creaking') }, hp: 1, covers: [sources.iceologer, 1] },
  {
    id: 'iceologer',
    criteria: { datapack: killedTagged('yadventures.boss.iceologer'), mod: killedType(`${iceologerMobs}`) },
    hp: 1,
    when: [sources.iceologer, 1],
  },
  {
    id: 'bastion',
    criteria: {
      bastion: {
        trigger: 'minecraft:player_generates_container_loot',
        conditions: { loot_tables: 'minecraft:chests/bastion_treasure' },
      },
    },
    hp: 1,
    covers: [sources.illusioner, 1],
  },
  {
    id: 'illusioner',
    criteria: {
      vanilla: killed({
        'minecraft:entity_type': 'minecraft:illusioner',
        'minecraft:entity_tags': { none_of: ['yadventures.boss.illusion'] },
      }),
      // Friends & Foes illusioner clones are the same entity type
      mod: killed({ 'minecraft:entity_type': `${illusionerMobs}`, 'minecraft:nbt': '{IsIllusion:0b}' }),
    },
    hp: 1,
    when: [sources.illusioner, 1],
  },
  { id: 'invoker', criteria: { invoker: killedType(`${invokerMobs}`) }, hp: 2, when: [sources.invoker, 1] },
  {
    id: 'mansion_evoker',
    criteria: {
      mansion_evoker: killed({
        'minecraft:entity_type': 'minecraft:evoker',
        'minecraft:location': { structures: 'minecraft:mansion' },
      }),
    },
    hp: 2,
    when: [sources.invoker, 0],
  },
  { id: 'ender_dragon', criteria: { ender_dragon: killedType('minecraft:ender_dragon') }, hp: 2 },
  { id: 'elder_guardian', criteria: { elder_guardian: killedType('minecraft:elder_guardian') }, hp: 2 },
  { id: 'warden', criteria: { warden: killedType('minecraft:warden') }, hp: 2 },
  {
    id: 'ominous_vault',
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
  { id: 'raid', criteria: { raid: { trigger: 'minecraft:hero_of_the_village' } }, hp: 2 },
]

const advancementId = (heart: Heart) => `yadventures:heart/${heart.id}`
const hasHeart = (heart: Heart) => Selector('@s', { advancements: { [advancementId(heart)]: true } })

const applyArgs = Data('storage', 'yadventures:hearts', 'apply')

const apply = MCFunction('hearts/apply', () => {
  raw(`$attribute @s minecraft:max_health modifier add ${MODIFIER} $(amount) add_value`)
})

/** Recounts @s's bonus max health (in HP, 2 = one heart) from their heart advancements and the installed sources. */
export const recompute = MCFunction('hearts/recompute', () => {
  const hp = bonusHp('@s')
  hp.set(0)

  for (const heart of HEARTS) {
    const counts = heart.when ? execute.if.score(heart.when[0], 'matches', heart.when[1]) : execute
    counts.if.entity(hasHeart(heart)).run(() => hp.add(heart.hp))
    if (heart.covers) {
      const [source, extra] = heart.covers
      execute.if.score(source, 'matches', 0).if.entity(hasHeart(heart)).run(() => hp.add(extra))
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

for (const heart of HEARTS) {
  Advancement(`heart/${heart.id}`, {
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
