import { Objective } from 'sandstone'

// Sandstone prefixes objective names with the namespace: 'compat' -> 'yadventures.compat'
export const compat = Objective.create('compat', 'dummy')
export const bonusHp = Objective.create('bonus_hp', 'dummy')
export const bonusHpGained = Objective.create('bonus_hp_gained', 'dummy')
export const campfire = Objective.create('campfire', 'dummy')
export const left = Objective.create('left', 'minecraft.custom:minecraft.leave_game')
export const deaths = Objective.create('deaths', 'deathCount')
