#!/usr/bin/env sh
# Runs the visual browser tests inside the Playwright image the screenshot baselines are made in,
# so fonts and rendering match on every machine. Extra arguments (e.g. --update) go to Vitest.
# The repo is copied into the container so host node_modules (native binaries) are never used;
# screenshots, and the diffs of failures, are copied back.
set -eu

cd "$(dirname "$0")/.."
version=$(sed -n 's/^ *playwright: *\([0-9.]*\)$/\1/p' pnpm-workspace.yaml)
image="mcr.microsoft.com/playwright:v${version}-noble"

exec docker run --rm --init --ipc=host \
  -v "$PWD":/src \
  -v flixlix-cards-pnpm-store:/pnpm-store \
  -e CI=true \
  -e npm_config_store_dir=/pnpm-store \
  "$image" \
  sh -c '
    set -eu
    mkdir /work
    tar -C /src --exclude=node_modules --exclude=.git --exclude=.claude -cf - . | tar -C /work -xf -
    cd /work
    npm install --global --silent "pnpm@$(node -p "require(\"./package.json\").packageManager.split(\"@\")[1].split(\"+\")[0]")"
    pnpm install --frozen-lockfile --silent
    status=0
    pnpm --recursive --filter "./packages/flixlix-cards/**" run test:visual "$@" || status=$?
    find packages -type d \( -name __screenshots__ -o -name .vitest \) -not -path "*/node_modules/*" \
      | tar -cf - -T - | tar -C /src -xf -
    exit $status
  ' test-visual "$@"
