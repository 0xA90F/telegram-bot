import 'dotenv/config';
import http from 'http';
import TelegramBot from 'node-telegram-bot-api';
import {
  initWallet, getWalletAddress, getETHBalance, getBEANBalance,
  deployToBlocks, claimETH, claimBEAN,
  stakeBEAN, unstakeBEAN, claimYield, compoundYield,
  isWalletReady,
} from './wallet.js';
import {
  getCurrentRound, getPrice, getUserRewards, getStakingStats,
  getStakingInfo, getLeaderboard,
} from './api.js';
import {
  formatRoundStatus, formatRewards, formatStakingInfo, formatPrice,
  formatLeaderboard, formatHelp, formatContracts,
} from './formatter.js';
import {
  startAutoDeployer, stopAutoDeployer, isAutoDeployActive,
  getAutoDeployConfig, setNotifyCallback,
} from './autoDeploy.js';
import { startSSE, setSSECallbacks } from './sse.js';

// ─── Health check server (start PERTAMA agar Railway tidak timeout) ──────────
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
}).listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Health check server: http://0.0.0.0:${PORT}`);
});

// ─── Init ───────────────────────────────────────────────────────────────────

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN tidak diset!');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// Set wallet
let walletAddress = null;
try {
  walletAddress = initWallet();
} catch (err) {
  console.error('⚠️ Wallet tidak diinisialisasi:', err.message);
}

// Kirim notif ke admin
function notify(msg) {
  if (adminChatId) {
    bot.sendMessage(adminChatId, msg, { parse_mode: 'Markdown' }).catch(() => {});
  }
}

setNotifyCallback(notify);

// ─── SSE Real-time ──────────────────────────────────────────────────────────

setSSECallbacks({
  onTransition: (data) => {
    if (!data?.settled || !adminChatId) return;
    const s = data.settled;
    const won = walletAddress && s.topMiner?.toLowerCase() === walletAddress.toLowerCase();
    let msg = `🎲 *Round #${s.roundId} Selesai!*\n`;
    msg += `🏆 Block menang: *#${s.winningBlock}*\n`;
    msg += `💰 Total winnings: *${(parseFloat(s.totalWinnings || 0) / 1e18).toFixed(6)} ETH*\n`;
    if (s.beanpotAmount && parseFloat(s.beanpotAmount) > 0) {
      msg += `🎰 *BEANPOT TRIGGERED!* +${(parseFloat(s.beanpotAmount) / 1e18).toFixed(2)} BEAN\n`;
    }
    if (won) msg += `\n🎉 *KAMU MENANG!*`;
    bot.sendMessage(adminChatId, msg, { parse_mode: 'Markdown' }).catch(() => {});
  },
  onDeploy: null, // tidak perlu notif setiap deploy orang lain
});

startSSE();

// ─── Helper ─────────────────────────────────────────────────────────────────

function send(chatId, text, extra = {}) {
  return bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    ...extra,
  });
}

function isAdmin(chatId) {
  // Jika belum ada admin, siapapun yang /start pertama jadi admin
  if (!adminChatId) return true;
  return chatId.toString() === adminChatId.toString();
}

// ─── Commands ───────────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!adminChatId) {
    adminChatId = chatId;
    console.log(`✅ Admin ditetapkan: ${chatId}`);
  }
  send(chatId, `🫘 *Selamat datang di BEAN Bot!*\n\n${walletAddress ? `💼 Wallet: \`${walletAddress}\`` : '⚠️ Wallet belum dikonfigurasi'}\n\nKetik /help untuk melihat semua perintah.`);
});

bot.onText(/\/help/, (msg) => {
  send(msg.chat.id, formatHelp());
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const loading = await send(chatId, '⏳ Mengambil data round...');
  try {
    const round = await getCurrentRound(walletAddress);
    await bot.editMessageText(formatRoundStatus(round, walletAddress), {
      chat_id: chatId,
      message_id: loading.message_id,
      parse_mode: 'Markdown',
    });
  } catch {
    await send(chatId, '❌ Gagal mengambil status round.');
  }
});

bot.onText(/\/price/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const price = await getPrice();
    await send(chatId, formatPrice(price));
  } catch {
    await send(chatId, '❌ Gagal mengambil harga.');
  }
});

bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  try {
    const [eth, bean] = await Promise.all([getETHBalance(), getBEANBalance()]);
    send(chatId, `💼 *Balance Wallet*\n\n💰 ETH: *${parseFloat(eth).toFixed(6)} ETH*\n🫘 BEAN: *${parseFloat(bean).toFixed(4)} BEAN*\n\n\`${walletAddress}\``);
  } catch {
    send(chatId, '❌ Gagal mengambil balance.');
  }
});

bot.onText(/\/rewards/, async (msg) => {
  const chatId = msg.chat.id;
  if (!walletAddress) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  try {
    const rewards = await getUserRewards(walletAddress);
    send(chatId, formatRewards(rewards));
  } catch {
    send(chatId, '❌ Gagal mengambil rewards.');
  }
});

bot.onText(/\/staking/, async (msg) => {
  const chatId = msg.chat.id;
  if (!walletAddress) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  try {
    const [info, globalStats] = await Promise.all([
      getStakingInfo(walletAddress),
      getStakingStats(),
    ]);
    send(chatId, formatStakingInfo(info, globalStats));
  } catch {
    send(chatId, '❌ Gagal mengambil info staking.');
  }
});

bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const data = await getLeaderboard('miners', '24h');
    send(chatId, formatLeaderboard(data, 'miners'));
  } catch {
    send(chatId, '❌ Gagal mengambil leaderboard.');
  }
});

bot.onText(/\/contracts/, (msg) => {
  send(msg.chat.id, formatContracts());
});

// /deploy [blocks] [amount]
// Contoh: /deploy 0,5,12 0.001
bot.onText(/\/deploy (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin yang bisa deploy.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');

  const parts = match[1].trim().split(/\s+/);
  if (parts.length < 2) {
    return send(chatId, '❓ Format: `/deploy 0,5,12 0.001`\nContoh deploy ke block 0, 5, dan 12 dengan 0.001 ETH');
  }

  const blockIds = parts[0].split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 24);
  const ethAmount = parseFloat(parts[1]);

  if (blockIds.length === 0) return send(chatId, '❌ Block IDs tidak valid (0-24).');
  if (isNaN(ethAmount) || ethAmount <= 0) return send(chatId, '❌ Jumlah ETH tidak valid.');

  const loading = await send(chatId, `⏳ Deploying ke blocks [${blockIds.join(', ')}] dengan ${ethAmount} ETH...`);
  try {
    const result = await deployToBlocks(blockIds, ethAmount);
    await bot.editMessageText(
      `✅ *Deploy Berhasil!*\n📦 Blocks: [${blockIds.join(', ')}]\n💰 ETH: ${ethAmount}\n🔗 TX: \`${result.txHash}\``,
      { chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown' }
    );
  } catch (err) {
    await bot.editMessageText(`❌ *Deploy Gagal:*\n${err.message}`, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  }
});

bot.onText(/\/claimeth/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  const loading = await send(chatId, '⏳ Claiming ETH...');
  try {
    const result = await claimETH();
    await bot.editMessageText(`✅ *ETH Claimed!*\n🔗 TX: \`${result.txHash}\``, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  } catch (err) {
    await bot.editMessageText(`❌ *Claim ETH Gagal:*\n${err.message}`, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  }
});

bot.onText(/\/claimbean/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  const loading = await send(chatId, '⏳ Claiming BEAN...');
  try {
    const result = await claimBEAN();
    await bot.editMessageText(`✅ *BEAN Claimed!*\n🔗 TX: \`${result.txHash}\``, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  } catch (err) {
    await bot.editMessageText(`❌ *Claim BEAN Gagal:*\n${err.message}`, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  }
});

// /stake [amount]
bot.onText(/\/stake (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) return send(chatId, '❌ Jumlah BEAN tidak valid.');
  const loading = await send(chatId, `⏳ Staking ${amount} BEAN...`);
  try {
    const result = await stakeBEAN(amount);
    await bot.editMessageText(`✅ *${amount} BEAN di-stake!*\n🔗 TX: \`${result.txHash}\``, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  } catch (err) {
    await bot.editMessageText(`❌ *Stake Gagal:*\n${err.message}`, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  }
});

// /unstake [amount]
bot.onText(/\/unstake (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) return send(chatId, '❌ Jumlah BEAN tidak valid.');
  const loading = await send(chatId, `⏳ Unstaking ${amount} BEAN...`);
  try {
    const result = await unstakeBEAN(amount);
    await bot.editMessageText(`✅ *${amount} BEAN di-unstake!*\n🔗 TX: \`${result.txHash}\``, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  } catch (err) {
    await bot.editMessageText(`❌ *Unstake Gagal:*\n${err.message}`, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  }
});

bot.onText(/\/compound/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  const loading = await send(chatId, '⏳ Compounding yield...');
  try {
    const result = await compoundYield();
    await bot.editMessageText(`✅ *Yield di-compound!*\n🔗 TX: \`${result.txHash}\``, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  } catch (err) {
    await bot.editMessageText(`❌ *Compound Gagal:*\n${err.message}`, {
      chat_id: chatId, message_id: loading.message_id, parse_mode: 'Markdown',
    });
  }
});

// ─── Auto-Deploy Commands ────────────────────────────────────────────────────

bot.onText(/\/autostart/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isWalletReady()) return send(chatId, '⚠️ Wallet belum dikonfigurasi.');
  if (isAutoDeployActive()) return send(chatId, '⚠️ Auto-deploy sudah berjalan!');

  adminChatId = chatId; // pastikan notif masuk ke chat ini
  await startAutoDeployer();
});

bot.onText(/\/autostop/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) return send(chatId, '⛔ Hanya admin.');
  if (!isAutoDeployActive()) return send(chatId, '⚠️ Auto-deploy tidak sedang berjalan.');
  stopAutoDeployer();
});

bot.onText(/\/autostatus/, (msg) => {
  const chatId = msg.chat.id;
  const cfg = getAutoDeployConfig();
  const status = cfg.active ? '🟢 AKTIF' : '🔴 NONAKTIF';
  send(chatId, `🤖 *Auto-Deploy Status: ${status}*\n\n💰 Per round: ${cfg.ethAmount} ETH\n📦 Blocks per round: ${cfg.numBlocks}\n🛑 Min balance: ${cfg.minBalance} ETH`);
});

// ─── Error handling ──────────────────────────────────────────────────────────

bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('🤖 BEAN Telegram Bot started!');
