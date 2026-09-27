# yAdventures: boss hearts + campfire rest
scoreboard objectives add yadventures.compat dummy
scoreboard objectives add yadventures.bonus_hp dummy
scoreboard objectives add yadventures.bonus_hp_gained dummy
scoreboard objectives add yadventures.campfire dummy
scoreboard objectives add yadventures.left minecraft.custom:minecraft.leave_game
scoreboard objectives add yadventures.deaths deathCount

function yadventures:compat/detect
execute as @a run function yadventures:hearts/recompute

schedule function yadventures:second 1s replace
