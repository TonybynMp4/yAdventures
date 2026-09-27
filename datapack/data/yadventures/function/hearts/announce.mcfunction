title @s times 10 60 20
title @s title {text:"❤",color:"red"}
title @s subtitle [{text:"+",color:"red"},{score:{name:"@s",objective:"yadventures.bonus_hp_gained"},color:"red"},{text:" max health ",color:"red"},{text:"(",color:"gray"},{score:{name:"@s",objective:"yadventures.bonus_hp"},color:"gray"},{text:"/20)",color:"gray"}]
playsound minecraft:ui.toast.challenge_complete master @s
effect give @s minecraft:instant_health 1 0 true
