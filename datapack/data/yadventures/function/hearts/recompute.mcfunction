# Recounts @s's bonus max health (in HP, 2 = one heart) from their heart advancements.
# Always totals 20 HP when everything is done.
scoreboard players set @s yadventures.bonus_hp 0

execute if entity @s[advancements={yadventures:heart/wither=true}] run scoreboard players add @s yadventures.bonus_hp 4
execute if entity @s[advancements={yadventures:heart/creaking=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/bastion=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/mansion_evoker=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/ender_dragon=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/elder_guardian=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/warden=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/ominous_vault=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/raid=true}] run scoreboard players add @s yadventures.bonus_hp 2

attribute @s minecraft:max_health modifier remove yadventures:boss_hearts
execute store result storage yadventures:hearts amount double 1 run scoreboard players get @s yadventures.bonus_hp
execute if score @s yadventures.bonus_hp matches 1.. run function yadventures:hearts/apply with storage yadventures:hearts
