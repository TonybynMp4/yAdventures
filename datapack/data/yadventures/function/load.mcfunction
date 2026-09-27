# yAdventures: boss hearts + campfire rest
scoreboard objectives add yadventures.bonus_hp dummy
scoreboard objectives add yadventures.bonus_hp_gained dummy
scoreboard objectives add yadventures.campfire dummy

execute as @a run function yadventures:hearts/recompute

schedule function yadventures:second 1s replace
