# Heart advancement reward: recount, then announce if the total went up
scoreboard players operation #old yadventures.bonus_hp = @s yadventures.bonus_hp
function yadventures:hearts/recompute
scoreboard players operation @s yadventures.bonus_hp_gained = @s yadventures.bonus_hp
scoreboard players operation @s yadventures.bonus_hp_gained -= #old yadventures.bonus_hp
execute if score @s yadventures.bonus_hp_gained matches 1.. run function yadventures:hearts/announce
