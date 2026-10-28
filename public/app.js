/**
 * Onepiece WhatsApp Bot - Frontend Application
 * Real-time WebSocket Client, Command Runner & Dashboard Controller
 */

// Application State
const state = {
  token: localStorage.getItem('onepiece_token') || 'onepiece-admin-token',
  status: null,
  commands: [],
  categories: [],
  selectedCategory: 'all',
  searchQuery: '',
  selectedCommand: null,
  connectMethod: 'qr',
  ws: null,
  logs: [],
  owners: [],
  premiums: []
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  setupWebSocket();
  await loadStatus();
  await loadCommands();
  await loadLogs();
  await loadAccessData();

  // Periodic status poll as fallback
  setInterval(loadStatus, 4000);
});

// --- WEBSOCKET CLIENT ---
let wsAttempts = 0;
const MAX_WS_ATTEMPTS = 2;

function setupWebSocket() {
  if (wsAttempts >= MAX_WS_ATTEMPTS) {
    // Graceful fallback to regular HTTP polling in iframe environments
    return;
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      wsAttempts = 0;
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWebSocketEvent(msg.type, msg.payload);
      } catch (e) {}
    };

    state.ws.onclose = () => {
      wsAttempts++;
      if (wsAttempts < MAX_WS_ATTEMPTS) {
        setTimeout(setupWebSocket, 5000);
      }
    };

    state.ws.onerror = () => {
      // Do not use console.error to avoid tripping iframe error monitors
      wsAttempts++;
    };
  } catch (err) {
    wsAttempts++;
  }
}

function handleWebSocketEvent(type, payload) {
  if (type === 'init') {
    state.status = payload.status;
    updateStatusUI(payload.status);
    if (payload.commands) {
      state.commands = payload.commands;
      state.categories = payload.categories;
      renderCategories();
      renderCommands();
      if (!state.selectedCommand && state.commands.length > 0) {
        selectCommand(state.commands[0].name);
      }
    }
    if (payload.recentLogs) {
      state.logs = payload.recentLogs;
      renderLogs();
    }
  } else if (type === 'status_change') {
    state.status = payload;
    updateStatusUI(payload);
  } else if (type === 'qr') {
    updateQrUI(payload.qrDataUrl, payload.qrRaw);
  } else if (type === 'pairing_code') {
    updatePairingCodeUI(payload.code);
  } else if (type === 'log') {
    state.logs.unshift(payload);
    if (state.logs.length > 300) state.logs.pop();
    renderLogs();
    renderRecentLogsSnippet();
  }
}

// --- API HELPER ---
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(endpoint, opts);
    if (res.status === 401) {
      showToast('Autentikasi diperlukan. Silakan login.', 'error');
    }
    return await res.json();
  } catch (err) {
    // Graceful poll failure handler without noisy console.error
    return { success: false, error: err.message };
  }
}

// --- STATUS & METRICS ---
async function loadStatus() {
  const res = await apiCall('/api/status');
  if (res.success && res.data) {
    state.status = res.data;
    updateStatusUI(res.data);
  }
}

