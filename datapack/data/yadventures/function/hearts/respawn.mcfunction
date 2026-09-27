# Put the bonus max health back after respawning, and fill it up like a normal respawn
scoreboard players reset @s yadventures.deaths
function yadventures:hearts/recompute
effect give @s minecraft:instant_health 1 4 true
