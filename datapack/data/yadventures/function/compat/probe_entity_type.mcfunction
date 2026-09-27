# Returns 1 if entity type $(id) is registered. Macro lines are parsed when run,
# so a missing mod just fails this function instead of logging a load error.
$execute unless entity @s[type=$(id)] run return 1
$execute if entity @s[type=$(id)] run return 1