function updateStatusUI(data) {
  if (!data) return;

  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const dashStatus = document.getElementById('dashWaStatus');
  const dashUser = document.getElementById('dashWaUser');
  const dashCmds = document.getElementById('dashTotalCmds');
  const dashMode = document.getElementById('dashBotMode');
  const dashUptime = document.getElementById('dashUptime');
  const modePublicBtn = document.getElementById('modePublicBtn');
  const modeSelfBtn = document.getElementById('modeSelfBtn');

  // Command Center Live Banner Elements
  const cmdWaBannerDot = document.getElementById('cmdWaBannerDot');
  const cmdWaBannerTitle = document.getElementById('cmdWaBannerTitle');
  const cmdWaBannerPill = document.getElementById('cmdWaBannerPill');
  const cmdWaBannerDesc = document.getElementById('cmdWaBannerDesc');
  const currentDestinationLabel = document.getElementById('currentDestinationLabel');
  const sendToWaCheckbox = document.getElementById('sendToWaCheckbox');
  const sendWaNotice = document.getElementById('sendWaNotice');

  // Connection Tab Connected Control Center
  const connectedControlPanel = document.getElementById('connectedControlPanel');
  const panelConnectedPhone = document.getElementById('panelConnectedPhone');

  // Connection State Colors & Sync Management
  if (data.status === 'connected') {
    const rawPhone = data.user?.id ? data.user.id.split(':')[0] : (data.pairingPhone || 'Aktif');
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    dot.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500';
    text.textContent = 'WhatsApp Terhubung';
    text.className = 'text-emerald-400 font-bold';

    dashStatus.innerHTML = `<span class="text-emerald-400 font-bold">Online (+${cleanPhone})</span>`;
    dashUser.textContent = `${data.user?.name || 'Bot'} (+${cleanPhone})`;

    // Update Command Center Sync Banner
    if (cmdWaBannerDot) cmdWaBannerDot.className = 'w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0';
    if (cmdWaBannerTitle) cmdWaBannerTitle.textContent = `WhatsApp Terhubung: +${cleanPhone} (${data.user?.name || 'Bot'})`;
    if (cmdWaBannerPill) {
      cmdWaBannerPill.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono border border-emerald-500/30';
      cmdWaBannerPill.textContent = 'Auto-Sync Aktif';
    }
    if (cmdWaBannerDesc) cmdWaBannerDesc.textContent = `Setiap command yang dijalankan di web otomatis terkirim dan dieksekusi langsung ke akun WhatsApp ini.`;

    // Destination & Auto-send state
    if (currentDestinationLabel) currentDestinationLabel.textContent = `+${cleanPhone} (Chat Bot/Saya)`;
    if (sendToWaCheckbox) {
      sendToWaCheckbox.checked = true;
    }
    if (sendWaNotice) {
      sendWaNotice.textContent = '(Otomatis Terkirim ke WhatsApp)';
      sendWaNotice.className = 'text-[10px] text-emerald-400 font-semibold';
    }

    // Show Connected Control Center in Connection tab
    if (connectedControlPanel) connectedControlPanel.classList.remove('hidden');
    if (panelConnectedPhone) panelConnectedPhone.textContent = `+${cleanPhone}`;

    // Hide pairing loading/code boxes once connected
    const pairCodeBox = document.getElementById('pairingCodeBox');
    const pairLoadingBox = document.getElementById('pairingLoadingBox');
    if (pairCodeBox) pairCodeBox.classList.add('hidden');
    if (pairLoadingBox) pairLoadingBox.classList.add('hidden');

  } else if (data.status === 'qr_ready') {
    dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
    text.textContent = 'Menunggu Scan QR';
    text.className = 'text-amber-400 font-medium';

    dashStatus.innerHTML = `<span class="text-amber-400">Scan QR</span>`;
    dashUser.textContent = 'Silakan scan QR di tab WhatsApp';

    if (cmdWaBannerDot) cmdWaBannerDot.className = 'w-3 h-3 rounded-full bg-amber-400 animate-pulse shrink-0';
    if (cmdWaBannerTitle) cmdWaBannerTitle.textContent = 'WhatsApp: Menunggu Scan QR';
    if (cmdWaBannerPill) {
      cmdWaBannerPill.className = 'text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono';
      cmdWaBannerPill.textContent = 'Pending Scan';
    }
    if (cmdWaBannerDesc) cmdWaBannerDesc.textContent = 'Scan QR di tab WhatsApp untuk menyambungkan koneksi.';
    if (connectedControlPanel) connectedControlPanel.classList.add('hidden');

  } else if (data.status === 'connecting') {
    dot.className = 'w-2 h-2 rounded-full bg-blue-500 animate-pulse';
    text.textContent = 'Menyambungkan...';
    text.className = 'text-blue-400 font-medium';

    dashStatus.innerHTML = `<span class="text-blue-400">Connecting...</span>`;
    dashUser.textContent = 'Memulai socket Baileys...';

    if (cmdWaBannerDot) cmdWaBannerDot.className = 'w-3 h-3 rounded-full bg-blue-400 animate-pulse shrink-0';
    if (cmdWaBannerTitle) cmdWaBannerTitle.textContent = 'WhatsApp: Sedang Menyambungkan...';
    if (cmdWaBannerPill) {
      cmdWaBannerPill.className = 'text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono';
      cmdWaBannerPill.textContent = 'Connecting';
    }
    if (cmdWaBannerDesc) cmdWaBannerDesc.textContent = 'Menginisialisasi sesi WhatsApp Web...';
    if (connectedControlPanel) connectedControlPanel.classList.add('hidden');

  } else {
    dot.className = 'w-2 h-2 rounded-full bg-slate-500';
    text.textContent = 'Offline (Siap)';
    text.className = 'text-slate-400 font-medium';

    dashStatus.innerHTML = `<span class="text-slate-400">Disconnected</span>`;
    dashUser.textContent = 'Klik tab WhatsApp untuk hubungkan';

    if (cmdWaBannerDot) cmdWaBannerDot.className = 'w-3 h-3 rounded-full bg-slate-500 shrink-0';
    if (cmdWaBannerTitle) cmdWaBannerTitle.textContent = 'WhatsApp: Disconnected';
    if (cmdWaBannerPill) {
      cmdWaBannerPill.className = 'text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono';
      cmdWaBannerPill.textContent = 'Simulasi Web';
    }
    if (cmdWaBannerDesc) cmdWaBannerDesc.textContent = 'Command berjalan dalam mode simulasi browser. Hubungkan WhatsApp untuk eksekusi nyata.';
    if (currentDestinationLabel) currentDestinationLabel.textContent = 'Simulasi Browser';
    if (sendWaNotice) {
      sendWaNotice.textContent = '(Hanya saat terhubung)';
      sendWaNotice.className = 'text-[10px] text-slate-500';
    }
    if (connectedControlPanel) connectedControlPanel.classList.add('hidden');
  }

  // Counters
  if (dashCmds) dashCmds.textContent = data.totalCommandsExecuted || 0;
  if (dashMode) {
    const isPublic = data.config?.isPublic ?? true;
    dashMode.textContent = isPublic ? 'PUBLIC' : 'SELF';
    dashMode.className = isPublic ? 'text-emerald-400' : 'text-rose-400';

    if (modePublicBtn && modeSelfBtn) {
      if (isPublic) {
        modePublicBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition bg-emerald-600 text-white';
        modeSelfBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition text-slate-400 hover:text-white';
      } else {
        modePublicBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition text-slate-400 hover:text-white';
        modeSelfBtn.className = 'px-2.5 py-1 rounded-lg font-medium transition bg-rose-600 text-white';
      }
    }
  }

  // Uptime
  if (dashUptime && data.uptimeSeconds !== undefined) {
    dashUptime.textContent = formatUptime(data.uptimeSeconds);
  }

  // Detail panel on Connection Tab
  const detailStatus = document.getElementById('detailStatusText');
  const detailBotName = document.getElementById('detailBotName');
  const detailBotJid = document.getElementById('detailBotJid');
  const detailConnectedSince = document.getElementById('detailConnectedSince');

  if (detailStatus) detailStatus.textContent = data.status;
  if (detailBotName) detailBotName.textContent = data.user?.name || data.config?.botName || 'Ônepicè';
  if (detailBotJid) detailBotJid.textContent = data.user?.id ? '+' + data.user.id.split(':')[0] : (data.pairingPhone ? '+' + data.pairingPhone : '-');
  if (detailConnectedSince) detailConnectedSince.textContent = data.connectedAt ? new Date(data.connectedAt).toLocaleTimeString() : '-';

  // QR and Pairing UI
  if (data.qrDataUrl) {
    updateQrUI(data.qrDataUrl, data.qrRaw);
  }
  if (data.pairingCode) {
    updatePairingCodeUI(data.pairingCode);
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + 'j ' : ''}${m}m ${s}s`;
}

// --- COMMANDS CATALOG & WORKBENCH ---
async function loadCommands() {
  const res = await apiCall('/api/commands');
  if (res.success && res.commands) {
    state.commands = res.commands;
    state.categories = res.categories;
    const badge = document.getElementById('totalCommandsBadge');
    if (badge) badge.textContent = res.total;

    renderCategories();
    renderCommands();
    if (!state.selectedCommand && state.commands.length > 0) {
      selectCommand(state.commands[0].name);
    }
  }
}

function renderCategories() {
  const container = document.getElementById('cmdCategoriesContainer');
  if (!container) return;

  container.innerHTML = state.categories.map(cat => `
    <button onclick="setCategoryFilter('${cat.id}')" class="cat-pill px-3 py-1.5 rounded-xl text-xs font-semibold border ${state.selectedCategory === cat.id ? 'active' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}">
      ${cat.name}
    </button>
  `).join('');
}

function setCategoryFilter(catId) {
  state.selectedCategory = catId;
  renderCategories();
  renderCommands();
}

function filterCommands() {
  const search = document.getElementById('cmdSearchInput')?.value || '';
  state.searchQuery = search.toLowerCase().trim();
  renderCommands();
}

function renderCommands() {
  const grid = document.getElementById('commandsGrid');
  const countBadge = document.getElementById('cmdFilteredCount');
  if (!grid) return;

  const filtered = state.commands.filter(cmd => {
    const matchesCat = state.selectedCategory === 'all' || cmd.category === state.selectedCategory;
    const matchesSearch = !state.searchQuery || 
      cmd.name.toLowerCase().includes(state.searchQuery) ||
      cmd.description.toLowerCase().includes(state.searchQuery) ||
      (cmd.aliases && cmd.aliases.some(a => a.toLowerCase().includes(state.searchQuery)));
    return matchesCat && matchesSearch;
  });

  if (countBadge) {
    countBadge.textContent = `Menampilkan ${filtered.length} dari ${state.commands.length} command`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-2 py-12 text-center text-slate-500 text-xs">
        Tidak ada command yang cocok dengan pencarian "${state.searchQuery}".
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(cmd => {
    const isSelected = state.selectedCommand && state.selectedCommand.name === cmd.name;
    const badgeColor = cmd.isOwnerOnly 
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
      : cmd.isPremOnly 
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    return `
      <div onclick="selectCommand('${cmd.name}')" class="cmd-card p-3.5 rounded-xl bg-[#0f1422] border ${isSelected ? 'selected' : 'border-slate-800'} cursor-pointer space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-rose-400">
              <i data-lucide="${cmd.icon || 'terminal'}" class="w-3.5 h-3.5"></i>
            </div>
            <span class="font-mono font-bold text-xs text-white">.${cmd.name}</span>
          </div>
          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}">
            ${cmd.badge}
          </span>
        </div>
        <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${cmd.description}</p>
        <div class="flex items-center justify-between pt-1 border-t border-slate-850 text-[10px] text-slate-500">
          <span>${cmd.categoryName}</span>
          <span class="font-mono text-rose-400 font-semibold group-hover:translate-x-0.5 transition">Pilih &rarr;</span>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function selectCommand(cmdName) {
  const cmd = state.commands.find(c => c.name === cmdName);
  if (!cmd) return;

  state.selectedCommand = cmd;
  renderCommands(); // Update selected styling

  const title = document.getElementById('selectedCmdTitle');
  const badge = document.getElementById('selectedCmdBadge');
  const desc = document.getElementById('selectedCmdDesc');
  const inputsContainer = document.getElementById('cmdDynamicInputs');

  if (title) title.textContent = `.${cmd.name}`;
  if (badge) badge.textContent = cmd.badge;
  if (desc) desc.textContent = cmd.description;

  // Render required inputs
  if (inputsContainer) {
    if (!cmd.inputs || cmd.inputs.length === 0) {
      inputsContainer.innerHTML = `
        <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center space-x-2">
          <i data-lucide="info" class="w-4 h-4 text-emerald-400 shrink-0"></i>
          <span>Command ini tidak membutuhkan argumen tambahan. Langsung tekan tombol jalankan di bawah.</span>
        </div>
      `;
    } else {
      inputsContainer.innerHTML = cmd.inputs.map(input => `
        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>${input.label}</span>
            ${input.required ? '<span class="text-[10px] text-rose-400">*Wajib</span>' : ''}
          </label>
          ${input.type === 'textarea' ? `
            <textarea id="input_${input.name}" rows="3" placeholder="${input.placeholder || ''}" class="w-full bg-[#0b101a] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"></textarea>
          ` : `
            <input type="text" id="input_${input.name}" placeholder="${input.placeholder || ''}" class="w-full bg-[#0b101a] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500">
          `}
        </div>
      `).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
}

// --- EXECUTE COMMAND HANDLER ---
function toggleRecipientType(type) {
  const box = document.getElementById('customRecipientBox');
  const label = document.getElementById('currentDestinationLabel');
  if (type === 'custom') {
    if (box) box.classList.remove('hidden');
    if (label) label.textContent = 'Nomor / Grup Tertentu';
  } else {
    if (box) box.classList.add('hidden');
    const phone = state.status?.user?.id ? state.status.user.id.split(':')[0] : (state.status?.pairingPhone || 'Chat Saya');
    if (label) label.textContent = state.status?.status === 'connected' ? `+${phone} (Chat Bot/Saya)` : 'Chat Saya (Simulasi)';
  }
}

async function handleCommandSubmit(event) {
  event.preventDefault();
  if (!state.selectedCommand) return;

  const cmd = state.selectedCommand;
  let args = '';

  if (cmd.inputs && cmd.inputs.length > 0) {
    const inputValues = [];
    for (const input of cmd.inputs) {
      const el = document.getElementById(`input_${input.name}`);
      const val = el?.value?.trim() || '';
      if (input.required && !val) {
        showToast(`Field "${input.label}" wajib diisi.`, 'error');
        el?.focus();
        return;
      }
      if (val) inputValues.push(val);
    }
    args = inputValues.join(' ');
  }

  // Recipient destination
  const recipientType = document.getElementById('targetRecipientType')?.value || 'self';
  let customRecipient = null;
  if (recipientType === 'custom') {
    customRecipient = document.getElementById('customRecipientInput')?.value?.trim() || null;
    if (!customRecipient) {
      showToast('Silakan masukkan nomor atau ID grup tujuan.', 'error');
      document.getElementById('customRecipientInput')?.focus();
      return;
    }
  }

  const sendToWhatsApp = document.getElementById('sendToWaCheckbox')?.checked ?? true;
  const runBtn = document.getElementById('runCmdBtn');
  const runBtnText = document.getElementById('runCmdBtnText');

  runBtn.disabled = true;
  runBtnText.textContent = 'Mengeksekusi Handler...';

  const preview = document.getElementById('chatPreviewContainer');
  preview.innerHTML = `
    <div class="text-center py-8 text-slate-400 space-y-2">
      <div class="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-mono">Menjalankan .${cmd.name} melalui handler asli v20.js...</p>
      ${sendToWhatsApp && state.status?.status === 'connected' ? '<p class="text-[10px] text-emerald-400 font-semibold animate-pulse">Menghubungkan &amp; mengirim langsung ke WhatsApp...</p>' : ''}
    </div>
  `;

  try {
    const res = await apiCall('/api/commands/execute', 'POST', {
      command: cmd.name,
      args,
      sendToWhatsApp,
      customRecipient
    });

    displayExecutionResult(res);
  } catch (err) {
    showToast(`Gagal mengeksekusi command: ${err.message}`, 'error');
  } finally {
    runBtn.disabled = false;
    runBtnText.textContent = 'Jalankan Command';
    loadStatus(); // refresh counters
  }
}

// Quick Run from Overview
async function executeQuickCmd(cmdName) {
  switchTab('commands');
  selectCommand(cmdName);
  setTimeout(() => {
    document.getElementById('cmdExecForm')?.dispatchEvent(new Event('submit', { cancelable: true }));
  }, 300);
}

function displayExecutionResult(res) {
  const durationBadge = document.getElementById('execDuration');
  const statusBadge = document.getElementById('execStatusBadge');
  const preview = document.getElementById('chatPreviewContainer');
  const rawPre = document.getElementById('rawOutputJson');

  if (durationBadge) durationBadge.textContent = `${res.durationMs || 0}ms`;

  if (statusBadge) {
    if (res.success) {
      statusBadge.textContent = res.sendToWhatsApp ? 'Sukses & Terkirim WA' : 'Sukses (Simulasi)';
      statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    } else {
      statusBadge.textContent = 'Error';
      statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
    }
  }

  if (rawPre) {
    rawPre.textContent = JSON.stringify(res, null, 2);
  }

  // Render WhatsApp Emulation Preview
  if (!preview) return;

  if (res.error) {
    preview.innerHTML = `
      <div class="p-3 rounded-xl bg-red-950/40 border border-red-800 text-rose-300 text-xs space-y-1">
        <div class="font-bold flex items-center space-x-1">
          <i data-lucide="alert-circle" class="w-4 h-4 text-rose-400"></i>
          <span>Handler Execution Error</span>
        </div>
        <p class="font-mono text-[11px]">${res.error}</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  let html = '';

  // WhatsApp Dispatch Confirmed Alert
  if (res.sendToWhatsApp) {
    const destPhone = res.targetChat ? res.targetChat.replace(/@s\.whatsapp\.net|@g\.us/g, '') : 'WhatsApp';
    html += `
      <div class="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between mb-2">
        <div class="flex items-center space-x-1.5">
          <i data-lucide="check-check" class="w-4 h-4 text-emerald-400"></i>
          <span class="font-semibold">Otomatis Terkirim ke WhatsApp:</span>
          <span class="font-mono font-bold text-white">+${destPhone}</span>
        </div>
        <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Real WA Socket</span>
      </div>
    `;
  }

  // Outgoing command bubble
  html += `
    <div class="wa-bubble-outgoing p-3 text-xs space-y-1">
      <div class="font-mono font-semibold text-white">${res.fullCommand}</div>
      <div class="text-[9px] text-emerald-200/60 text-right">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `;

  // Render reaction if present
  if (res.reactions && res.reactions.length > 0) {
    html += `
      <div class="flex items-center space-x-1 pl-2 text-xs">
        <span class="text-slate-400 text-[10px]">Reaksi Bot:</span>
        <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-sm">${res.reactions.join(' ')}</span>
      </div>
    `;
  }

  // Render captured responses
  if (res.outputs && res.outputs.length > 0) {
    res.outputs.forEach(out => {
      const text = out.text || (out.content?.text ? out.content.text : null);
      if (text) {
        // Format markdown bold, italic, code
        const formattedText = formatWhatsAppMarkdown(text);
        html += `
          <div class="wa-bubble-incoming p-3 text-xs space-y-2">
            <div class="font-bold text-rose-400 text-[10px]">Ônepicè Bot</div>
            <div class="whitespace-pre-wrap font-sans text-slate-100 leading-relaxed">${formattedText}</div>
            <div class="text-[9px] text-slate-400 text-right">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `;
      } else {
        html += `
          <div class="wa-bubble-incoming p-3 text-xs space-y-1">
            <span class="text-[10px] font-bold text-amber-400">[Media / Interactive Message Response]</span>
            <pre class="text-[10px] font-mono text-slate-300 max-h-32 overflow-y-auto">${JSON.stringify(out.content || out, null, 2)}</pre>
          </div>
        `;
      }
    });
  } else {
    html += `
      <div class="wa-bubble-incoming p-3 text-xs space-y-1">
        <div class="text-slate-400 italic">Command berhasil dieksekusi tanpa balasan teks langsung.</div>
      </div>
    `;
  }

  preview.innerHTML = html;
  preview.scrollTop = preview.scrollHeight;
  if (window.lucide) lucide.createIcons();
}

function formatWhatsAppMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([^~]+)~/g, '<strike>$1</strike>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/50 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">$1</code>');
}

// --- WHATSAPP CONNECTION CONTROLS ---
function setConnectMethod(method) {
  state.connectMethod = method;
  const qrBtn = document.getElementById('methodQrBtn');
  const pairingBtn = document.getElementById('methodPairingBtn');
  const qrSec = document.getElementById('qrSection');
  const pairSec = document.getElementById('pairingSection');

  if (method === 'qr') {
    if (qrBtn) qrBtn.className = 'px-3 py-1.5 rounded-lg font-medium transition bg-rose-600 text-white';
    if (pairingBtn) pairingBtn.className = 'px-3 py-1.5 rounded-lg font-medium transition text-slate-400 hover:text-white';
    if (qrSec) qrSec.classList.remove('hidden');
    if (pairSec) pairSec.classList.add('hidden');
  } else {
    if (qrBtn) qrBtn.className = 'px-3 py-1.5 rounded-lg font-medium transition text-slate-400 hover:text-white';
    if (pairingBtn) pairingBtn.className = 'px-3 py-1.5 rounded-lg font-medium transition bg-rose-600 text-white';
    if (qrSec) qrSec.classList.add('hidden');
    if (pairSec) pairSec.classList.remove('hidden');
  }
}

function setPhonePrefix(prefix) {
  const input = document.getElementById('pairingPhoneInput');
  if (input) {
    const curVal = input.value.replace(/^(\+?62|\+?60|\+?1|0)/, '');
    input.value = prefix + curVal;
    handlePhoneInputChange(input.value);
    input.focus();
  }
}

function handlePhoneInputChange(val) {
  const preview = document.getElementById('phoneFormattedPreview');
  let clean = (val || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('08')) {
    clean = '628' + clean.slice(2);
  } else if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }

  if (preview) {
    preview.textContent = clean ? `+${clean}` : '+62 8...';
  }
}

async function requestStartConnection(method = 'qr', phoneNumber = null) {
  showToast('Memulai koneksi Baileys WhatsApp...', 'info');
  const res = await apiCall('/api/connect', 'POST', { method, phoneNumber });
  if (res.success) {
    if (res.pairingCode) {
      updatePairingCodeUI(res.pairingCode);
    }
    showToast('Koneksi Baileys dimulai.', 'success');
  } else {
    showToast(`Gagal memulai: ${res.error}`, 'error');
  }
  return res;
}

async function requestPairingCode() {
  const rawInput = document.getElementById('pairingPhoneInput')?.value?.trim();
  let phone = (rawInput || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('08')) {
    phone = '628' + phone.slice(2);
  } else if (phone.startsWith('0')) {
    phone = '62' + phone.slice(1);
  }

  if (!phone || phone.length < 8) {
    showToast('Silakan masukkan nomor WhatsApp yang valid (min. 8 digit).', 'error');
    document.getElementById('pairingPhoneInput')?.focus();
    return;
  }

  const btn = document.getElementById('requestPairingBtn');
  const btnText = document.getElementById('requestPairingBtnText');
  const loadingBox = document.getElementById('pairingLoadingBox');
  const codeBox = document.getElementById('pairingCodeBox');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Meminta Kode Pairing...';
  if (loadingBox) loadingBox.classList.remove('hidden');
  if (codeBox) codeBox.classList.add('hidden');

  showToast(`Menghubungi server WhatsApp untuk +${phone}...`, 'info');

  try {
    const res = await requestStartConnection('pairing', phone);
    if (res && res.pairingCode) {
      updatePairingCodeUI(res.pairingCode);
    }
  } catch (err) {
    showToast(`Gagal meminta kode: ${err.message}`, 'error');
    if (loadingBox) loadingBox.classList.add('hidden');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Dapatkan 8-Digit Pairing Code';
  }
}

function updateQrUI(qrDataUrl, qrRaw) {
  const qrImg = document.getElementById('qrImage');
  const placeholder = document.getElementById('qrPlaceholder');

  if (qrDataUrl) {
    if (qrImg) {
      qrImg.src = qrDataUrl;
      qrImg.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
  }
}

function updatePairingCodeUI(code) {
  const box = document.getElementById('pairingCodeBox');
  const display = document.getElementById('pairingCodeDisplay');
  const snippet = document.getElementById('instructionCodeSnippet');
  const loadingBox = document.getElementById('pairingLoadingBox');

  if (loadingBox) loadingBox.classList.add('hidden');

  if (box && display && code) {
    box.classList.remove('hidden');
    display.textContent = code;
    if (snippet) snippet.textContent = code;
    showToast(`Kode Pairing Diterima: ${code}`, 'success');
  }
}

function copyPairingCode() {
  const display = document.getElementById('pairingCodeDisplay');
  if (display && display.textContent) {
    const cleanCode = display.textContent.replace(/[\s-]+/g, '');
    navigator.clipboard.writeText(cleanCode);
    showToast(`Kode pairing ${cleanCode} disalin ke clipboard!`, 'success');
  }
}

// Send test message directly to paired phone number
async function sendTestPingToWhatsApp() {
  showToast('Mengirim tes pesan ke WhatsApp...', 'info');
  const res = await apiCall('/api/whatsapp/test-message', 'POST', {});
  if (res.success) {
    showToast(res.message || 'Pesan tes berhasil terkirim ke WhatsApp Anda!', 'success');
    loadStatus();
  } else {
    showToast(`Gagal kirim pesan: ${res.error}`, 'error');
  }
}

// Make connected user owner
async function makeConnectedNumberOwner() {
  showToast('Menambahkan nomor ke daftar Owner...', 'info');
  const res = await apiCall('/api/whatsapp/make-owner', 'POST', {});
  if (res.success) {
    showToast(res.message || 'Nomor berhasil dijadikan Owner!', 'success');
    await loadAccessData();
    await loadStatus();
  } else {
    showToast(`Gagal: ${res.error}`, 'error');
  }
}

async function requestDisconnect() {
  const res = await apiCall('/api/disconnect', 'POST');
  if (res.success) {
    showToast('WhatsApp berhasil diputus.', 'success');
    loadStatus();
  }
}

async function requestResetSession() {
  if (!confirm('Yakin ingin mereset seluruh sesi WhatsApp? Bot akan ter-logout.')) return;
  const res = await apiCall('/api/session/reset', 'POST');
  if (res.success) {
    showToast('Sesi WhatsApp berhasil dibersihkan.', 'success');
    loadStatus();
  }
}

// --- BOT MODE TOGGLE (PUBLIC / SELF) ---
async function toggleBotMode(isPublic) {
  const res = await apiCall('/api/config', 'POST', { isPublic });
  if (res.success) {
    showToast(`Mode bot diubah ke: ${isPublic ? 'PUBLIC' : 'SELF'}`, 'success');
    loadStatus();
  }
}

// --- ACCESS CONTROL (OWNERS & PREMIUMS) ---
async function loadAccessData() {
  const [ownersRes, premRes] = await Promise.all([
    apiCall('/api/owners'),
    apiCall('/api/premiums')
  ]);

  if (ownersRes.success) {
    state.owners = ownersRes.owners || [];
    renderOwners();
  }
  if (premRes.success) {
    state.premiums = premRes.premiums || [];
    renderPremiums();
  }
}

function renderOwners() {
  const container = document.getElementById('ownersListContainer');
  const badge = document.getElementById('ownerCountBadge');
  const dashBadge = document.getElementById('dashOwnerCount');

  if (badge) badge.textContent = `${state.owners.length} Owner`;
  if (dashBadge) dashBadge.textContent = state.owners.length;
  if (!container) return;

  if (state.owners.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">Belum ada owner terdaftar.</div>`;
    return;
  }

  container.innerHTML = state.owners.map(num => `
    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
      <div class="flex items-center space-x-2">
        <i data-lucide="shield" class="w-4 h-4 text-amber-400"></i>
        <span class="font-mono text-slate-200">${num}</span>
      </div>
      <button onclick="deleteOwnerNumber('${num}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Hapus Owner">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

async function addOwnerNumber() {
  const input = document.getElementById('newOwnerInput');
  const num = input?.value?.trim();
  if (!num) return showToast('Nomor telepon wajib diisi', 'error');

  const res = await apiCall('/api/owners', 'POST', { action: 'add', number: num });
  if (res.success) {
    input.value = '';
    state.owners = res.owners;
    renderOwners();
    showToast(`Nomor ${num} berhasil ditambahkan sebagai Owner.`, 'success');
  }
}

async function deleteOwnerNumber(num) {
  if (!confirm(`Hapus nomor ${num} dari daftar Owner?`)) return;
  const res = await apiCall('/api/owners', 'POST', { action: 'delete', number: num });
  if (res.success) {
    state.owners = res.owners;
    renderOwners();
    showToast(`Nomor ${num} dihapus dari Owner.`, 'success');
  }
}

function renderPremiums() {
  const container = document.getElementById('premiumsListContainer');
  const badge = document.getElementById('premCountBadge');
  const dashBadge = document.getElementById('dashPremCount');

  if (badge) badge.textContent = `${state.premiums.length} Premium`;
  if (dashBadge) dashBadge.textContent = state.premiums.length;
  if (!container) return;

  if (state.premiums.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">Belum ada nomor premium terdaftar.</div>`;
    return;
  }

  container.innerHTML = state.premiums.map(num => `
    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
      <div class="flex items-center space-x-2">
        <i data-lucide="award" class="w-4 h-4 text-rose-400"></i>
        <span class="font-mono text-slate-200">${num}</span>
      </div>
      <button onclick="deletePremNumber('${num}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Hapus Premium">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

async function addPremNumber() {
  const input = document.getElementById('newPremInput');
  const num = input?.value?.trim();
  if (!num) return showToast('Nomor telepon wajib diisi', 'error');

  const res = await apiCall('/api/premiums', 'POST', { action: 'add', number: num });
  if (res.success) {
    input.value = '';
    state.premiums = res.premiums;
    renderPremiums();
    showToast(`Nomor ${num} berhasil ditambahkan sebagai Premium.`, 'success');
  }
}

async function deletePremNumber(num) {
  if (!confirm(`Hapus nomor ${num} dari daftar Premium?`)) return;
  const res = await apiCall('/api/premiums', 'POST', { action: 'delete', number: num });
  if (res.success) {
    state.premiums = res.premiums;
    renderPremiums();
    showToast(`Nomor ${num} dihapus dari Premium.`, 'success');
  }
}

// --- LOGS MANAGEMENT ---
async function loadLogs() {
  const category = document.getElementById('logCategoryFilter')?.value || null;
  const res = await apiCall(`/api/logs?limit=150${category ? '&category=' + category : ''}`);
  if (res.success && res.logs) {
    state.logs = res.logs;
    renderLogs();
    renderRecentLogsSnippet();
  }
}

function renderLogs() {
  const container = document.getElementById('terminalLogWindow');
  if (!container) return;

  if (state.logs.length === 0) {
    container.innerHTML = `<div class="text-slate-600 text-center py-10">Belum ada log tercatat.</div>`;
    return;
  }

  container.innerHTML = state.logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const catClass = `badge-${log.category.toLowerCase()}`;

    return `
      <div class="flex items-start space-x-2 text-[11px] py-0.5 border-b border-slate-900/40">
        <span class="text-slate-500 shrink-0">[${time}]</span>
        <span class="px-1.5 py-0.2 rounded font-bold text-[9px] shrink-0 ${catClass}">${log.category}</span>
        <span class="text-slate-300 break-all font-mono">${escapeHtml(log.message)}</span>
      </div>
    `;
  }).join('');
}

function renderRecentLogsSnippet() {
  const snippet = document.getElementById('dashRecentLogs');
  if (!snippet) return;

  const topLogs = state.logs.slice(0, 6);
  if (topLogs.length === 0) {
    snippet.innerHTML = `<div class="text-slate-600">Belum ada aktivitas.</div>`;
    return;
  }

  snippet.innerHTML = topLogs.map(l => {
    const time = new Date(l.timestamp).toLocaleTimeString();
    return `<div><span class="text-slate-500">[${time}]</span> <span class="text-rose-400 font-bold">${l.category}</span>: ${escapeHtml(l.message)}</div>`;
  }).join('');
}

async function clearLogHistory() {
  const res = await apiCall('/api/logs', 'DELETE');
  if (res.success) {
    state.logs = [];
    renderLogs();
    renderRecentLogsSnippet();
    showToast('Log aktivitas dibersihkan.', 'success');
  }
}

// --- TABS SWITCHER ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const targetPane = document.getElementById(`tab-${tabId}`);
  const targetTabBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);

  if (targetPane) targetPane.classList.remove('hidden');
  if (targetTabBtn) targetTabBtn.classList.add('active');

  if (tabId === 'logs') loadLogs();
  if (tabId === 'access') loadAccessData();
}

// --- AUTH MODAL ---
function openLoginModal() {
  document.getElementById('loginModal')?.classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal')?.classList.add('hidden');
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('adminPasswordInput');
  const errorMsg = document.getElementById('loginErrorMsg');
  const password = input?.value;

  errorMsg?.classList.add('hidden');
  const res = await apiCall('/api/auth/login', 'POST', { password });

  if (res.success && res.token) {
    state.token = res.token;
    localStorage.setItem('onepiece_token', res.token);
    showToast('Login berhasil sebagai Admin!', 'success');
    closeLoginModal();
    document.getElementById('authBtnText').textContent = 'Admin Aktif';
    loadStatus();
  } else {
    errorMsg.textContent = res.error || 'Password salah';
    errorMsg.classList.remove('hidden');
  }
}

// --- UTILITIES ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const color = type === 'success' 
    ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200' 
    : type === 'error' 
    ? 'bg-rose-950/90 border-rose-700 text-rose-200' 
    : 'bg-slate-900/90 border-slate-700 text-slate-200';

  toast.className = `p-3.5 rounded-xl border text-xs shadow-2xl backdrop-blur-md flex items-center space-x-2 transition-all transform duration-300 translate-y-2 opacity-0 pointer-events-auto max-w-sm ${color}`;
  toast.innerHTML = `
    <span class="font-medium">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
