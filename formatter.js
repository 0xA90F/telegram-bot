import { CONTRACTS } from './constants.js';

// Buat grid 5x5 visual
export function renderGrid(blocks) {
  if (!blocks || blocks.length < 25) return '(grid tidak tersedia)';

  const rows = [];
  for (let row = 0; row < 5; row++) {
    let rowStr = '';
    for (let col = 0; col < 5; col++) {
      const id = row * 5 + col;
      const block = blocks[id];
      const eth = parseFloat(block?.deployed || 0) / 1e18;
      if (eth === 0) rowStr += '⬜';
      else if (eth < 0.001) rowStr += '🟦';
      else if (eth < 0.01) rowStr += '🟨';
      else rowStr += '🟥';
    }
    rows.push(rowStr);
  }
  return rows.join('\n') + '\n⬜Empty 🟦Kecil 🟨Sedang 🟥Besar';
}

export function formatRoundStatus(round, walletAddress = null) {
  if (!round) return '❌ Gagal mengambil data round.';

  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Math.max(0, round.endTime - now);
  const totalETH = parseFloat(round.totalDeployed || 0) / 1e18;
  const beanpot = parseFloat(round.beanpotPool || 0) / 1e18;

  let msg = `🎮 *Round #${round.roundId}*\n`;
  msg += `⏱ Waktu tersisa: *${timeLeft}s*\n`;
  msg += `💰 Total pool: *${totalETH.toFixed(6)} ETH*\n`;
  msg += `🫘 Beanpot: *${beanpot.toFixed(2)} BEAN*\n`;
  msg += `👥 Miners aktif: *${round.blocks?.filter(b => b.minerCount > 0).length || 0}/25 blocks*\n`;

  if (walletAddress && round.userDeployed) {
    const userETH = parseFloat(round.userDeployed) / 1e18;
    if (userETH > 0) {
      msg += `✅ Kamu sudah deploy: *${userETH.toFixed(6)} ETH*\n`;
    }
  }

  msg += `\n${renderGrid(round.blocks)}`;
  return msg;
}

export function formatRewards(rewards) {
  if (!rewards) return '❌ Gagal mengambil data rewards.';

  const ethPending = parseFloat(rewards.pendingETH || 0) / 1e18;
  const beanGross = parseFloat(rewards.pendingBEAN?.gross || 0) / 1e18;
  const beanNet = parseFloat(rewards.pendingBEAN?.net || 0) / 1e18;
  const beanFee = parseFloat(rewards.pendingBEAN?.fee || 0) / 1e18;
  const roasted = parseFloat(rewards.pendingBEAN?.roasted || 0) / 1e18;

  let msg = `💎 *Pending Rewards*\n\n`;
  msg += `💰 ETH: *${ethPending.toFixed(6)} ETH*\n`;
  msg += `🫘 BEAN (gross): *${beanGross.toFixed(4)} BEAN*\n`;
  msg += `   ├ Roasted bonus: ${roasted.toFixed(4)} BEAN\n`;
  msg += `   ├ Roasting fee: -${beanFee.toFixed(4)} BEAN\n`;
  msg += `   └ Net diterima: *${beanNet.toFixed(4)} BEAN*\n`;

  return msg;
}

export function formatStakingInfo(stakingInfo, globalStats) {
  let msg = `🏦 *Staking Info*\n\n`;

  if (stakingInfo) {
    const balance = parseFloat(stakingInfo.stakedFormatted || stakingInfo.balance || 0);
    const pending = parseFloat(stakingInfo.pendingYieldFormatted || stakingInfo.pendingRewards || 0);
    msg += `📊 Staked: *${balance.toFixed(4)} BEAN*\n`;
    msg += `💸 Pending yield: *${pending.toFixed(6)} ETH*\n`;
    if (stakingInfo.canCompound !== undefined) {
      msg += `🔄 Bisa compound: ${stakingInfo.canCompound ? '✅' : '❌'}\n`;
    }
  }

  if (globalStats) {
    const apr = parseFloat(globalStats.apr || 0);
    const totalStaked = parseFloat(globalStats.totalStaked || 0) / 1e18;
    const tvl = globalStats.tvlUsd ? `$${parseFloat(globalStats.tvlUsd).toFixed(2)}` : '-';
    msg += `\n📈 APR: *${apr.toFixed(2)}%*\n`;
    msg += `🏊 Total staked: *${totalStaked.toFixed(2)} BEAN*\n`;
    msg += `💵 TVL: *${tvl}*\n`;
  }

  return msg;
}

