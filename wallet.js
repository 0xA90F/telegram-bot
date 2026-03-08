import { ethers } from 'ethers';
import { CONTRACTS, GRID_MINING_ABI, BEAN_ABI, STAKING_ABI, GAME_CONSTANTS } from './constants.js';

let provider = null;
let wallet = null;
let gridMining = null;
let beanToken = null;
let staking = null;

export function initWallet() {
  if (!process.env.WALLET_PRIVATE_KEY || !process.env.BASE_RPC_URL) {
    throw new Error('WALLET_PRIVATE_KEY dan BASE_RPC_URL harus diset di environment');
  }
  provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
  gridMining = new ethers.Contract(CONTRACTS.GridMining, GRID_MINING_ABI, wallet);
  beanToken = new ethers.Contract(CONTRACTS.Bean, BEAN_ABI, wallet);
  staking = new ethers.Contract(CONTRACTS.Staking, STAKING_ABI, wallet);
  console.log(`✅ Wallet initialized: ${wallet.address}`);
  return wallet.address;
}

export function getWalletAddress() {
  return wallet?.address || null;
}

export async function getETHBalance() {
  if (!provider || !wallet) return null;
  const bal = await provider.getBalance(wallet.address);
  return ethers.formatEther(bal);
}

export async function getBEANBalance() {
  if (!beanToken || !wallet) return null;
  const bal = await beanToken.balanceOf(wallet.address);
  return ethers.formatEther(bal);
}

// Deploy ke blocks tertentu
export async function deployToBlocks(blockIds, ethAmount) {
  if (!gridMining) throw new Error('Wallet belum diinisialisasi');

  const minRequired = GAME_CONSTANTS.MIN_DEPLOY_PER_BLOCK * blockIds.length;
  if (parseFloat(ethAmount) < minRequired) {
    throw new Error(`Minimum deploy: ${minRequired} ETH untuk ${blockIds.length} blocks`);
  }

  const value = ethers.parseEther(ethAmount.toString());
  const tx = await gridMining.deploy(blockIds, { value, gasLimit: 500000 });
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

// Claim ETH rewards
export async function claimETH() {
  if (!gridMining) throw new Error('Wallet belum diinisialisasi');
  const tx = await gridMining.claimETH({ gasLimit: 200000 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Claim BEAN rewards
export async function claimBEAN() {
  if (!gridMining) throw new Error('Wallet belum diinisialisasi');
  const tx = await gridMining.claimBEAN({ gasLimit: 200000 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Stake BEAN
export async function stakeBEAN(amount) {
  if (!beanToken || !staking) throw new Error('Wallet belum diinisialisasi');
  const amountWei = ethers.parseEther(amount.toString());

  // Approve dulu
  const allowance = await beanToken.allowance(wallet.address, CONTRACTS.Staking);
  if (allowance < amountWei) {
    const approveTx = await beanToken.approve(CONTRACTS.Staking, amountWei);
    await approveTx.wait();
  }

  const tx = await staking.deposit(amountWei, { gasLimit: 200000 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Unstake BEAN
export async function unstakeBEAN(amount) {
  if (!staking) throw new Error('Wallet belum diinisialisasi');
  const amountWei = ethers.parseEther(amount.toString());
  const tx = await staking.withdraw(amountWei, { gasLimit: 200000 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Claim staking yield
export async function claimYield() {
  if (!staking) throw new Error('Wallet belum diinisialisasi');
  const tx = await staking.claimYield({ gasLimit: 200000 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Compound staking yield
export async function compoundYield() {
  if (!staking) throw new Error('Wallet belum diinisialisasi');
  const tx = await staking.compound({ gasLimit: 200000 });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// Get on-chain pending rewards
export async function getOnChainRewards(address) {
  if (!gridMining) return null;
  try {
    const [pendingETH, unroastedBEAN, roastedBEAN] =
      await gridMining.getTotalPendingRewards(address);
    return {
      pendingETH: ethers.formatEther(pendingETH),
      unroastedBEAN: ethers.formatEther(unroastedBEAN),
      roastedBEAN: ethers.formatEther(roastedBEAN),
    };
  } catch {
    return null;
  }
}

// Get on-chain staking info
export async function getOnChainStakingInfo(address) {
  if (!staking) return null;
  try {
    const info = await staking.getStakeInfo(address);
    return {
      balance: ethers.formatEther(info[0]),
      pendingRewards: ethers.formatEther(info[1]),
      canCompound: info[6],
    };
  } catch {
    return null;
  }
}

export function isWalletReady() {
  return wallet !== null;
}
