#!/bin/zsh
# The brain, started by a double-click (card 475; 12 Nov 2026, Jon: the setup
# must be simple). It runs the cue relay (cues.mjs) in this window, keeps the
# Mac awake for as long as the window is open, starts the relay again if it
# ever stops, and opens the Orangerie's page, since this Mac's browser is the
# Orangerie's screen. Close this window to stop it. Start the brain on the
# Desktop is a link to this file, so it is always the current one.
cd "${0:A:h}" || exit 1

# Node: the installer's place or Homebrew's, whichever this Mac has.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  This Mac cannot find Node, so the brain cannot start."
  echo "  The night runs without it. Tell Claude Code."
  echo ""
  read -k 1 "?  Press any key to close."
  exit 1
fi

# Two brains would run every cue twice. (A pretend one, --fake, does not count.)
if pgrep -fl "node cues.mjs" 2>/dev/null | grep -v -- "--fake" | grep -q "cues.mjs"; then
  echo ""
  echo "  The brain is already running in another window. Use that one."
  echo ""
  read -k 1 "?  Press any key to close this window."
  exit 0
fi

# Awake for as long as this window lives: the display too, since it is the
# Orangerie's screen. (Not only while the relay runs: the waits below count.)
caffeinate -dimsu -w $$ &

echo ""
echo "  The brain is starting. Leave this window open all night."
echo "  It is up when it says: cue relay up."
echo ""

# The Orangerie's page, in Google Chrome when this Mac has it. Click once on
# the page: that makes it full screen and turns its sound on. Once a day
# only: if this window was closed by mistake and Start the brain is pressed
# again, a second page in front of the first would take it out of full
# screen, and the two together would play every chime twice.
# (BRAIN_NO_PAGE=1 skips it; BRAIN_OPEN=echo shows what it would open.)
PAGE="https://murderwin-at-sirwin-manor.web.app/play/?kiosk=orangerie"
MARK="/tmp/murderwin-orangerie-page"
OPEN="${BRAIN_OPEN:-open}"
if [ -z "$BRAIN_NO_PAGE" ]; then
  if pgrep -xq "Google Chrome" && [ -n "$(find "$MARK" -mmin -720 2>/dev/null)" ]; then
    echo "  The Orangerie's page was opened earlier and should still be up in the browser."
    echo "  If it is not: open 4 Orangerie, in the Murderwin screens folder on this desktop."
    echo ""
  else
    $OPEN -a "Google Chrome" "$PAGE" 2>/dev/null || $OPEN "$PAGE"
    touch "$MARK"
  fi
fi

# Start it, and start it again if it stops. Three quick stops in a row mean
# something is wrong: wait for a key, so a broken start never runs a cue over
# and over.
quick=0
while true; do
  began=$SECONDS
  node cues.mjs "$@"
  if (( SECONDS - began < 30 )); then quick=$(( quick + 1 )); else quick=0; fi
  if (( quick >= 3 )); then
    echo ""
    echo "  The brain stopped three times in a row. The lines above say why."
    echo "  The night runs without it: every screen and phone makes its own sounds."
    echo "  Tell Claude Code. Or press any key to try again."
    echo ""
    read -k 1 "?  "
    quick=0
  else
    echo "The brain stopped. Starting it again in 5 seconds (close this window to stop it)."
    sleep 5
  fi
done