export function formatPrice(priceData) {
  if (!priceData?.bean) return '❌ Data harga tidak tersedia.';
  const b = priceData.bean;
  const change = parseFloat(b.priceChange24h || 0);
  const changeEmoji = change >= 0 ? '📈' : '📉';

  let msg = `💱 *BEAN Price*\n\n`;
  msg += `💰 USD: *$${parseFloat(b.priceUsd || 0).toFixed(6)}*\n`;
  msg += `⚡ ETH: *${parseFloat(b.priceNative || 0).toFixed(8)} ETH*\n`;
  msg += `${changeEmoji} 24h: *${change.toFixed(2)}%*\n`;
  msg += `📊 Volume 24h: *$${parseFloat(b.volume24h || 0).toFixed(2)}*\n`;
  msg += `💧 Liquidity: *$${parseFloat(b.liquidity || 0).toFixed(2)}*\n`;
  msg += `🏷 FDV: *$${parseFloat(b.fdv || 0).toFixed(2)}*\n`;

  return msg;
}

export function formatLeaderboard(data, type) {
  if (!data) return '❌ Data leaderboard tidak tersedia.';

  const titles = {
    miners: '⛏️ Top Miners (24h)',
    earners: '🫘 Top BEAN Holders',
    stakers: '🏦 Top Stakers',
  };

  let msg = `${titles[type] || '🏆 Leaderboard'}\n\n`;
  const items = data.miners || data.earners || data.stakers || data.data || [];

  items.slice(0, 10).forEach((item, i) => {
    const addr = (item.address || item.user || '???').slice(0, 10) + '...';
    const value = item.totalDeployedFormatted || item.unclaimedBEAN || item.stakedFormatted || '-';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    msg += `${medal} \`${addr}\` — ${value}\n`;
  });

  return msg;
}

export function formatHelp() {
  return `🫘 *BEAN Bot - Panduan*

*📊 Info & Status*
/status - Status round sekarang + grid
/price - Harga BEAN terkini
/rewards - Pending rewards kamu
/balance - Balance ETH & BEAN
/staking - Info staking kamu
/leaderboard - Top miners

*⚡ Aksi Manual*
/deploy \\[blocks\\] \\[ETH\\] - Deploy ke blocks
  _Contoh: /deploy 0,5,12 0.001_
/claimeth - Claim pending ETH
/claimbean - Claim pending BEAN
/stake \\[amount\\] - Stake BEAN
/unstake \\[amount\\] - Unstake BEAN
/compound - Compound staking yield

*🤖 Auto-Deploy*
/autostart - Mulai auto-deploy
/autostop - Hentikan auto-deploy
/autostatus - Status auto-deploy

*ℹ️ Lainnya*
/contracts - Alamat contracts
/help - Tampilkan menu ini

---
🔗 [minebean.com](https://minebean.com) | Base Mainnet`;
}

export function formatContracts() {
  return `📋 *BEAN Contracts (Base)*

\`GridMining\`
\`${CONTRACTS.GridMining}\`

\`Bean Token\`
\`${CONTRACTS.Bean}\`

\`Staking\`
\`${CONTRACTS.Staking}\`

\`AutoMiner\`
\`${CONTRACTS.AutoMiner}\`

\`Treasury\`
\`${CONTRACTS.Treasury}\`

🔍 [Lihat di BaseScan](https://basescan.org/address/${CONTRACTS.GridMining})`;
}
