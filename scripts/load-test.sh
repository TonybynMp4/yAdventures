#!/usr/bin/env bash
# Boots a 26.3 server with the built datapack, checks load, detection, max health and the campfire
# scan, and fails on any load or runtime error.
# Usage: scripts/load-test.sh [workdir]   (needs Java 25 on PATH and a built .sandstone/output)
set -euo pipefail
cd "$(dirname "$0")/.."
PACK=${PACK:-$PWD/.sandstone/output/datapack}
DIR=${1:-/tmp/yadv-ci}
JAR_URL=https://piston-data.mojang.com/v1/objects/33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c/server.jar
JAR_SHA1=33680f5f2ac32864d6d7cf5e56a705fdb3e05f4c

[ -f "$PACK/pack.mcmeta" ] || { echo "no built datapack, run the build first"; exit 1; }
mkdir -p "$DIR"; cd "$DIR"
if ! echo "$JAR_SHA1  server.jar" | sha1sum -c --status 2>/dev/null; then
  curl -fsSL -o server.jar "$JAR_URL"
  echo "$JAR_SHA1  server.jar" | sha1sum -c --quiet
fi
rm -rf world log.txt
mkdir -p world/datapacks
cp -r "$PACK" world/datapacks/yadv
echo eula=true > eula.txt
printf '%s\n' level-seed=12345 pause-when-empty-seconds=0 server-port=25598 > server.properties

# Commands go in through a fifo; the server's stdout goes to log.txt
rm -f in; mkfifo in
java -Xmx2G -jar server.jar nogui < in > log.txt 2>&1 &
PID=$!
exec 3> in
run() { printf '%s\n' "$@" >&3; }
for _ in $(seq 300); do
  grep -q 'Done (' log.txt && break
  kill -0 $PID 2>/dev/null || break
  sleep 1
done

# Each `execute if/unless ...` without `run` logs "Test passed" when it holds
CHECKS=0
check() { run "$1"; CHECKS=$((CHECKS + 1)); }
if kill -0 $PID 2>/dev/null; then
  # Chunks -1..0 on both axes; slow runners need more than a few seconds to load them
  run 'datapack list enabled' 'forceload add -16 -16 15 15'
  for _ in $(seq 60); do
    run 'execute if loaded -16 0 -16 if loaded 15 0 15 if loaded -16 0 15 if loaded 15 0 -16 run say chunks loaded'
    sleep 1
    grep -q 'chunks loaded' log.txt && break
  done
  # No optional boss source installed
  for source in wildfire iceologer illusioner invoker; do
    check "execute if score \$$source yadventures.compat matches 0"
  done
  # Bonus max health: +4 HP applied, then a recount with no advancements puts it back to 20
  run 'summon minecraft:mannequin 8 64 8 {Tags:["yadv.test"],NoGravity:1b}' \
    'data modify storage yadventures:hearts apply.amount set value 4d' \
    'execute as @e[tag=yadv.test] run function yadventures:hearts/apply with storage yadventures:hearts apply' \
    'execute store result score #hp yadventures.compat run attribute @e[tag=yadv.test,limit=1] minecraft:max_health get'
  check 'execute if score #hp yadventures.compat matches 24'
  run 'execute as @e[tag=yadv.test] run function yadventures:hearts/recompute' \
    'execute store result score #hp yadventures.compat run attribute @e[tag=yadv.test,limit=1] minecraft:max_health get'
  check 'execute if score #hp yadventures.compat matches 20'
  # Campfire: an unlit campfire doesn't count, a lit soul campfire 3 blocks away does and gets cached
  as='execute as @e[tag=yadv.test] at @s'
  nearby="$as store result score #near yadventures.compat run function yadventures:campfire/nearby"
  rescan="$as run scoreboard players set @s yadventures.campfire_scan 0"
  run 'setblock 11 64 8 minecraft:campfire[lit=false]' "$rescan" "$nearby"
  check 'execute if score #near yadventures.compat matches 0'
  run 'setblock 11 64 8 minecraft:soul_campfire' "$rescan" "$nearby"
  check 'execute if score #near yadventures.compat matches 1'
  check 'execute if score @e[tag=yadv.test,limit=1] yadventures.campfire_x matches 11'
  # 6 blocks away: out of range, but still cached; a hay bale underneath makes it a signal fire
  run 'tp @e[tag=yadv.test] 5 64 8' "$nearby"
  check 'execute if score #near yadventures.compat matches 0'
  check 'execute if score @e[tag=yadv.test,limit=1] yadventures.campfire_cached matches 1'
  run 'setblock 11 63 8 minecraft:hay_block' "$nearby"
  check 'execute if score #near yadventures.compat matches 1'
  # Gone: dropped from the cache
  run 'setblock 11 64 8 minecraft:air' "$nearby"
  check 'execute if score #near yadventures.compat matches 0'
  check 'execute if score @e[tag=yadv.test,limit=1] yadventures.campfire_cached matches 0'
  # Scan past 4 blocks: a lit campfire 7 blocks away only counts on a hay bale
  run 'setblock 12 63 8 minecraft:stone' 'setblock 12 64 8 minecraft:campfire' "$rescan" "$nearby"
  check 'execute if score #near yadventures.compat matches 0'
  run 'setblock 12 63 8 minecraft:hay_block' "$rescan" "$nearby"
  check 'execute if score #near yadventures.compat matches 1'
  check 'execute if score @e[tag=yadv.test,limit=1] yadventures.campfire_x matches 12'
  # Negative coordinates: -7.5 is block -8, so the campfire 2 blocks west is at -10
  run 'tp @e[tag=yadv.test] -7.5 64 -7.5' 'setblock -10 64 -8 minecraft:campfire' "$rescan" "$nearby"
  check 'execute if score #near yadventures.compat matches 1'
  check 'execute if score @e[tag=yadv.test,limit=1] yadventures.campfire_x matches -10'
  run 'kill @e[tag=yadv.test]' 'reload'
  sleep 3
  run stop
fi
exec 3>&-
wait $PID || true

cat log.txt
echo '----'
fail=0
grep -q 'Done (' log.txt || { echo 'server did not finish starting'; fail=1; }
grep -q 'file/yadv' log.txt || { echo 'datapack not enabled'; fail=1; }
passed=$(grep -c 'Test passed' log.txt || true)
[ "$passed" = "$CHECKS" ] || { echo "$passed of $CHECKS checks passed"; fail=1; }
if grep -Ei '/(WARN|ERROR)\]|exception|failed|couldn.t|unknown or incomplete|incorrect argument|<--\[HERE\]' log.txt \
  | grep -v "Can't keep up" | grep -v 'Ambiguity between arguments'; then
  echo 'errors or warnings in the log (above)'; fail=1
fi
[ $fail = 0 ] && echo 'load test passed'
exit $fail
