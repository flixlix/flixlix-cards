#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$PWD}"
MODEL="${MODEL:-sonnet}"
MAX_SPEND_USD="${MAX_SPEND_USD:-15}"
LOG_DIR="$REPO/plans/run-$(date +%Y%m%d-%H%M%S)"

cd "$REPO"
[ -d plans ] || { echo "no plans/ directory in $REPO"; exit 1; }
mkdir -p "$LOG_DIR"
spent=0

for plan in plans/[0-9]*.md; do
  [ -e "$plan" ] || { echo "no numbered plans found"; break; }
  id=$(basename "$plan" | grep -oE '^[0-9]+')
  echo "=== executing plan $id ($plan) ==="
  out="$LOG_DIR/$id.json"
  if ! claude --bare -p "/improve execute $id" \
        --model "$MODEL" \
        --permission-mode bypassPermissions \
        --output-format json > "$out" 2>>"$LOG_DIR/errors.log"; then
    echo "plan $id failed — see $LOG_DIR/errors.log"; continue
  fi
  cost=$(jq -r '.total_cost_usd // .cost.total_cost // 0' "$out")
  spent=$(echo "$spent + $cost" | bc -l)
  printf 'plan %s done — cost $%.4f, cumulative $%.4f\n' "$id" "$cost" "$spent"
  (( $(echo "$spent >= $MAX_SPEND_USD" | bc -l) )) && { echo "spend cap hit — stopping"; break; }
done

echo "Done. Review plans/README.md, merge approved diffs, run /improve reconcile."