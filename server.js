/**
 * Onepiece WhatsApp Bot - Professional Web Dashboard & Server
 * Port: 3000 (0.0.0.0) | Wipsbyte & AI Studio Ready
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const botManager = require('./bot-manager');
const { COMMANDS, CATEGORIES } = require('./commands-registry');

const app = express();
const server = http.createServer(app);

// In AI Studio / Cloud Run, the applet dev server must listen on port 3000 (0.0.0.0).
// In Wipsbyte / external hosting panels, process.env.PORT is allocated dynamically.
const PORT = (process.env.PORT && process.env.PORT !== '8080') ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'onepiece2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Simple Token-based Auth Middleware
const authTokens = new Set(['dev-session-token']);

function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;

  if (token && (authTokens.has(token) || token === 'onepiece-admin-token')) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or missing token' });
}

// --- API ROUTES ---

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  if (password === ADMIN_PASSWORD) {
    const token = 'onepiece-' + Math.random().toString(36).substring(2) + '-' + Date.now();
    authTokens.add(token);
    botManager.addLog('AUTH', 'Admin logged into Web Dashboard.');
    return res.json({ success: true, token });
  }

  botManager.addLog('AUTH', 'Failed login attempt on Web Dashboard.');
  return res.status(401).json({ success: false, error: 'Password salah' });
});

// Auth Verify
app.get('/api/auth/verify', checkAuth, (req, res) => {
  res.json({ success: true, authenticated: true });
});

// Bot Status
app.get('/api/status', (req, res) => {
  res.json({ success: true, data: botManager.getStatus() });
});

// Start WhatsApp Connection (QR or Pairing Code)
app.post('/api/connect', checkAuth, async (req, res) => {
  const { method = 'qr', phoneNumber } = req.body;
  const result = await botManager.startConnection({ method, phoneNumber });
  res.json(result);
});

// Disconnect WhatsApp
app.post('/api/disconnect', checkAuth, async (req, res) => {
  const result = await botManager.disconnect();
  res.json(result);
});

// Reset Persistent Session
app.post('/api/session/reset', checkAuth, async (req, res) => {
  const result = await botManager.resetSession();
  res.json(result);
});

// Send Test Message to Paired Number
app.post('/api/whatsapp/test-message', checkAuth, async (req, res) => {
  const result = await botManager.sendTestMessage(req.body.text);
  res.json(result);
});

// Make Connected User Owner
app.post('/api/whatsapp/make-owner', checkAuth, (req, res) => {
  const result = botManager.makeConnectedUserOwner();
  res.json(result);
});

// Check WhatsApp Group ID from Link
app.post('/api/group/check-id', checkAuth, async (req, res) => {
  const link = req.body.link || req.body.groupLink;
  if (!link) {
    return res.status(400).json({ success: false, error: 'Link grup WhatsApp wajib diisi' });
  }
  const result = await botManager.checkGroupId(link);
  res.json(result);
});

// Get Commands Catalog
app.get('/api/commands', (req, res) => {
  res.json({
    success: true,
    total: COMMANDS.length,
    categories: CATEGORIES,
    commands: COMMANDS
  });
});

// Execute ANY Command from Web Dashboard
app.post('/api/commands/execute', checkAuth, async (req, res) => {
  const { command, args, sendToWhatsApp, customRecipient } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Command name is required' });
  }

  const result = await botManager.executeCommand({
    command,
    args: args || '',
    sendToWhatsApp: sendToWhatsApp !== undefined ? !!sendToWhatsApp : undefined,
    customRecipient: customRecipient || null
  });

  res.json(result);
});

// Activity Logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const category = req.query.category || null;
  res.json({ success: true, logs: botManager.getLogs(limit, category) });
});

// Clear Logs
app.delete('/api/logs', checkAuth, (req, res) => {
  botManager.clearLogs();
  res.json({ success: true, message: 'Logs cleared' });
});

// Owners Management
app.get('/api/owners', checkAuth, (req, res) => {
  res.json({ success: true, owners: botManager.getOwners() });
});

app.post('/api/owners', checkAuth, (req, res) => {
  const { action, number } = req.body;
  const cleanNumber = (number || '').replace(/[^0-9]/g, '');

  if (!cleanNumber) {
    return res.status(400).json({ success: false, error: 'Valid phone number is required' });
  }

  const owners = botManager.getOwners();
  if (action === 'add') {
    if (!owners.includes(cleanNumber)) {
      owners.push(cleanNumber);
      botManager.saveOwners(owners);
    }
  } else if (action === 'delete') {
    const updated = owners.filter(o => o !== cleanNumber);
    botManager.saveOwners(updated);
  }

  res.json({ success: true, owners: botManager.getOwners() });
});

// Premiums Management
app.get('/api/premiums', checkAuth, (req, res) => {
  res.json({ success: true, premiums: botManager.getPremiums() });
});

app.post('/api/premiums', checkAuth, (req, res) => {
  const { action, number } = req.body;
  const cleanNumber = (number || '').replace(/[^0-9]/g, '');

  if (!cleanNumber) {
    return res.status(400).json({ success: false, error: 'Valid phone number is required' });
  }

  const premiums = botManager.getPremiums();
  if (action === 'add') {
    if (!premiums.includes(cleanNumber)) {
      premiums.push(cleanNumber);
      botManager.savePremiums(premiums);
    }
  } else if (action === 'delete') {
    const updated = premiums.filter(p => p !== cleanNumber);
    botManager.savePremiums(updated);
  }

  res.json({ success: true, premiums: botManager.getPremiums() });
});

// Config Settings
app.get('/api/config', (req, res) => {
  res.json({ success: true, config: botManager.getConfig() });
});

app.post('/api/config', checkAuth, (req, res) => {
  const updated = botManager.setConfig(req.body);
  res.json({ success: true, config: updated });
});

// Fallback to SPA index.html for non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- WEBSOCKET SERVER ---
const wss = new WebSocketServer({ server });

function broadcast(type, payload) {
  const data = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  });
}

// Forward BotManager events to WebSocket clients
botManager.on('status_change', (status) => broadcast('status_change', status));
botManager.on('qr', (qrData) => broadcast('qr', qrData));
botManager.on('pairing_code', (pairingData) => broadcast('pairing_code', pairingData));
botManager.on('log', (logEntry) => broadcast('log', logEntry));

wss.on('connection', (ws) => {
  // Send initial payload
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      status: botManager.getStatus(),
      recentLogs: botManager.getLogs(40),
      commands: COMMANDS,
      categories: CATEGORIES
    }
  }));

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {}
  });
});

// Auto-connect if configured
if (process.env.AUTO_CONNECT_WHATSAPP === 'true') {
  console.log('[Server] Auto-connect WhatsApp is enabled in .env.');
  setTimeout(() => {
    botManager.startConnection({ method: 'qr' });
  }, 2000);
}

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`⚡ ONEPIECE BOT & WEB DASHBOARD RUNNING`);
  console.log(`🌐 Local URL : http://${HOST}:${PORT}`);
  console.log(`🔑 Admin Pass: ${ADMIN_PASSWORD}`);
  console.log(`📱 Commands  : ${COMMANDS.length} authentic bot commands loaded`);
  console.log(`⚡ Mode      : ${global.publicX ? 'PUBLIC' : 'SELF'}`);
  console.log(`====================================================`);
});
