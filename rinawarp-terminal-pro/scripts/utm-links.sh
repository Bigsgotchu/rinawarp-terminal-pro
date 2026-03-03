#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-https://www.rinawarptech.com/pricing/}"
CAMPAIGN="${CAMPAIGN:-week1_operator_fixes}"

mk() {
  local source="$1"
  local medium="$2"
  local content="$3"
  printf "%s?utm_source=%s&utm_medium=%s&utm_campaign=%s&utm_content=%s\n" \
    "$BASE" "$source" "$medium" "$CAMPAIGN" "$content"
}

echo "== UTM Campaign Links =="
echo "Base     : $BASE"
echo "Campaign : $CAMPAIGN"
echo

echo "x_post_1:      $(mk x social post1)"
echo "x_post_2:      $(mk x social post2)"
echo "reddit_post:   $(mk reddit community post1)"
echo "hn_comment:    $(mk hackernews community comment1)"
echo "email_list:    $(mk email owned broadcast1)"
echo "discord_post:  $(mk discord community post1)"
echo "youtube_desc:  $(mk youtube social demo1)"
echo "partner_intro: $(mk partner referral intro1)"
echo
echo "Use these exact links so funnel data is attributable in /api/events utm_json."
