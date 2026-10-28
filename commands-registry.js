/**
 * Onepiece WhatsApp Bot - Command Registry & Schema
 * Authentic command definitions from v20.js & connect.js
 */

const COMMANDS = [
  // --- MENU & INFO ---
  {
    name: 'menu',
    aliases: ['help'],
    category: 'menu',
    categoryName: 'Menu & Info',
    icon: 'compass',
    badge: 'Universal',
    description: 'Menampilkan menu utama bot, status, versi 19.0.0, nama bot, dan tombol interaktif.',
    requiresTarget: false,
    requiresGroup: false,
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [],
    example: '.menu'
  },
  {
    name: 'bugmenu',
    aliases: [],
    category: 'menu',
    categoryName: 'Menu & Info',
    icon: 'shield-alert',
    badge: 'Payloads',
    description: 'Menampilkan daftar menu bug / stress-testing (forclos, bangb, fulldelay, d-five, spambkp).',
    requiresTarget: false,
    requiresGroup: false,
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [],
    example: '.bugmenu'
  },
  {
    name: 'ownermenu',
    aliases: [],
    category: 'menu',
    categoryName: 'Menu & Info',
    icon: 'crown',
    badge: 'Owner',
    description: 'Menampilkan menu khusus owner untuk manajemen bot, akses, dan konfigurasi.',
    requiresTarget: false,
    requiresGroup: false,
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [],
    example: '.ownermenu'
  },
  {
    name: 'ping',
    aliases: ['speed'],
    category: 'menu',
    categoryName: 'Menu & Info',
    icon: 'activity',
    badge: 'Diagnostic',
    description: 'Mengukur latency respons bot dan kecepatan sistem server (ms).',
    requiresTarget: false,
    requiresGroup: false,
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [],
    example: '.ping'
  },
  {
    name: 'update',
    aliases: [],
    category: 'menu',
    categoryName: 'Menu & Info',
    icon: 'refresh-cw',
    badge: 'Info',
    description: 'Informasi pembaruan dan tautan saluran resmi Dapzy Official.',
    requiresTarget: false,
    requiresGroup: false,
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [],
    example: '.update'
  },

  // --- OWNER & ACCESS ---
  {
    name: 'addowner',
    aliases: ['addown'],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'user-plus',
    badge: 'Owner Only',
    description: 'Menambahkan nomor baru ke database Owner (Access/Own.json).',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.addowner 6288987025424'
  },
  {
    name: 'delowner',
    aliases: ['delown'],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'user-minus',
    badge: 'Owner Only',
    description: 'Menghapus nomor dari database Owner (Access/Own.json).',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.delowner 6288987025424'
  },
  {
    name: 'addprem',
    aliases: ['addpremium'],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'award',
    badge: 'Owner Only',
    description: 'Menambahkan nomor baru ke database Pengguna Premium (Access/Prem.json).',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.addprem 6288987025424'
  },
  {
    name: 'delprem',
    aliases: ['delpremium'],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'slash',
    badge: 'Owner Only',
    description: 'Menghapus nomor dari database Pengguna Premium (Access/Prem.json).',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.delprem 6288987025424'
  },
  {
    name: 'public',
    aliases: [],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'globe',
    badge: 'Mode',
    description: 'Mengubah mode bot menjadi Public (semua pengguna dapat menjalankan command).',
    requiresTarget: false,
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [],
    example: '.public'
  },
  {
    name: 'self',
    aliases: ['private'],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'lock',
    badge: 'Mode',
    description: 'Mengubah mode bot menjadi Self / Private (hanya Owner yang dapat menjalankan command).',
    requiresTarget: false,
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [],
    example: '.self'
  },
  {
    name: 'cekidgrup',
    aliases: [],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'hash',
    badge: 'Utility',
    description: 'Mengecek dan mengambil ID Group WhatsApp (xxx@g.us) dari link invite.',
    requiresTarget: true,
    targetType: 'groupLink',
    targetPlaceholder: 'https://chat.whatsapp.com/xxxxx',
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [
      { name: 'target', label: 'Link Undangan Grup', type: 'text', placeholder: 'https://chat.whatsapp.com/xxxxx', required: true }
    ],
    example: '.cekidgrup https://chat.whatsapp.com/L4f1K19f07s'
  },
  {
    name: 'eval',
    aliases: ['>'],
    category: 'owner',
    categoryName: 'Owner & Akses',
    icon: 'code',
    badge: 'Owner Only',
    description: 'Eksekusi kode JavaScript langsung di runtime server/bot.',
    requiresTarget: true,
    targetType: 'code',
    targetPlaceholder: 'm.chat || process.memoryUsage()',
    isOwnerOnly: true,
    isPremOnly: false,
    inputs: [
      { name: 'target', label: 'Kode JavaScript', type: 'textarea', placeholder: 'm.chat', required: true }
    ],
    example: '.eval m.chat'
  },

  // --- MENU BANTAI BANTAI / PAYLOADS ---
  {
    name: 'd-five',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'zap',
    badge: 'VIP Payload',
    description: 'Eksekusi payload D-Five protocol test ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target (format internasional tanpa +)', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.d-five 628123456789'
  },
  {
    name: 'fulldelay',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'clock',
    badge: 'Heavy Payload',
    description: 'Kirim rangkaian delay payload intensif ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.fulldelay 628123456789'
  },
  {
    name: 'spambkp',
    aliases: ['spambokep'],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'flame',
    badge: 'Flood Test',
    description: 'Uji ketahanan pesan beruntun ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.spambkp 628123456789'
  },
  {
    name: 'crashclik',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'mouse-pointer-click',
    badge: 'UI Test',
    description: 'Kirim paket interactive click payload ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.crashclik 628123456789'
  },
  {
    name: 'fcnew',
    aliases: ['forclos'],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'x-circle',
    badge: 'Heavy Payload',
    description: 'Kirim format pesan khusus force-close ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.fcnew 628123456789'
  },
  {
    name: 'gear4',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'skull',
    badge: 'Gear 4 Ultimate',
    description: 'Eksekusi paket Gear 4 full-power payload ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.gear4 628123456789'
  },
  {
    name: 'blankxdelay',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'file-text',
    badge: 'Blank Delay',
    description: 'Kirim payload blank character dengan high-latency overhead.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.blankxdelay 628123456789'
  },
  {
    name: 'xcamb',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'camera',
    badge: 'Media Test',
    description: 'Kirim paket media stream validation payload ke nomor target.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.xcamb 628123456789'
  },
  {
    name: 'xcamb2',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'video',
    badge: 'Media Test 2',
    description: 'Varian kedua dari media stream validation payload.',
    requiresTarget: true,
    targetType: 'number',
    targetPlaceholder: '628xxxxxxxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Nomor Target', type: 'text', placeholder: '628xxxxxxxxxx', required: true }
    ],
    example: '.xcamb2 628123456789'
  },
  {
    name: 'xban',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'ban',
    badge: 'Group Test',
    description: 'Uji payload ban grup menggunakan tautan undangan grup WhatsApp.',
    requiresTarget: true,
    targetType: 'groupLink',
    targetPlaceholder: 'https://chat.whatsapp.com/xxxxx',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'Link Undangan Grup', type: 'text', placeholder: 'https://chat.whatsapp.com/xxxxx', required: true }
    ],
    example: '.xban https://chat.whatsapp.com/L4f1K19f07s'
  },
  {
    name: 'bangb',
    aliases: [],
    category: 'bug_payload',
    categoryName: 'Menu Bantai Bantai',
    icon: 'alert-triangle',
    badge: 'Group Crash',
    description: 'Eksekusi bug grup WhatsApp menggunakan ID Grup atau link grup.',
    requiresTarget: true,
    targetType: 'groupId',
    targetPlaceholder: '1203630xxxxxxxx@g.us atau link grup',
    isOwnerOnly: false,
    isPremOnly: true,
    inputs: [
      { name: 'target', label: 'ID Grup atau Link', type: 'text', placeholder: '1203630xxxxxxxx@g.us', required: true }
    ],
    example: '.bangb 120363024982734@g.us'
  },

  // --- BROADCAST & UTILITY ---
  {
    name: 'swgrup',
    aliases: ['swgc'],
    category: 'broadcast',
    categoryName: 'Broadcast & Status',
    icon: 'radio',
    badge: 'Group Status',
    description: 'Kirim pembaruan status ke grup WhatsApp.',
    requiresTarget: false,
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [
      { name: 'caption', label: 'Teks Status', type: 'text', placeholder: 'Halo semua dari Onepiece Dashboard', required: false }
    ],
    example: '.swgrup Halo semua'
  },
  {
    name: 'rokok',
    aliases: [],
    category: 'broadcast',
    categoryName: 'Broadcast & Status',
    icon: 'file-code',
    badge: 'Serializer',
    description: 'Serialisasi struktur pesan quoted WhatsApp ke JSON terformat.',
    requiresTarget: false,
    isOwnerOnly: false,
    isPremOnly: false,
    inputs: [],
    example: '.rokok'
  }
];

module.exports = {
  COMMANDS,
  CATEGORIES: [
    { id: 'all', name: 'Semua Command', icon: 'grid' },
    { id: 'menu', name: 'Menu & Info', icon: 'compass' },
    { id: 'owner', name: 'Owner & Akses', icon: 'crown' },
    { id: 'bug_payload', name: 'Menu Bantai Bantai', icon: 'zap' },
    { id: 'broadcast', name: 'Broadcast & Status', icon: 'radio' }
  ]
};
