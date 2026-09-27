# Recounts @s's bonus max health (in HP, 2 = one heart) from their heart advancements
# and the installed boss sources. Always totals 20 HP when everything is done.
scoreboard players set @s yadventures.bonus_hp 0

# Wither: 2, or 4 without a Wildfire source. Wildfire: 2
execute if entity @s[advancements={yadventures:heart/wither=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if score $wildfire yadventures.compat matches 0 if entity @s[advancements={yadventures:heart/wither=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if score $wildfire yadventures.compat matches 1 if entity @s[advancements={yadventures:heart/wildfire=true}] run scoreboard players add @s yadventures.bonus_hp 2

# Creaking: 1, or 2 without an Iceologer source. Iceologer: 1
execute if entity @s[advancements={yadventures:heart/creaking=true}] run scoreboard players add @s yadventures.bonus_hp 1
execute if score $iceologer yadventures.compat matches 0 if entity @s[advancements={yadventures:heart/creaking=true}] run scoreboard players add @s yadventures.bonus_hp 1
execute if score $iceologer yadventures.compat matches 1 if entity @s[advancements={yadventures:heart/iceologer=true}] run scoreboard players add @s yadventures.bonus_hp 1

# Bastion: 1, or 2 without an Illusioner source. Illusioner: 1
execute if entity @s[advancements={yadventures:heart/bastion=true}] run scoreboard players add @s yadventures.bonus_hp 1
execute if score $illusioner yadventures.compat matches 0 if entity @s[advancements={yadventures:heart/bastion=true}] run scoreboard players add @s yadventures.bonus_hp 1
execute if score $illusioner yadventures.compat matches 1 if entity @s[advancements={yadventures:heart/illusioner=true}] run scoreboard players add @s yadventures.bonus_hp 1

# Mansion: 2 for the Invoker, or for an evoker killed in a mansion without an Invoker source
execute if score $invoker yadventures.compat matches 1 if entity @s[advancements={yadventures:heart/invoker=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if score $invoker yadventures.compat matches 0 if entity @s[advancements={yadventures:heart/mansion_evoker=true}] run scoreboard players add @s yadventures.bonus_hp 2

execute if entity @s[advancements={yadventures:heart/ender_dragon=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/elder_guardian=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/warden=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/ominous_vault=true}] run scoreboard players add @s yadventures.bonus_hp 2
execute if entity @s[advancements={yadventures:heart/raid=true}] run scoreboard players add @s yadventures.bonus_hp 2

attribute @s minecraft:max_health modifier remove yadventures:boss_hearts
execute store result storage yadventures:hearts amount double 1 run scoreboard players get @s yadventures.bonus_hp
execute if score @s yadventures.bonus_hp matches 1.. run function yadventures:hearts/apply with storage yadventures:hearts
