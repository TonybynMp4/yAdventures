import { Advancement, Data, MCFunction, NBT, _, advancement, effect, execute, raw, rel, returnCmd } from 'sandstone'
import { campfire, campfireCached, campfireScan, campfireX, campfireY, campfireZ } from './objectives.ts'

const RADIUS = 4
const SIGNAL_RADIUS = 8 // lit campfire on a hay bale
const BELOW = 2
const ABOVE = 1
const HEAL_EVERY = 15 // seconds
const SCAN_EVERY = 10 // seconds

// Each player caches one campfire's position. Every second the range is checked with score math,
// and the block only when in range. The cache is dropped once that block isn't a campfire anymore.

const args = Data('storage', 'yadventures:campfire', 'args')

/** Every block offset in range (signal fires only past RADIUS), nearest first so the scan usually stops early */
const offsets: [number, number, number][] = []
for (let x = -SIGNAL_RADIUS; x <= SIGNAL_RADIUS; x++)
  for (let y = -BELOW; y <= ABOVE; y++)
    for (let z = -SIGNAL_RADIUS; z <= SIGNAL_RADIUS; z++) offsets.push([x, y, z])
offsets.sort(([ax, ay, az], [bx, by, bz]) => ax * ax + ay * ay + az * az - (bx * bx + by * by + bz * bz))

const near = (x: number, z: number) => Math.max(Math.abs(x), Math.abs(z)) <= RADIUS

/** Reads @s's block position into #px #py #pz */
const readPos = MCFunction('campfire/read_pos', () => {
  Data('storage', 'yadventures:campfire', 'pos').set(Data('entity', '@s', 'Pos'))
  campfire('#px').set(Data('storage', 'yadventures:campfire', 'pos[0]'))
  campfire('#py').set(Data('storage', 'yadventures:campfire', 'pos[1]'))
  campfire('#pz').set(Data('storage', 'yadventures:campfire', 'pos[2]'))
})

/** Caches the campfire at offset $(x) $(y) $(z) from @s's block */
const found = MCFunction('campfire/found', () => {
  readPos()
  raw('$scoreboard players set @s yadventures.campfire_x $(x)')
  raw('$scoreboard players set @s yadventures.campfire_y $(y)')
  raw('$scoreboard players set @s yadventures.campfire_z $(z)')
  campfireX('@s').add(campfire('#px'))
  campfireY('@s').add(campfire('#py'))
  campfireZ('@s').add(campfire('#pz'))
  campfireCached('@s').set(1)
  returnCmd(1)
})

/** Looks for the nearest lit campfire around @s and caches it */
const scan = MCFunction('campfire/scan', () => {
  for (const [x, y, z] of offsets) {
    const block = near(x, z) ? '#minecraft:campfires[lit=true]' : '#minecraft:campfires[lit=true,signal_fire=true]'
    execute.if.block(rel(x, y, z), block).run.returnCmd.run.functionCmd(found, { x: NBT.int(x), y: NBT.int(y), z: NBT.int(z) })
  }
})

/** Block at $(x) $(y) $(z): 3 lit signal fire, 2 lit campfire, 1 unlit campfire, 0 anything else */
const probe = MCFunction('campfire/probe', () => {
  raw('$execute if block $(x) $(y) $(z) #minecraft:campfires[lit=true,signal_fire=true] run return 3')
  raw('$execute if block $(x) $(y) $(z) #minecraft:campfires[lit=true] run return 2')
  raw('$execute if block $(x) $(y) $(z) #minecraft:campfires run return 1')
  raw('return 0')
})

/** Returns 1 if @s's cached campfire is lit and in range, drops the cache if it's gone */
const check = MCFunction('campfire/check', () => {
  const dx = campfire('#dx')
  const dy = campfire('#dy')
  const dz = campfire('#dz')
  const state = campfire('#state')

  execute.unless.score(campfireCached('@s'), 'matches', 1).run.returnCmd(0)
  readPos()
  dx.set(campfireX('@s')).remove(campfire('#px'))
  dy.set(campfireY('@s')).remove(campfire('#py'))
  dz.set(campfireZ('@s')).remove(campfire('#pz'))
  execute.unless.score(dy, 'matches', [-BELOW, ABOVE]).run.returnCmd(0)
  execute.unless.score(dx, 'matches', [-SIGNAL_RADIUS, SIGNAL_RADIUS]).run.returnCmd(0)
  execute.unless.score(dz, 'matches', [-SIGNAL_RADIUS, SIGNAL_RADIUS]).run.returnCmd(0)

  // Only probed when in range, so the chunk is loaded
  args.select('x').set(campfireX('@s'), 'int', 1)
  args.select('y').set(campfireY('@s'), 'int', 1)
  args.select('z').set(campfireZ('@s'), 'int', 1)
  execute.store.result.score(state).run.functionCmd(probe, 'with', args)
  execute.if.score(state, 'matches', 0).run.returnCmd.run(() => {
    campfireCached('@s').set(0)
    campfireScan('@s').set(0)
    returnCmd(0)
  })
  execute.if.score(state, 'matches', 3).run.returnCmd(1)
  execute.if.score(state, 'matches', 2).if.score(dx, 'matches', [-RADIUS, RADIUS]).if.score(dz, 'matches', [-RADIUS, RADIUS]).run.returnCmd(1)
  returnCmd(0)
})

/** Returns 1 if a lit campfire is in range of @s, scanning for one every SCAN_EVERY seconds otherwise */
const nearby = MCFunction('campfire/nearby', () => {
  execute.if.function(check.name).run.returnCmd(1)
  const timer = campfireScan('@s')
  timer.remove(1)
  execute.if.score(timer, 'matches', [null, 0]).run.returnCmd.run(() => {
    timer.set(SCAN_EVERY)
    scan()
    returnCmd.run.functionCmd(check)
  })
  returnCmd(0)
})

// Cached positions are per dimension
Advancement('campfire/changed_dimension', {
  criteria: { changed_dimension: { trigger: 'minecraft:changed_dimension' } },
  rewards: {
    function: MCFunction('campfire/changed_dimension', () => {
      advancement.revoke('@s').only('yadventures:campfire/changed_dimension')
      campfireCached('@s').set(0)
      campfireScan('@s').set(0)
    }),
  },
} as any)

const heal = MCFunction('campfire/heal', () => {
  campfire('@s').set(0)
  // Regeneration I heals every 50 ticks, so 3 seconds (60 ticks) heals exactly 1 HP
  effect.give('@s', 'minecraft:regeneration', 3, 0, true)
})

/** Lit campfire nearby (farther on a hay bale): Resistance I, and 1 HP every 15 seconds */
export const tick = MCFunction('campfire/tick', () => {
  const timer = campfire('@s')
  execute.unless.function(nearby.name).run.returnCmd.run(() => timer.set(0))
  effect.give('@s', 'minecraft:resistance', 2, 0, true)
  timer.add(1)
  _.if(timer.matches([HEAL_EVERY, null]), heal)
})
