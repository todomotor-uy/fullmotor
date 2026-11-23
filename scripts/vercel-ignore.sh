#!/usr/bin/env bash
# Vercel "Ignored Build Step" for the two sites built from this repo.
#
#   bash scripts/vercel-ignore.sh <todomotor|nauti>
#
# Exit 0 = skip the build, exit 1 = build (Vercel's convention).
#
# Rules, applied to the files changed since the last deployed commit:
#   - docs-only files (*.md, resources/**) are ignored;
#   - nothing left            -> skip;
#   - any file left that is NOT exclusive to the OTHER site -> build;
#   - everything left belongs only to the other site       -> skip.
# Whenever the diff can't be computed, build (fail-safe).

set -u

SITE="${1:-}"
case "$SITE" in
  todomotor|nauti) ;;
  *) echo "usage: $0 <todomotor|nauti>" >&2; exit 1 ;;
esac

# Paths that only matter to Nauti.
NAUTI_ONLY='^(src/app/components/nauti/|src/app/styles/nauti\.css$|public/brand/nauti-)'
# Paths that only matter to TodoMotor.
TODOMOTOR_ONLY='^(src/app/(vehiculo|vehiculos|marcas|compare|guia-de-compra|guardados)/|src/lib/buying-guide/|src/data/|src/app/components/(guide|ads)/|public/brand/todomotor-|scripts/(acau-import|ads-check|guide-check|guide-images)\.ts$)'
# Paths that never affect either build.
IGNORABLE='(\.md$|^resources/)'

if [ "$SITE" = "todomotor" ]; then OTHER_ONLY="$NAUTI_ONLY"; else OTHER_ONLY="$TODOMOTOR_ONLY"; fi

BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# Vercel clones shallowly; make sure the base commit is reachable.
if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  git fetch --quiet --deepen=200 origin 2>/dev/null || true
fi
if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo "[$SITE] base $BASE not available -> build"
  exit 1
fi

if ! CHANGED="$(git diff --name-only "$BASE" HEAD 2>/dev/null)"; then
  echo "[$SITE] git diff failed -> build"
  exit 1
fi

RELEVANT="$(printf '%s\n' "$CHANGED" | grep -v '^$' | grep -Ev "$IGNORABLE" || true)"
if [ -z "$RELEVANT" ]; then
  echo "[$SITE] only docs changed since $BASE -> skip"
  exit 0
fi

MINE="$(printf '%s\n' "$RELEVANT" | grep -Ev "$OTHER_ONLY" || true)"
if [ -n "$MINE" ]; then
  echo "[$SITE] relevant changes since $BASE -> build:"
  printf '  %s\n' $MINE | head -20
  exit 1
fi

echo "[$SITE] only the other site's files changed since $BASE -> skip"
exit 0
