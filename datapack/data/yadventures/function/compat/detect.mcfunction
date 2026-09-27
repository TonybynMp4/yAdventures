# Runs once per load: which optional boss sources are installed?
#
# Interface for boss datapacks (e.g. yAdventures-bosses):
# - function yadventures:compat/bosses_loaded (just `return 1`) marks the pack as installed
#   (it provides the Wildfire, Iceologer and Illusioner)
# - entity tags yadventures.boss.wildfire / yadventures.boss.iceologer on the boss mobs
# - entity tag yadventures.boss.illusion on fake illusioner clones (so they don't count)
scoreboard players set $wildfire yadventures.compat 0
scoreboard players set $iceologer yadventures.compat 0
scoreboard players set $illusioner yadventures.compat 0
scoreboard players set $invoker yadventures.compat 0

# yAdventures-bosses datapack
execute if function #yadventures:compat/bosses run scoreboard players set $wildfire yadventures.compat 1
execute if function #yadventures:compat/bosses run scoreboard players set $iceologer yadventures.compat 1
execute if function #yadventures:compat/bosses run scoreboard players set $illusioner yadventures.compat 1

# Mods: Friends & Foes, Nekoma's Fixed, Illager Expansion Recrafted, Illager Invasion
execute if score $wildfire yadventures.compat matches 0 store result score $wildfire yadventures.compat run function yadventures:compat/probe_entity_type {id:"friendsandfoes:wildfire"}
execute if score $wildfire yadventures.compat matches 0 store result score $wildfire yadventures.compat run function yadventures:compat/probe_entity_type {id:"nekomasfixed:wildfire"}
execute if score $iceologer yadventures.compat matches 0 store result score $iceologer yadventures.compat run function yadventures:compat/probe_entity_type {id:"friendsandfoes:iceologer"}
execute if score $illusioner yadventures.compat matches 0 store result score $illusioner yadventures.compat run function yadventures:compat/probe_entity_type {id:"friendsandfoes:illusioner"}
execute if score $invoker yadventures.compat matches 0 store result score $invoker yadventures.compat run function yadventures:compat/probe_entity_type {id:"illagerexp:invoker"}
execute if score $invoker yadventures.compat matches 0 store result score $invoker yadventures.compat run function yadventures:compat/probe_entity_type {id:"illagerinvasion:invoker"}
