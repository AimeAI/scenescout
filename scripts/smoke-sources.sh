#!/usr/bin/env bash
set -euo pipefail

log(){ printf '%s\n' "$1"; }
warn(){ printf '⚠️  %s\n' "$1" >&2; }
fail(){ printf '❌ %s\n' "$1" >&2; exit 1; }

TM_FILE="$(mktemp -t scenescout-tm.XXXXXX)"
EB_FILE="$(mktemp -t scenescout-eb.XXXXXX)"
SK_FILE="$(mktemp -t scenescout-sk.XXXXXX)"
trap 'rm -f "$TM_FILE" "$EB_FILE" "$SK_FILE"' EXIT

log "Ticketmaster:"
if [ -z "${TICKETMASTER_API_KEY:-}" ]; then
  warn "skipping (no key)"
else
  printf '%s' "$TICKETMASTER_API_KEY" |
    curl -sS \
      --get \
      --data-urlencode "apikey@-" \
      --data-urlencode "city=Toronto" \
      --data-urlencode "size=5" \
      "https://app.ticketmaster.com/discovery/v2/events.json" >"$TM_FILE" || fail "Ticketmaster request failed"
  jq -e '.page.totalElements // 0' "$TM_FILE" >/dev/null || fail "Ticketmaster payload missing results"
fi

log "Eventbrite:"
if [ -z "${EVENTBRITE_TOKEN:-}" ]; then
  warn "skipping (no token)"
else
  header_file="$(mktemp -t scenescout-eb-header.XXXXXX)"
  printf 'Authorization: Bearer %s\n' "$EVENTBRITE_TOKEN" >"$header_file"
  curl -sS \
    -H @"$header_file" \
    "https://www.eventbriteapi.com/v3/events/search/?location.address=Toronto&expand=venue&sort_by=date&limit=5" >"$EB_FILE" || fail "Eventbrite request failed"
  rm -f "$header_file"
  jq -e '.events | length' "$EB_FILE" >/dev/null || fail "Eventbrite payload missing events"
fi

log "Songkick (if key present):"
if [ -n "${SONGKICK_API_KEY:-}" ]; then
  printf '%s' "$SONGKICK_API_KEY" |
    curl -sS \
      --get \
      --data-urlencode "apikey@-" \
      --data-urlencode "query=Toronto" \
      "https://api.songkick.com/api/3.0/search/locations.json" >"$SK_FILE" || fail "Songkick request failed"
  jq -e '.resultsPage.totalEntries // 0' "$SK_FILE" >/dev/null || fail "Songkick payload missing results"
else
  warn "skipping (no key)"
fi

log "✅ smoke complete"
