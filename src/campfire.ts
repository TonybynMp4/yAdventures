import { MCFunction, _, effect, execute, rel } from 'sandstone'
import { campfire } from './objectives.ts'

const RADIUS = 4
const BELOW = 2
const ABOVE = 1
const HEAL_EVERY = 15 // seconds

// Every block offset in range, nearest first so the scan usually stops early
const offsets: [number, number, number][] = []
for (let x = -RADIUS; x <= RADIUS; x++)
  for (let y = -BELOW; y <= ABOVE; y++)
    for (let z = -RADIUS; z <= RADIUS; z++) offsets.push([x, y, z])
offsets.sort(([ax, ay, az], [bx, by, bz]) => ax * ax + ay * ay + az * az - (bx * bx + by * by + bz * bz))

/** Returns 1 if a lit campfire (soul campfires too) is near the executing position. */
const scan = MCFunction('campfire/scan', () => {
  for (const [x, y, z] of offsets) {
    execute.if.block(rel(x, y, z), '#minecraft:campfires[lit=true]').run.returnCmd(1)
  }
})

const heal = MCFunction('campfire/heal', () => {
  campfire('@s').set(0)
  // Regeneration I heals every 50 ticks, so 3 seconds (60 ticks) heals exactly 1 HP
  effect.give('@s', 'minecraft:regeneration', 3, 0, true)
})

/** Lit campfire nearby: Resistance I, and 1 HP every 15 seconds */
export const tick = MCFunction('campfire/tick', () => {
  const timer = campfire('@s')
  execute.unless.function(scan.name).run.returnCmd.run(() => timer.set(0))
  effect.give('@s', 'minecraft:resistance', 2, 0, true)
  timer.add(1)
  _.if(timer.matches([HEAL_EVERY, null]), heal)
})
