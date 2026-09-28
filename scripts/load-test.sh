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
  run 'datapack list enabled' 'forceload add 0 0'
  sleep 3
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
  # Campfire scan: an unlit campfire doesn't count, a lit soul campfire 3 blocks away does
  scan='execute positioned 8 64 8 store result score #scan yadventures.compat run function yadventures:campfire/scan'
  run 'setblock 11 64 8 minecraft:campfire[lit=false]' 'scoreboard players set #scan yadventures.compat 0' "$scan"
  check 'execute if score #scan yadventures.compat matches 0'
  run 'setblock 11 64 8 minecraft:soul_campfire' "$scan"
  check 'execute if score #scan yadventures.compat matches 1'
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
