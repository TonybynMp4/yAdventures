# Lit campfire nearby: Resistance I, and 1 HP every 15 seconds
execute unless function yadventures:campfire/scan run return run scoreboard players set @s yadventures.campfire 0
effect give @s minecraft:resistance 2 0 true
scoreboard players add @s yadventures.campfire 1
execute if score @s yadventures.campfire matches 15.. run function yadventures:campfire/heal
