import { getCurrentRound, getPrice, calculateEV, getLeastCrowdedBlocks } from './api.js';
import { deployToBlocks, getETHBalance, getWalletAddress } from './wallet.js';
import { GAME_CONSTANTS } from './constants.js';

let autoDeployActive = false;
let autoDeployTimer = null;
let lastRoundId = null;
let onNotify = null; // callback untuk kirim notif ke Telegram

export function setNotifyCallback(fn) {
  onNotify = fn;
}

function notify(msg) {
  if (onNotify) onNotify(msg);
}

export function isAutoDeployActive() {
  return autoDeployActive;
}

export async function startAutoDeployer(config = {}) {
  if (autoDeployActive) return false;

  const ethAmount = config.ethAmount || parseFloat(process.env.AUTO_DEPLOY_AMOUNT || '0.0001');
  const numBlocks = config.numBlocks || parseInt(process.env.AUTO_DEPLOY_BLOCKS || '5');
  const minBalance = config.minBalance || parseFloat(process.env.MIN_BALANCE_THRESHOLD || '0.001');

  autoDeployActive = true;
  notify(`🤖 *Auto-Deploy AKTIF*\n💰 Per round: ${ethAmount} ETH\n📦 Blocks: ${numBlocks}\n🛑 Stop jika balance < ${minBalance} ETH`);

  async function runCycle() {
    if (!autoDeployActive) return;

    try {
      // Cek balance
      const balance = await getETHBalance();
      if (parseFloat(balance) < minBalance) {
        autoDeployActive = false;
        notify(`⛔ *Auto-Deploy BERHENTI*\nBalance terlalu rendah: ${parseFloat(balance).toFixed(6)} ETH`);
        return;
      }

      // Ambil state round
      const round = await getCurrentRound(getWalletAddress());
      if (!round) {
        scheduleNext(5000);
        return;
      }

      // Jika sudah deploy round ini, tunggu round berikutnya
      if (round.userDeployed && parseFloat(round.userDeployed) > 0) {
        const timeLeft = round.endTime - Math.floor(Date.now() / 1000);
        if (timeLeft > 0) {
          scheduleNext((timeLeft + 2) * 1000);
          return;
        }
      }

      // Skip jika round sama
      if (round.roundId === lastRoundId) {
        scheduleNext(5000);
        return;
      }

      // Jika round sudah settled, tunggu round baru
      if (round.settled) {
        scheduleNext(3000);
        return;
      }

      // Cek EV
      const price = await getPrice();
      const priceNative = price?.bean?.priceNative || '0';
      const beanpotFormatted = parseFloat(round.beanpotPool || '0') / 1e18;
      const ev = calculateEV(ethAmount, beanpotFormatted, priceNative);

      // Pilih blocks paling sepi
      const blocks = getLeastCrowdedBlocks(round.blocks, numBlocks);

      if (blocks.length === 0) {
        scheduleNext(5000);
        return;
      }

      // Cek waktu tersisa - deploy 10 detik sebelum habis untuk antisipasi reaksi
      const timeLeft = round.endTime - Math.floor(Date.now() / 1000);
      if (timeLeft > 15) {
        // Tunggu sampai 12 detik tersisa
        scheduleNext((timeLeft - 12) * 1000);
        return;
      }

      // Deploy!
      lastRoundId = round.roundId;
      notify(`🎯 *Deploying Round #${round.roundId}*\n📦 Blocks: [${blocks.join(', ')}]\n💰 Amount: ${ethAmount} ETH\n📊 EV: ${ev.netEV > 0 ? '✅' : '⚠️'} ${ev.netEV.toFixed(6)} ETH`);

      const result = await deployToBlocks(blocks, ethAmount);
      notify(`✅ *Deploy Berhasil!*\nRound #${round.roundId}\n🔗 TX: \`${result.txHash}\``);

      scheduleNext(10000); // tunggu round settle
    } catch (err) {
      console.error('AutoDeploy error:', err.message);
      notify(`❌ *Auto-Deploy Error:*\n${err.message}`);
      scheduleNext(15000); // retry after error
    }
  }

  function scheduleNext(ms) {
    if (!autoDeployActive) return;
    autoDeployTimer = setTimeout(runCycle, ms);
  }

  runCycle();
  return true;
}

export function stopAutoDeployer() {
  autoDeployActive = false;
  if (autoDeployTimer) {
    clearTimeout(autoDeployTimer);
    autoDeployTimer = null;
  }
  notify('🛑 *Auto-Deploy DIMATIKAN*');
}

export function getAutoDeployConfig() {
  return {
    active: autoDeployActive,
    ethAmount: parseFloat(process.env.AUTO_DEPLOY_AMOUNT || '0.0001'),
    numBlocks: parseInt(process.env.AUTO_DEPLOY_BLOCKS || '5'),
    minBalance: parseFloat(process.env.MIN_BALANCE_THRESHOLD || '0.001'),
  };
}
