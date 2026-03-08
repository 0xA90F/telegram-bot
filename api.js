import fetch from 'node-fetch';
import { API_BASE } from './constants.js';

async function apiFetch(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { timeout: 10000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`API Error [${path}]:`, err.message);
    return null;
  }
}

export async function getCurrentRound(userAddress = null) {
  const path = userAddress
    ? `/api/round/current?user=${userAddress}`
    : '/api/round/current';
  return apiFetch(path);
}

export async function getRound(id) {
  return apiFetch(`/api/round/${id}`);
}

export async function getStats() {
  return apiFetch('/api/stats');
}

export async function getPrice() {
  return apiFetch('/api/price');
}

export async function getUserRewards(address) {
  return apiFetch(`/api/user/${address}/rewards`);
}

export async function getUserInfo(address) {
  return apiFetch(`/api/user/${address}`);
}

export async function getUserHistory(address) {
  return apiFetch(`/api/user/${address}/history?type=deploy&limit=10`);
}

export async function getStakingStats() {
  return apiFetch('/api/staking/stats');
}

export async function getStakingInfo(address) {
  return apiFetch(`/api/staking/${address}`);
}

export async function getLeaderboard(type = 'miners', period = '24h') {
  return apiFetch(`/api/leaderboard/${type}?period=${period}&limit=10`);
}

export async function getTreasuryStats() {
  return apiFetch('/api/treasury/stats');
}

export async function getAutoMinerInfo(address) {
  return apiFetch(`/api/automine/${address}`);
}

// Hitung EV per round
export function calculateEV(deployAmount, beanpotPool, beanPriceNative) {
  const beanValue = 1 * parseFloat(beanPriceNative || 0);
  const beanpotEV = (1 / 777) * parseFloat(beanpotPool || 0) * parseFloat(beanPriceNative || 0);
  const fees = parseFloat(deployAmount) * 0.11;
  const netEV = beanValue + beanpotEV - fees;
  return { beanValue, beanpotEV, fees, netEV };
}

// Cari blocks paling sepi
export function getLeastCrowdedBlocks(blocks, count = 5) {
  if (!blocks) return [];
  return [...blocks]
    .sort((a, b) => parseFloat(a.deployed) - parseFloat(b.deployed))
    .slice(0, count)
    .map(b => b.id);
}

// Format ETH angka
export function formatETH(wei, decimals = 6) {
  if (!wei) return '0';
  const eth = parseFloat(wei) / 1e18;
  return eth.toFixed(decimals).replace(/\.?0+$/, '');
}

// Format BEAN angka
export function formatBEAN(wei, decimals = 4) {
  if (!wei) return '0';
  const bean = parseFloat(wei) / 1e18;
  return bean.toFixed(decimals).replace(/\.?0+$/, '');
}
