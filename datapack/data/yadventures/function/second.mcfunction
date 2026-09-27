# Players who left while packs/mods changed get their hearts recounted when they come back
execute as @a[scores={yadventures.left=1..}] run function yadventures:hearts/rejoin

# Respawn resets max health; @e only matches living players, so this waits until they respawn
execute as @e[type=minecraft:player,scores={yadventures.deaths=1..}] run function yadventures:hearts/respawn

execute as @e[type=minecraft:player,gamemode=!spectator] at @s run function yadventures:campfire/tick

schedule function yadventures:second 1s replace
