#!/usr/bin/env bash
# Scaffold a new lab from the template.
# Usage: ./scripts/new-lab.sh 02-xss-reflected
set -euo pipefail

ID="${1:-}"
if [[ -z "$ID" ]]; then
  echo "Usage: $0 <lab-id>   e.g. $0 02-xss-reflected" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/labs/$ID"

if [[ -e "$DEST" ]]; then
  echo "Lab already exists: $DEST" >&2
  exit 1
fi

cp -R "$ROOT/labs/_template" "$DEST"
# Stamp the id into the new manifest.
sed -i '' "s/\"id\": \"00-template\"/\"id\": \"$ID\"/" "$DEST/lab.json" 2>/dev/null \
  || sed -i "s/\"id\": \"00-template\"/\"id\": \"$ID\"/" "$DEST/lab.json"

echo "Created $DEST"
echo "Next: fill in lab.json, vulnerable/, fixed/, exploit/, README.md"
