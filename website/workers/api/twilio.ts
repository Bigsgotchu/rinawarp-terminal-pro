/**
 * Twilio SMS handler for beta notifications
 */

interface TwilioSMSRequest {
  to: string
  body: string
  name?: string
}

export async function sendBetaSMS(req: Request, env: any): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE } = env
  const from = TWILIO_PHONE || '+14155238886' // Default Twilio number

  if (!TWILIO_SID || !TWILIO_AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: 'Twilio not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const data = await req.json() as TwilioSMSRequest
    const to = data.to
    const body = data.body

    if (!to || !body) {
      return new Response(JSON.stringify({ error: 'Missing to or body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send via Twilio API
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_SID + '/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(TWILIO_SID + ':' + TWILIO_AUTH_TOKEN),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error: 'Twilio send failed: ' + error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await response.json()
    return new Response(JSON.stringify({ success: true, sid: result.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

export async function sendBetaWelcomeSMS(env: any, name: string, phone: string): Promise<void> {
  const body = `Hi ${name}! Thanks for joining RinaWarp Terminal Pro v1.8.2-beta. Download: https://www.rinawarptech.com/download/ Beta guide: https://www.rinawarptech.com/beta/`

  await sendBetaSMS(
    new Request('https://api.twilio.local/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, body, name }),
    }),
    env
  )
}