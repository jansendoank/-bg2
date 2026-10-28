# ⚡ ONEPIECE WHATSAPP BOT & WEB DASHBOARD VIP v19.0.0
> **ONE BOT · ONE DASHBOARD · ALL COMMANDS · FULL CONTROL**

Aplikasi ini merupakan transformasi menyeluruh dari source code bot WhatsApp berbasis Node.js/Baileys (`jansendoank/Onepiece` by ĎapzyOfficiàl) menjadi **Web Dashboard Profesional**, di mana seluruh command dan fitur asli bot dapat dipantau dan dijalankan langsung melalui web interface.

---

## 🌟 Fitur Utama

1. **Full Feature & All 31 Original Commands**
   - Seluruh command, plugin, dan handler asli di `v20.js` dan `connect.js` dipertahankan 100%.
   - Kategori:
     - 📜 **Menu & Info**: `.menu`, `.bugmenu`, `.ownermenu`, `.ping`, `.update`
     - 👑 **Owner & Akses**: `.addowner`, `.delowner`, `.addprem`, `.delprem`, `.public`, `.self`, `.private`, `.cekidgrup`, `.eval`
     - ⚡ **Menu Bantai Bantai (VIP Payloads)**: `.d-five`, `.fulldelay`, `.spambkp`, `.crashclik`, `.fcnew`, `.gear4`, `.blankxdelay`, `.xcamb`, `.xcamb2`, `.xban`, `.bangb`, `.rokok`
     - 📢 **Broadcast & Stories**: `.swgrup`, `.swgc`
2. **Web Dashboard Modern & Responsive**
   - Tampilan Cyberpunk Dark Theme premium dengan aksen Crimson & Emerald.
   - Responsif optimal di layar Android, tablet, dan desktop.
3. **Command Center Interaktif**
   - Form input dinamis sesuai kebutuhan command (Nomor Target, Link Grup, Kode JS).
   - Mode simulasi (preview hasil handler WhatsApp) atau kirim langsung ke WhatsApp asli jika terhubung.
   - WhatsApp Chat Emulation view (menampilkan balon chat WhatsApp nyata dengan teks, reaksi emoji, dan tombol).
4. **WhatsApp Connection Center**
   - **QR Code Scanner**: Scan langsung dari kamera WhatsApp di ponsel.
   - **Pairing Code (8-Digit)**: Hubungkan nomor tanpa perlu kamera, cukup masukkan nomor telepon dan masukkan kode di WhatsApp.
   - **Penyimpanan Sesi Persisten**: Kredensial tersimpan di `./session/` (Baileys MultiFileAuthState) sehingga tidak perlu login ulang saat server restart.
5. **Live Monitoring & Terminal Logs**
   - Status bot real-time via WebSocket.
   - Monitoring memori RAM, CPU, Uptime, dan jumlah eksekusi command.
   - Streaming terminal activity log real-time dengan filter kategori.
6. **Keamanan & Proteksi Akses**
   - Login admin dengan token autentikasi.
   - Perlindungan file kredensial dan validasi input.
   - Manajemen owner (`Access/Own.json`) dan premium (`Access/Prem.json`) langsung dari UI.

---

## 🚀 Panduan Instalasi & Deployment di Panel Wipsbyte

Panel Wipsbyte menggunakan arsitektur berbasis Pterodactyl container. Proyek ini sudah dirancang **Wipsbyte-Ready**.

### 1. Upload File ke File Manager Wipsbyte
1. Download seluruh source code proyek ini dalam bentuk `.zip`.
2. Buka panel Wipsbyte Anda &gt; buka menu **File Manager**.
3. Upload file `.zip` lalu ekstrak (unarchive) ke root folder server.

### 2. Atur Environment Variables (.env)
Buka file `.env` di File Manager Wipsbyte atau edit melalui panel:
```env
# Port server (Wipsbyte akan otomatis menyediakan PORT, default: 3000)
PORT=3000
HOST=0.0.0.0

# Password Login Admin Dashboard
ADMIN_PASSWORD=onepiece2026

# Pengaturan Bot WhatsApp
BOT_NAME="Ônepicè"
BOT_OWNER_NUMBER="6288987025424"
DEFAULT_PREFIX="."
AUTO_CONNECT_WHATSAPP=false
```

### 3. Konfigurasi Startup Command
Buka menu **Startup** di panel Wipsbyte:
- **Startup Command**: `npm start`
- Node.js Version: **Node.js 18, 20, atau 22**

### 4. Jalankan Server
1. Masuk ke tab **Console** di Wipsbyte.
2. Klik tombol **Start** server.
3. Tunggu hingga console menampilkan:
   ```
   ⚡ ONEPIECE BOT & WEB DASHBOARD RUNNING
   🌐 Local URL : http://0.0.0.0:3000
   🔑 Admin Pass: onepiece2026
   📱 Commands  : 31 authentic bot commands loaded
   ```
4. Buka URL Web server yang diberikan panel Wipsbyte di browser Anda.

---

## 💻 Menjalankan di Local / VPS (Manual)

```bash
# 1. Install dependencies
npm install

# 2. Jalankan Server Web Dashboard & Bot
npm start
# atau
npm run dev

# 3. Buka browser di http://localhost:3000
# Masukkan password admin: onepiece2026
```

---

## 📱 Struktur Direktori Utama

```
├── Access/
│   ├── Own.json               # Database nomor Owner
│   └── Prem.json              # Database nomor Premium
├── System/
│   ├── x1.js                  # Helper, serializer pesan, media downloader
│   ├── menu.mp4               # Video aset menu bot
│   ├── menu-banner.jpg        # Banner aset menu
│   └── menu-thumbnail.jpg     # Thumbnail aset menu
├── public/                    # Frontend Web Dashboard
│   ├── index.html             # Single Page Application
│   ├── styles.css             # Tema Cyberpunk Dark & WhatsApp Chat Emulation
│   └── app.js                 # WebSocket client & command execution controller
├── setting/
│   └── config.js              # Pengaturan bot global
├── session/                   # Penyimpanan sesi persisten Baileys
├── bot-manager.js             # Baileys Socket Engine & Command Dispatcher
├── commands-registry.js       # Registry metadata 31 command asli
├── server.js                  # Express API & WebSocket Server
├── package.json
└── .env.example
```

---

## 🔒 Catatan Keamanan
- Jangan bagikan folder `./session/` ke publik karena berisi kredensial WhatsApp.
- Ubah `ADMIN_PASSWORD` di `.env` menjadi password yang kuat sebelum dipublikasikan.
