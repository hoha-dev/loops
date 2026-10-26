#!/usr/bin/env bash
# Runs every eval under evals/skills/*.json against this repo with headless Claude Code and records the
# pass rate and cost to evals/last-run.md. Bash on Windows Git Bash and macOS; JSON handled by node.
#
#   bash evals/run.sh                 # all evals, all phrasings
#   bash evals/run.sh start           # only evals whose file name contains "start"
#   LOOPS_EVAL_MAX=1 bash evals/run.sh   # stop after N phrasings (smoke run, cost control)
#
# Needs: `claude` on PATH. With ANTHROPIC_API_KEY set the run uses --bare (recommended: nothing of this
# machine's CLAUDE.md or hooks is loaded). Without a key it falls back to the logged-in session, which
# loads the machine's context and costs more. LOOPS_PLUGIN_DIR points at the loops plugin checkout so
# the /loops:* skills exist in the headless session; default: the parent of this script's repo if it
# contains .claude-plugin, else unset (skills come from the installed plugin).
set -u
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/.." && pwd)"
filter="${1:-}"
max="${LOOPS_EVAL_MAX:-0}"
plugin="${LOOPS_PLUGIN_DIR:-}"
[ -z "$plugin" ] && [ -d "$repo/.claude-plugin" ] && plugin="$repo"
bare=""
[ -n "${ANTHROPIC_API_KEY:-}" ] && bare="--bare"
out="$here/last-run.md"
tmp="$here/.result.json"
n=0; pass=0; fail=0; cost=0
rows=""
for f in "$here"/skills/*.json; do
  [ -e "$f" ] || continue
  case "$(basename "$f")" in *"$filter"*) ;; *) continue ;; esac
  count=$(node -e "console.log(require(process.argv[1]).phrasings.length)" "$f")
  i=0
  while [ "$i" -lt "$count" ]; do
    if [ "$max" != "0" ] && [ "$n" -ge "$max" ]; then break 2; fi
    prompt=$(node -e "console.log(require(process.argv[1]).phrasings[Number(process.argv[2])])" "$f" "$i")
    tools=$(node -e "console.log((require(process.argv[1]).allowed_tools||['Read','Grep','Glob']).join(','))" "$f")
    ( cd "$repo" && claude $bare -p "$prompt" --output-format json --allowedTools "$tools" --permission-prompts none ${plugin:+--plugin-dir "$plugin"} > "$tmp" 2>/dev/null )
    if node "$here/check.mjs" "$f" "$tmp" "$i" > "$tmp.log" 2>&1; then r=PASS; pass=$((pass+1)); else r=FAIL; fail=$((fail+1)); fi
    c=$(node -e "try{console.log(require(process.argv[1]).total_cost_usd||0)}catch{console.log(0)}" "$tmp")
    cost=$(node -e "console.log((Number(process.argv[1])+Number(process.argv[2])).toFixed(4))" "$cost" "$c")
    rows="$rows| $(basename "$f" .json) | $i | $r | $c |\n"
    echo "$r $(basename "$f" .json) #$i (cost $c)"; cat "$tmp.log" | grep -v '^{' | sed 's/^/     /'
    n=$((n+1)); i=$((i+1))
  done
done
rm -f "$tmp" "$tmp.log"
{
  echo "# evals — last run"; echo
  echo "- Date: $(date +%Y-%m-%d) · mode: ${bare:-logged-in session} · plugin: ${plugin:-installed}"
  echo "- Phrasings run: $n · pass: $pass · fail: $fail · pass rate: $(node -e "console.log(process.argv[1]==0?'n/a':Math.round(100*process.argv[2]/process.argv[1])+'%')" "$n" "$pass") · total cost: $cost USD"; echo
  echo "| eval | phrasing | result | cost USD |"; echo "| --- | --- | --- | --- |"; printf "%b" "$rows"
} > "$out"
echo "wrote $out — $pass/$n passed, $cost USD"
[ "$fail" -eq 0 ]
