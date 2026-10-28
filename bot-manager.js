/**
 * Onepiece WhatsApp Bot & Web Dashboard
 * Bot Manager: Real-time Baileys Connection, Session Storage, QR & Command Runner
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const QRCode = require('qrcode');
const { EventEmitter } = require('events');
const { smsg } = require('./System/x1');
require('./setting/config');

// Prevent obfuscator setInterval from blocking process exit if needed
const originalSetInterval = global.setInterval;

// Load authentic message handler from v20.js
let messageHandler;
try {
  messageHandler = require('./v20');
  console.log('[BotManager] Loaded authentic v20.js message handler.');
} catch (err) {
  console.error('[BotManager] Error loading v20.js:', err);
}

class BotManager extends EventEmitter {
  constructor() {
    super();
    this.sock = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
    this.qrRaw = null;
    this.qrDataUrl = null;
    this.pairingCode = null;
    this.user = null;
    this.connectedAt = null;
    this.connectionMethod = 'qr'; // 'qr' or 'pairing'
    this.pairingPhone = null;
    this.sessionDir = path.join(__dirname, 'session');

    // Counters & Logs
    this.totalCommandsExecuted = 0;
    this.totalMessagesReceived = 0;
    this.totalMessagesSent = 0;
    this.startTime = Date.now();
    this.logs = [];
    this.maxLogs = 400;

    // Command registry
    const { COMMANDS } = require('./commands-registry');
    this.commandsList = COMMANDS;

    // Ensure session directory exists
    fs.ensureDirSync(this.sessionDir);
    fs.ensureDirSync(path.join(__dirname, 'Access'));

    // Ensure Own.json and Prem.json exist
    this.initAccessFiles();

    this.addLog('SYSTEM', 'BotManager initialized successfully.');
  }

  initAccessFiles() {
    const ownPath = path.join(__dirname, 'Access', 'Own.json');
    const premPath = path.join(__dirname, 'Access', 'Prem.json');

    if (!fs.existsSync(ownPath)) {
      fs.writeJsonSync(ownPath, ['6288987025424']);
    }
    if (!fs.existsSync(premPath)) {
      fs.writeJsonSync(premPath, []);
    }
  }

  addLog(category, message, metadata = null) {
    const logEntry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      timestamp: new Date().toISOString(),
      category: category.toUpperCase(), // SYSTEM, WA, CMD, ERROR, AUTH
      message,
      metadata
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.emit('log', logEntry);
  }

  getLogs(limit = 100, category = null) {
    let result = this.logs;
    if (category && category !== 'ALL') {
      result = result.filter(l => l.category === category.toUpperCase());
    }
    return result.slice(0, limit);
  }

  clearLogs() {
    this.logs = [];
    this.addLog('SYSTEM', 'Log history cleared.');
    return true;
  }

  getOwners() {
    try {
      const ownPath = path.join(__dirname, 'Access', 'Own.json');
      return fs.readJsonSync(ownPath);
    } catch {
      return ['6288987025424'];
    }
  }

  saveOwners(owners) {
    try {
      const ownPath = path.join(__dirname, 'Access', 'Own.json');
      fs.writeJsonSync(ownPath, owners, { spaces: 2 });
      this.addLog('AUTH', `Updated owner list. Total owners: ${owners.length}`);
      return true;
    } catch (err) {
      this.addLog('ERROR', `Failed to save owners: ${err.message}`);
      return false;
    }
  }

  getPremiums() {
    try {
      const premPath = path.join(__dirname, 'Access', 'Prem.json');
      return fs.readJsonSync(premPath);
    } catch {
      return [];
    }
  }

  savePremiums(premiums) {
    try {
      const premPath = path.join(__dirname, 'Access', 'Prem.json');
      fs.writeJsonSync(premPath, premiums, { spaces: 2 });
      this.addLog('AUTH', `Updated premium list. Total premiums: ${premiums.length}`);
      return true;
    } catch (err) {
      this.addLog('ERROR', `Failed to save premiums: ${err.message}`);
      return false;
    }
  }

  getConfig() {
    return {
      botName: 'Ônepicè',
      version: '19.0.0',
      ownerName: 'ĎapzyOfficiàl',
      prefixes: global.prefa || ['', '!', '.', ',', '🐤', '🗿'],
      isPublic: !!global.publicX,
      ownerNumbers: this.getOwners(),
      premiumNumbers: this.getPremiums()
    };
  }

  setConfig(updates = {}) {
    if (typeof updates.isPublic === 'boolean') {
      global.publicX = updates.isPublic;
      if (this.sock) {
        this.sock.public = updates.isPublic;
      }
      this.addLog('SYSTEM', `Bot mode changed to: ${updates.isPublic ? 'PUBLIC' : 'SELF'}`);
    }
    if (Array.isArray(updates.prefixes)) {
      global.prefa = updates.prefixes;
      this.addLog('SYSTEM', `Updated prefixes: ${updates.prefixes.join(', ')}`);
    }
    return this.getConfig();
  }

  getStatus() {
    const memory = process.memoryUsage();
    return {
      status: this.status, // disconnected, connecting, qr_ready, connected
      qrRaw: this.qrRaw,
      qrDataUrl: this.qrDataUrl,
      pairingCode: this.pairingCode,
      user: this.user,
      connectedAt: this.connectedAt,
      connectionMethod: this.connectionMethod,
      totalCommandsExecuted: this.totalCommandsExecuted,
      totalMessagesReceived: this.totalMessagesReceived,
      totalMessagesSent: this.totalMessagesSent,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      sessionExists: fs.existsSync(path.join(this.sessionDir, 'creds.json')),
      config: this.getConfig(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
        memoryHeapUsedMb: Math.round(memory.heapUsed / (1024 * 1024))
      }
    };
  }

  /**
   * Start WhatsApp Connection
   * @param {Object} options { method: 'qr' | 'pairing', phoneNumber: '628xxx' }
   */
  async startConnection(options = {}) {
    const method = options.method || 'qr';
    let phoneNumber = options.phoneNumber ? options.phoneNumber.replace(/[^0-9]/g, '') : null;
    if (phoneNumber) {
      if (phoneNumber.startsWith('08')) {
        phoneNumber = '628' + phoneNumber.slice(2);
      } else if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.slice(1);
      }
    }

    this.connectionMethod = method;
    this.pairingPhone = phoneNumber;
    this.pairingCode = null;
    this.qrRaw = null;
    this.qrDataUrl = null;

    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }

    // If pairing is requested, clean any old registered creds so Baileys allows fresh pairing
    if (method === 'pairing' && phoneNumber) {
      const credsPath = path.join(this.sessionDir, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const creds = fs.readJsonSync(credsPath);
          if (creds && creds.registered) {
            this.addLog('WA', `Refreshing session to generate fresh pairing code for ${phoneNumber}...`);
            fs.emptyDirSync(this.sessionDir);
          }
        } catch {}
      }
    }

    this.status = 'connecting';
    this.emit('status_change', this.getStatus());
    this.addLog('WA', `Initiating WhatsApp connection (Method: ${method.toUpperCase()}${phoneNumber ? ', Phone: +' + phoneNumber : ''})...`);

    const promise = new Promise(async (resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          this.removeListener('pairing_code', onPairing);
          this.removeListener('pairing_error', onError);
          resolve(result);
        }
      };

      const onPairing = (data) => {
        finish({ success: true, pairingCode: data.code, phone: data.phone, status: this.status });
      };

      const onError = (data) => {
        finish({ success: false, error: data.error, status: this.status });
      };

      if (method === 'pairing' && phoneNumber) {
        this.once('pairing_code', onPairing);
        this.once('pairing_error', onError);
        // Timeout after 6.5s so HTTP response returns
        setTimeout(() => {
          finish({ success: true, pairingCode: this.pairingCode, phone: phoneNumber, status: this.status });
        }, 6500);
      }

      try {
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
        let version;
        try {
          const v = await fetchLatestWaWebVersion();
          version = v.version;
        } catch {
          version = [2, 3000, 1017531287];
        }

        const sockConfig = {
          version,
          logger: pino({ level: 'silent' }),
          printQRInTerminal: false,
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
          },
          browser: ['Ubuntu', 'Chrome', '20.0.0'],
          syncFullHistory: false,
          markOnlineOnConnect: true,
          connectTimeoutMs: 60000,
          keepAliveIntervalMs: 10000
        };

        this.sock = makeWASocket(sockConfig);
        this.sock.public = global.publicX;

        // Handle credentials update
        this.sock.ev.on('creds.update', saveCreds);

        // Pairing code flow
        if (method === 'pairing' && phoneNumber && !this.sock.authState.creds.registered) {
          setTimeout(async () => {
            try {
              this.addLog('WA', `Requesting 8-digit pairing code for +${phoneNumber}...`);
              const code = await this.sock.requestPairingCode(phoneNumber);
              this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
              this.addLog('WA', `Pairing code received: ${this.pairingCode}`);
              this.emit('pairing_code', { code: this.pairingCode, phone: phoneNumber });
              this.emit('status_change', this.getStatus());
            } catch (err) {
              this.addLog('ERROR', `Failed to request pairing code: ${err.message}`);
              this.emit('pairing_error', { error: err.message, phone: phoneNumber });
              this.emit('status_change', this.getStatus());
            }
          }, 2000);
        }

        // Handle connection updates
        this.sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          if (qr && method === 'qr') {
            this.qrRaw = qr;
            try {
              this.qrDataUrl = await QRCode.toDataURL(qr, {
                margin: 2,
                width: 320,
                color: { dark: '#000000', light: '#ffffff' }
              });
              this.status = 'qr_ready';
              this.addLog('WA', 'New QR Code generated and ready for scanning.');
              this.emit('qr', { qrRaw: this.qrRaw, qrDataUrl: this.qrDataUrl });
              this.emit('status_change', this.getStatus());
              if (method === 'qr') {
                finish({ success: true, qr: this.qrRaw, qrDataUrl: this.qrDataUrl, status: this.status });
              }
            } catch (qrErr) {
              this.addLog('ERROR', `QR Code generation error: ${qrErr.message}`);
            }
          }

          if (connection === 'open') {
            this.status = 'connected';
            this.qrRaw = null;
            this.qrDataUrl = null;
            this.pairingCode = null;
            this.connectedAt = new Date().toISOString();
            this.user = this.sock.user;

            const phone = this.user?.id ? this.user.id.split(':')[0] : 'Unknown';
            this.addLog('WA', `WhatsApp connection successfully opened! Connected as: ${this.user?.name || phone} (+${phone})`);
            this.emit('status_change', this.getStatus());
            finish({ success: true, status: 'connected', user: this.user });
          }

          if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            this.status = 'disconnected';
            this.connectedAt = null;
            this.user = null;
            this.qrRaw = null;
            this.qrDataUrl = null;

            this.addLog('WA', `Connection closed (Code: ${statusCode || 'unknown'}). ${shouldReconnect ? 'Will auto-reconnect...' : 'Logged out.'}`);
            this.emit('status_change', this.getStatus());

            if (shouldReconnect) {
              setTimeout(() => {
                this.startConnection({ method: this.connectionMethod, phoneNumber: this.pairingPhone });
              }, 5000);
            }
          }
        });

        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async (chatUpdate) => {
          try {
            if (!chatUpdate.messages || chatUpdate.messages.length === 0) return;
            const rawMsg = chatUpdate.messages[0];
            if (!rawMsg.message) return;

            this.totalMessagesReceived++;

            // Set global.mek for v20.js compatibility
            global.mek = rawMsg;

            const m = smsg(this.sock, rawMsg, { loadMessage: () => null });
            const sender = m.sender ? m.sender.split('@')[0] : 'Unknown';
            const body = m.body || m.text || '';

            if (body) {
              this.addLog('WA', `Received message from ${m.pushName || sender}: "${body.substring(0, 80)}"`, {
                chat: m.chat,
                sender: m.sender,
                fromMe: m.fromMe
              });
            }

            // Execute authentic handler
            if (messageHandler) {
              await messageHandler(this.sock, m, chatUpdate, {});
            }
          } catch (err) {
            this.addLog('ERROR', `Error processing incoming message: ${err.message}`);
          }
        });

        if (method !== 'pairing') {
          setTimeout(() => {
            finish({ success: true, status: this.status });
          }, 3000);
        }
      } catch (err) {
        this.status = 'disconnected';
        this.addLog('ERROR', `Failed to start WhatsApp: ${err.message}`);
        this.emit('status_change', this.getStatus());
        finish({ success: false, error: err.message });
      }
    });

    return promise;
  }

  /**
   * Disconnect WhatsApp connection
   */
  async disconnect() {
    this.addLog('WA', 'Disconnecting WhatsApp connection...');
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
    this.status = 'disconnected';
    this.qrRaw = null;
    this.qrDataUrl = null;
    this.pairingCode = null;
    this.connectedAt = null;
    this.user = null;
    this.emit('status_change', this.getStatus());
    return { success: true };
  }

  /**
   * Reset Session
   */
  async resetSession() {
    await this.disconnect();
    this.addLog('SYSTEM', 'Deleting persistent session data...');
    try {
      if (fs.existsSync(this.sessionDir)) {
        fs.emptyDirSync(this.sessionDir);
      }
      this.addLog('SYSTEM', 'Session cleared successfully.');
      return { success: true };
    } catch (err) {
      this.addLog('ERROR', `Error clearing session: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute ANY command directly through authentic v20.js message handler
   * Supports both simulation/preview & real dispatch to WhatsApp!
   * @param {Object} params { command: 'menu' | 'd-five' | ..., args: '628xxx', sendToWhatsApp: boolean }
   */
  async executeCommand(params = {}) {
    const commandName = (params.command || '').trim().replace(/^[!.#,🗿🐤]+/, '');
    const argsString = (params.args || '').trim();
    // Auto-send to WhatsApp whenever bot is connected, unless explicitly disabled
    const sendToWhatsApp = params.sendToWhatsApp !== undefined ? !!params.sendToWhatsApp : (this.status === 'connected');
    const fullCommand = `.${commandName}${argsString ? ' ' + argsString : ''}`;

    const startTime = Date.now();
    this.totalCommandsExecuted++;
    this.addLog('CMD', `Executing dashboard command: "${fullCommand}" (AutoSendWA: ${sendToWhatsApp ? 'YES' : 'NO'}, Status: ${this.status})`);

    // Find command spec from registry
    const cmdSpec = this.commandsList.find(c => c.name === commandName || (c.aliases && c.aliases.includes(commandName)));

    // Capture captured outputs
    const capturedOutputs = [];
    const capturedReactions = [];

    // Target chat determination
    const botUserJid = this.sock?.user?.id || '6288987025424@s.whatsapp.net';
    const cleanBotPhone = botUserJid.split(':')[0].split('@')[0];
    const cleanBotJid = `${cleanBotPhone}@s.whatsapp.net`;

    let targetChat = cleanBotJid;
    if (params.customRecipient && params.customRecipient.trim()) {
      const rec = params.customRecipient.trim();
      targetChat = rec.includes('@') ? rec : `${rec.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    } else if (argsString.includes('@g.us')) {
      targetChat = argsString;
    } else if (argsString.replace(/[^0-9]/g, '').length >= 8 && (commandName.startsWith('d-') || commandName === 'freeze' || commandName === 'crash')) {
      targetChat = `${argsString.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    }

    const dispatchSocket = {
      user: this.sock?.user || { id: cleanBotJid, name: 'Ônepicè' },
      decodeJid: (jid) => jid ? jid.replace(/:[0-9]+/, '') : jid,
      public: global.publicX !== undefined ? global.publicX : true,
      onWhatsApp: async (jid) => {
        if (this.sock) {
          try {
            return await this.sock.onWhatsApp(jid);
          } catch {}
        }
        return [{ exists: true, jid }];
      },
      waUploadToServer: async (stream) => {
        if (this.sock?.waUploadToServer) {
          try {
            return await this.sock.waUploadToServer(stream);
          } catch {}
        }
        return { url: 'https://example.com/media.mp4' };
      },
      sendMessage: async (jid, content, options = {}) => {
        const destJid = jid ? (jid.includes('@') ? jid : `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`) : targetChat;
        capturedOutputs.push({
          type: 'sendMessage',
          jid: destJid,
          content,
          text: content.text || content.caption || null,
          options
        });

        if (content.react) {
          capturedReactions.push(content.react.text);
        }

        // Forward to real WhatsApp if connected
        if (sendToWhatsApp && this.sock && this.status === 'connected') {
          try {
            this.totalMessagesSent++;
            const realOpts = { ...options };
            if (realOpts.quoted?.key?.id?.startsWith('DASH_')) {
              delete realOpts.quoted;
            }
            await this.sock.sendMessage(destJid, content, realOpts);
            this.addLog('WA', `Dispatched command output to WhatsApp (${destJid})`);
          } catch (waErr) {
            this.addLog('ERROR', `Failed to send real message to WhatsApp: ${waErr.message}`);
          }
        }

        return { key: { id: 'DASHBOARD_' + Date.now(), remoteJid: destJid } };
      },
      sendText: async (jid, text, quoted, options = {}) => {
        const destJid = jid || targetChat;
        capturedOutputs.push({
          type: 'sendText',
          jid: destJid,
          text,
          options
        });

        if (sendToWhatsApp && this.sock && this.status === 'connected') {
          try {
            this.totalMessagesSent++;
            const realOpts = { ...options };
            if (realOpts.quoted?.key?.id?.startsWith('DASH_')) {
              delete realOpts.quoted;
            }
            await this.sock.sendMessage(destJid, { text }, realOpts);
            this.addLog('WA', `Dispatched text to WhatsApp (${destJid})`);
          } catch (waErr) {
            this.addLog('ERROR', `Failed to send real text to WhatsApp: ${waErr.message}`);
          }
        }

        return { key: { id: 'DASHBOARD_' + Date.now(), remoteJid: destJid } };
      }
    };

    // Construct synthetic WebMessageInfo for authentic v20.js message handler
    const rawMsg = {
      key: {
        remoteJid: targetChat,
        fromMe: true,
        id: 'DASH_EXEC_' + Date.now()
      },
      message: {
        conversation: fullCommand
      },
      pushName: 'Admin Web Dashboard'
    };

    global.mek = rawMsg;

    const m = smsg(dispatchSocket, rawMsg, { loadMessage: () => null });
    m.reply = (text, chatId = m.chat, options = {}) => {
      capturedOutputs.push({
        type: 'reply',
        chatId,
        text: typeof text === 'string' ? text : JSON.stringify(text),
        options
      });

      if (sendToWhatsApp && this.sock && this.status === 'connected') {
        try {
          this.totalMessagesSent++;
          const replyContent = typeof text === 'string' ? { text } : text;
          const realOpts = { ...options };
          if (realOpts.quoted?.key?.id?.startsWith('DASH_')) {
            delete realOpts.quoted;
          }
          this.sock.sendMessage(chatId, replyContent, realOpts);
          this.addLog('WA', `Dispatched reply to WhatsApp (${chatId})`);
        } catch (waErr) {
          this.addLog('ERROR', `Failed to send reply to WhatsApp: ${waErr.message}`);
        }
      }
    };

    let executionError = null;
    try {
      if (messageHandler) {
        await messageHandler(dispatchSocket, m, { messages: [rawMsg] }, {});
      } else {
        throw new Error('Message handler v20.js not loaded');
      }
    } catch (err) {
      executionError = err.message || String(err);
      this.addLog('ERROR', `Execution error in command "${fullCommand}": ${executionError}`);
    }

    const durationMs = Date.now() - startTime;
    this.addLog('CMD', `Command "${fullCommand}" completed in ${durationMs}ms with ${capturedOutputs.length} outputs.`);

    return {
      success: !executionError,
      command: commandName,
      args: argsString,
      fullCommand,
      spec: cmdSpec || null,
      durationMs,
      timestamp: new Date().toISOString(),
      sendToWhatsApp: sendToWhatsApp && this.status === 'connected',
      targetChat,
      error: executionError,
      reactions: capturedReactions,
      outputs: capturedOutputs.map(o => ({
        type: o.type,
        text: o.text || (o.content?.text ? o.content.text : null),
        content: o.content || null,
        jid: o.jid || o.chatId || targetChat
      }))
    };
  }

  /**
   * Send test message directly to paired phone number
   */
  async sendTestMessage(customText = null) {
    if (!this.sock || this.status !== 'connected') {
      return { success: false, error: 'WhatsApp belum terhubung.' };
    }
    try {
      const phone = this.user?.id ? this.user.id.split(':')[0] : null;
      if (!phone) return { success: false, error: 'Nomor WhatsApp bot tidak ditemukan.' };
      const jid = `${phone}@s.whatsapp.net`;
      const text = customText || `⚡ *Ônepicè VIP Bot Web Dashboard*\n\n✅ Nomor Anda (*+${phone}*) berhasil terhubung via WhatsApp Web Pairing!\n\nSaat ini nomor ini sepenuhnya dapat diatur dan menjalankan command otomatis dari Web Dashboard.\n\n_Waktu: ${new Date().toLocaleString('id-ID')}_`;
      await this.sock.sendMessage(jid, { text });
      this.totalMessagesSent++;
      this.addLog('WA', `Sent direct test ping to paired number +${phone}`);
      return { success: true, message: `Pesan tes berhasil dikirim ke +${phone}` };
    } catch (err) {
      this.addLog('ERROR', `Failed to send test message: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Add connected user to Owner list
   */
  makeConnectedUserOwner() {
    const phone = this.user?.id ? this.user.id.split(':')[0] : null;
    if (!phone) return { success: false, error: 'Belum ada nomor terhubung.' };
    const owners = this.getOwners();
    if (!owners.includes(phone)) {
      owners.push(phone);
      this.saveOwners(owners);
      this.addLog('AUTH', `Added connected number +${phone} as Bot Owner.`);
    }
    return { success: true, phone, owners };
  }
}

// Singleton instance
const botManager = new BotManager();

module.exports = botManager;
