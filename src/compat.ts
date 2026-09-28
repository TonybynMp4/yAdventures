import { MCFunction, Tag, execute, raw } from 'sandstone'
import { compat } from './objectives.ts'

/** Optional boss sources, detected once per load. */
export const sources = {
  wildfire: compat('$wildfire'),
  iceologer: compat('$iceologer'),
  illusioner: compat('$illusioner'),
  invoker: compat('$invoker'),
}

// Mod entities. `required: false` keeps the pack loading without the mods.
const modTag = (name: string, ids: string[]) =>
  Tag('entity_type', name, ids.map((id) => ({ id: id as any, required: false })))

export const wildfireMobs = modTag('wildfire', ['friendsandfoes:wildfire', 'nekomasfixed:wildfire'])
export const iceologerMobs = modTag('iceologer', ['friendsandfoes:iceologer'])
export const illusionerMobs = modTag('illusioner', ['friendsandfoes:illusioner'])
export const invokerMobs = modTag('invoker', ['illagerexp:invoker', 'illagerinvasion:invoker'])

// yAdventures-bosses provides yadventures:compat/bosses_loaded; without it the tag is empty
const bossesPack = Tag('function', 'compat/bosses', [{ id: 'yadventures:compat/bosses_loaded', required: false }])

// Returns 1 if entity type $(id) is registered. Macro lines are parsed when run,
// so a missing mod just fails this function instead of logging a load error.
const probeEntityType = MCFunction('compat/probe_entity_type', () => {
  raw('$execute unless entity @s[type=$(id)] run return 1')
  raw('$execute if entity @s[type=$(id)] run return 1')
})

/** Which mods (by entity id) provide each source. */
const MOD_PROBES: [keyof typeof sources, string][] = [
  ['wildfire', 'friendsandfoes:wildfire'],
  ['wildfire', 'nekomasfixed:wildfire'],
  ['iceologer', 'friendsandfoes:iceologer'],
  ['illusioner', 'friendsandfoes:illusioner'],
  ['invoker', 'illagerexp:invoker'],
  ['invoker', 'illagerinvasion:invoker'],
]

/**
 * Interface for boss datapacks (e.g. yAdventures-bosses):
 * - function yadventures:compat/bosses_loaded (just `return 1`) marks the pack as installed
 *   (it provides the Wildfire, Iceologer and Illusioner)
 * - entity tags yadventures.boss.wildfire / yadventures.boss.iceologer on the boss mobs
 * - entity tag yadventures.boss.illusion on fake illusioner clones (so they don't count)
 */
export const detect = MCFunction('compat/detect', () => {
  for (const source of Object.values(sources)) source.set(0)

  for (const source of [sources.wildfire, sources.iceologer, sources.illusioner]) {
    execute.if.function(`${bossesPack}`).run(() => source.set(1))
  }

  for (const [name, id] of MOD_PROBES) {
    const source = sources[name]
    execute.if.score(source, 'matches', 0).store.result.score(source).run.functionCmd(probeEntityType, { id })
  }
})
