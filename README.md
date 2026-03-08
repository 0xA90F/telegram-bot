# 🫘 BEAN Telegram Bot

Bot Telegram untuk bermain [BEAN](https://minebean.com) di Base mainnet — monitor grid, deploy ETH, claim rewards, staking, dan auto-deploy otomatis.

---

## 🚀 Deploy ke Railway via GitHub

### Langkah 1 — Buat Bot Telegram

1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Ketik `/newbot` → ikuti instruksi
3. Simpan **Bot Token** yang diberikan

### Langkah 2 — Push ke GitHub

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/bean-telegram-bot.git
git push -u origin main
```

### Langkah 3 — Deploy ke Railway

1. Buka [railway.app](https://railway.app) → **New Project**
2. Pilih **Deploy from GitHub repo**
3. Pilih repo `bean-telegram-bot`
4. Railway otomatis deteksi Dockerfile dan mulai build

### Langkah 4 — Set Environment Variables

Di Railway project → **Variables** tab, tambahkan:

| Variable | Nilai |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
| `WALLET_PRIVATE_KEY` | Private key wallet kamu (dengan `0x`) |
| `BASE_RPC_URL` | `https://mainnet.base.org` |
| `AUTO_DEPLOY_ENABLED` | `false` |
| `AUTO_DEPLOY_AMOUNT` | `0.0001` |
| `AUTO_DEPLOY_BLOCKS` | `5` |
| `MIN_BALANCE_THRESHOLD` | `0.001` |

> ⚠️ **PENTING**: Jangan pernah share `WALLET_PRIVATE_KEY`. Railway menyimpannya sebagai secret terenkripsi.

### Langkah 5 — Mulai Pakai Bot

1. Buka bot kamu di Telegram
2. Ketik `/start`
3. Kamu otomatis jadi admin bot

---

## 📱 Daftar Perintah

### Info & Monitor
| Perintah | Keterangan |
|----------|-----------|
| `/status` | Status round sekarang + grid visual |
| `/price` | Harga BEAN (USD & ETH) |
| `/rewards` | Pending ETH & BEAN rewards |
| `/balance` | Balance ETH & BEAN wallet |
| `/staking` | Info staking + APR |
| `/leaderboard` | Top miners 24h |
| `/contracts` | Alamat semua contracts |

### Aksi Manual
| Perintah | Keterangan |
|----------|-----------|
| `/deploy 0,5,12 0.001` | Deploy ke block 0, 5, 12 dengan 0.001 ETH |
| `/claimeth` | Claim semua pending ETH |
| `/claimbean` | Claim semua pending BEAN |
| `/stake 100` | Stake 100 BEAN |
| `/unstake 50` | Unstake 50 BEAN |
| `/compound` | Compound staking yield |

### Auto-Deploy
| Perintah | Keterangan |
|----------|-----------|
| `/autostart` | Mulai auto-deploy tiap round |
| `/autostop` | Hentikan auto-deploy |
| `/autostatus` | Lihat status & konfigurasi |

---

## 🤖 Cara Kerja Auto-Deploy

Auto-deployer bekerja dengan strategi:
1. **Monitor grid** tiap round via REST API
2. **Tunggu 12 detik terakhir** sebelum round habis (untuk meminimalkan reaksi dari miner lain)
3. **Pilih blocks paling sepi** (ETH deployed paling kecil) untuk dapat share terbesar
4. **Hitung EV** berdasarkan BEAN price + beanpot — kalau negatif tetap deploy karena BEAN punya nilai jangka panjang
5. **Otomatis berhenti** jika balance ETH di bawah threshold

---

## 🔔 Notifikasi Otomatis

Bot akan otomatis mengirim notifikasi ke Telegram kamu saat:
- ✅ Deploy berhasil (auto-deploy)
- 🎲 Round selesai + block pemenang
- 🎰 Beanpot triggered!
- ⛔ Auto-deploy berhenti karena balance rendah
- ❌ Error saat auto-deploy

---

## 🛠 Jalankan Lokal (Development)

```bash
# Clone repo
git clone https://github.com/USERNAME/bean-telegram-bot
cd bean-telegram-bot

# Install dependencies
npm install

# Buat file .env
cp .env.example .env
# Edit .env dengan token dan private key

# Jalankan
npm start

# Development mode (auto-restart)
npm run dev
```

---

## ⚠️ Keamanan

- **Private key**: Simpan hanya di Railway Variables, jangan commit ke GitHub
- **Admin only**: Semua aksi on-chain (deploy, claim, stake) hanya bisa dilakukan oleh user pertama yang `/start`
- **Minimum balance**: Set `MIN_BALANCE_THRESHOLD` untuk melindungi dari kehabisan ETH
- **Gunakan wallet terpisah**: Buat wallet baru khusus untuk bot ini, jangan pakai wallet utama

---

## 📊 Grid Visual

```
🟥🟨🟦⬜⬜
⬜🟦🟥🟨⬜
⬜⬜🟦⬜🟦
🟨⬜⬜🟥⬜
⬜🟦⬜⬜🟨
```

- ⬜ Empty (0 ETH) — paling menguntungkan, 100% share kalau menang
- 🟦 Kecil (< 0.001 ETH)
- 🟨 Sedang (< 0.01 ETH)
- 🟥 Besar (≥ 0.01 ETH) — banyak saingan

---

## 🔗 Links

- [minebean.com](https://minebean.com)
- [Base Network](https://base.org)
- [BaseScan](https://basescan.org)
