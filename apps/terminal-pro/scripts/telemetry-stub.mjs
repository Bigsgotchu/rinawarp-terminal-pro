import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

const port = Number(process.env.TELEMETRY_PORT || '4321')

let metrics = {
  activeSessions: 0,
  commandsRun: 0,
  aiMessages: 0,
  quickFixes: 0,
  errors: 0,
  crashes: 0,
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end('missing url')
    return
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (req.url === '/metrics') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(metrics))
    return
  }

  if (req.url === '/metrics/reset' && req.method === 'POST') {
    metrics = {
      activeSessions: 0,
      commandsRun: 0,
      aiMessages: 0,
      quickFixes: 0,
      errors: 0,
      crashes: 0,
    }
    broadcastMetrics()
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'reset', metrics }))
    return
  }

  res.writeHead(404)
  res.end('not found')
})

const wss = new WebSocketServer({ server })
const clients = new Set()

function broadcastMetrics() {
  const message = JSON.stringify({ type: 'metrics', data: metrics })
  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) continue
    try {
      client.send(message)
    } catch {
      clients.delete(client)
    }
  }
}

function applyEvent(type) {
  switch (type) {
    case 'session:start':
      metrics.activeSessions += 1
      break
    case 'session:end':
      metrics.activeSessions = Math.max(0, metrics.activeSessions - 1)
      break
    case 'command:run':
      metrics.commandsRun += 1
      break
    case 'ai:message':
      metrics.aiMessages += 1
      break
    case 'quickfix:apply':
      metrics.quickFixes += 1
      break
    case 'error:occurred':
      metrics.errors += 1
      break
    case 'crash:occurred':
      metrics.crashes += 1
      break
    default:
      break
  }
  broadcastMetrics()
}

wss.on('connection', (ws) => {
  clients.add(ws)
  ws.send(JSON.stringify({ type: 'metrics', data: metrics }))

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString())
      applyEvent(event.type)
    } catch (error) {
      console.error('[telemetry-stub] failed to parse message', error)
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
  })

  ws.on('error', () => {
    clients.delete(ws)
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Telemetry stub listening on ws://127.0.0.1:${port}`)
})

function shutdown() {
  for (const client of clients) {
    try {
      client.close(1000, 'Server shutting down')
    } catch {
      // ignore close failures during shutdown
    }
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
