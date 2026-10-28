#!/bin/zsh
# The study station, started by a double-click (28 Oct 2026: Jon asked for an
# easier setup). Keeps the Mac awake while it runs, and starts the station
# again if it ever stops. Close this window to stop it.
cd "${0:A:h}"
# A folder that came by AirDrop is marked as downloaded; clear the mark once so
# macOS lets the station's parts run.
xattr -dr com.apple.quarantine . 2>/dev/null

# Node: the installer's place or Homebrew's, whichever this Mac has.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  This Mac needs Node first (one installer, once)."
  echo "  The download page is opening: pick the macOS Installer, run it,"
  echo "  then double-click Start the Study again."
  echo ""
  open "https://nodejs.org/en/download"
  read -k 1 "?  Press any key to close."
  exit 1
fi

# The parts come in the zip; fetch them only if they are missing.
if [ ! -d node_modules/firebase ]; then
  echo "Getting the station's parts (once, needs the internet)…"
  npm install --no-audit --no-fund || { read -k 1 "?  That did not work. Press any key to close."; exit 1 }
fi

if [ ! -f .env ]; then
  echo ""
  echo "  The settings file (.env) is missing from this folder."
  echo "  Ask Claude Code for a new copy of the study station."
  echo ""
  read -k 1 "?  Press any key to close."
  exit 1
fi

echo ""
echo "  The study station is starting. Leave this window open."
echo "  On the workshop's Study test page it should say: connected."
echo ""
while true; do
  caffeinate -dimsu node station.mjs
  echo "The station stopped. Starting it again in 5 seconds (close this window to stop it)."
  sleep 5
done
