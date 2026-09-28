import { MCFunction, execute, schedule } from 'sandstone'
import { detect } from './compat.ts'
import { recompute, rejoin, respawn } from './hearts.ts'
import { tick as campfireTick } from './campfire.ts'

// yAdventures: boss hearts + campfire rest

const second = MCFunction('second', () => {
  execute.as('@a[scores={yadventures.left=1..}]').run(rejoin)
  // @e only matches living players, so this waits until they respawn
  execute.as('@e[type=minecraft:player,scores={yadventures.deaths=1..}]').run(respawn)
  execute.as('@e[type=minecraft:player,gamemode=!spectator]').at('@s').run(campfireTick)
  schedule.function(second, '1s', 'replace')
})

MCFunction('load', () => {
  detect()
  execute.as('@a').run(recompute)
  schedule.function(second, '1s', 'replace')
}, { runOnLoad: true })
