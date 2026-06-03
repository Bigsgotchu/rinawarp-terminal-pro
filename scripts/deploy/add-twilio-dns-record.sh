#!/usr/bin/env bash
# Add Twilio domain verification TXT record to Cloudflare
# Usage: bash scripts/deploy/add-twilio-dns-record.sh
#
# This adds the _twilio TXT record for domain verification
# Required value: twilio-domain-verification=e45713bd162fb235a935b2cecb605349

set -euo pipefail

ZONE_ID="${1:-}"
RECORD_NAME="_twilio"
RECORD_TYPE="TXT"
RECORD_CONTENT="twilio-domain-verification=e45713bd162fb235a935b2cecb605349"

if [ -z "$ZONE_ID" ]; then
  echo "Usage: $0 <zone-id>"
  echo ""
  echo "To find your zone ID:"
  echo "  wrangler zone list"
  echo ""
  echo "Or from Cloudflare dashboard: https://dash.cloudflare.com/?to=/:account/:zone/dns"
  exit 1
fi

echo "Adding Twilio domain verification TXT record..."
echo "  Zone: $ZONE_ID"
echo "  Name: $RECORD_NAME"
echo "  Content: $RECORD_CONTENT"
echo ""

# Add the DNS record using Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"$RECORD_TYPE\",
    \"name\": \"$RECORD_NAME\",
    \"content\": \"$RECORD_CONTENT\",
    \"ttl\": 1,
    \"proxied\": false
  }" | jq .

echo ""
echo "Verify the record was added:"
curl -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$RECORD_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq .