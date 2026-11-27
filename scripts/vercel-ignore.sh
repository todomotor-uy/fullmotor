#!/usr/bin/env bash
# Vercel "Ignored Build Step" for the projects built from this repo: the two
# sites, and the super admin panel in superadmin/.
#
#   bash scripts/vercel-ignore.sh <todomotor|nauti|superadmin>
#
# The superadmin project's Root Directory is superadmin/, so it runs this as
# `bash ../scripts/vercel-ignore.sh superadmin`; git paths are repo-relative
# either way.
#
# Exit 0 = skip the build, exit 1 = build (Vercel's convention).
#
# Rules, applied to the files changed since the last deployed commit:
#   - a redeploy of the last deployed commit always builds;
#   - docs-only files (*.md, resources/**) are ignored;
#   - nothing left            -> skip;
#   - a site: superadmin/** is ignored too; any file left that is NOT exclusive
#     to the OTHER site -> build; everything left belongs only to the other
#     site -> skip;
#   - superadmin: builds only when something under superadmin/ changed.
# Whenever the diff can't be computed, build (fail-safe).

set -u

SITE="${1:-}"
case "$SITE" in
  todomotor|nauti|superadmin) ;;
  *) echo "usage: $0 <todomotor|nauti|superadmin>" >&2; exit 1 ;;
esac

# Paths that only matter to Nauti.
NAUTI_ONLY='^(src/app/components/nauti/|src/app/styles/nauti\.css$|public/brand/nauti-)'
# Paths that only matter to TodoMotor.
TODOMOTOR_ONLY='^(src/app/(vehiculo|vehiculos|marcas|compare|guia-de-compra|guardados)/|src/lib/buying-guide/|src/data/|src/app/components/(guide|ads)/|public/brand/todomotor-|scripts/(acau-import|ads-check|guide-check|guide-images)\.ts$)'
# The super admin panel: its own app, its own project.
SUPERADMIN='^superadmin/'
# Paths that never affect any build.
IGNORABLE='(\.md$|^resources/)'

case "$SITE" in
  todomotor) OTHER_ONLY="$NAUTI_ONLY|$SUPERADMIN" ;;
  nauti)     OTHER_ONLY="$TODOMOTOR_ONLY|$SUPERADMIN" ;;
esac

BASE="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# Vercel clones shallowly; make sure the base commit is reachable.
if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  git fetch --quiet --deepen=200 origin 2>/dev/null || true
fi
if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo "[$SITE] base $BASE not available -> build"
  exit 1
fi

# Same commit as the last deploy: someone pressed Redeploy (usually to pick up
# a changed environment variable), so the build is wanted.
if [ "$(git rev-parse "${BASE}^{commit}")" = "$(git rev-parse HEAD)" ]; then
  echo "[$SITE] redeploy of $BASE -> build"
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

if [ "$SITE" = "superadmin" ]; then
  MINE="$(printf '%s\n' "$RELEVANT" | grep -E "$SUPERADMIN" || true)"
else
  MINE="$(printf '%s\n' "$RELEVANT" | grep -Ev "$OTHER_ONLY" || true)"
fi
if [ -n "$MINE" ]; then
  echo "[$SITE] relevant changes since $BASE -> build:"
  printf '  %s\n' $MINE | head -20
  exit 1
fi

echo "[$SITE] only other projects' files changed since $BASE -> skip"
exit 0
