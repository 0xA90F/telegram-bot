// Contract Addresses - Base Mainnet
export const CONTRACTS = {
  GridMining: '0x9632495bDb93FD6B0740Ab69cc6c71C9c01da4f0',
  Bean: '0x5c72992b83E74c4D5200A8E8920fB946214a5A5D',
  Treasury: '0x38F6E74148D6904286131e190d879A699fE3Aeb3',
  AutoMiner: '0x31358496900D600B2f523d6EdC4933E78F72De89',
  Staking: '0xfe177128Df8d336cAf99F787b72183D1E68Ff9c2',
};

// GridMining ABI (fungsi yang dipakai)
export const GRID_MINING_ABI = [
  'function deploy(uint8[] calldata blockIds) payable',
  'function claimETH() nonpayable',
  'function claimBEAN() nonpayable',
  'function getCurrentRoundInfo() view returns (uint64 roundId, uint256 startTime, uint256 endTime, uint256 totalDeployed, uint256 timeRemaining, bool isActive)',
  'function getTotalPendingRewards(address user) view returns (uint256 pendingETH, uint256 unroastedBEAN, uint256 roastedBEAN, uint64 uncheckpointedRound)',
  'function getPendingBEAN(address user) view returns (uint256 gross, uint256 fee, uint256 net)',
  'function getRoundDeployed(uint64 roundId) view returns (uint256[25])',
  'function getMinerInfo(uint64 roundId, address user) view returns (uint256 deployedMask, uint256 amountPerBlock, bool checkpointed)',
  'function beanpotPool() view returns (uint256)',
  'function currentRoundId() view returns (uint64)',
];

// Bean ERC20 ABI
export const BEAN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Staking ABI
export const STAKING_ABI = [
  'function deposit(uint256 amount) nonpayable',
  'function withdraw(uint256 amount) nonpayable',
  'function claimYield() nonpayable',
  'function compound() nonpayable',
  'function getStakeInfo(address user) view returns (uint256 balance, uint256 pendingRewards, uint256 compoundFeeReserve, uint256 lastClaimAt, uint256 lastDepositAt, uint256 lastWithdrawAt, bool canCompound)',
  'function getPendingRewards(address user) view returns (uint256)',
  'function getGlobalStats() view returns (uint256 totalStaked, uint256 totalYieldDistributed, uint256 accYieldPerShare)',
];

// API Base URL
export const API_BASE = 'https://api.minebean.com';

// Game Constants
export const GAME_CONSTANTS = {
  ROUND_DURATION: 60,
  GRID_SIZE: 25,
  MIN_DEPLOY_PER_BLOCK: 0.0000025,
  ADMIN_FEE_BPS: 100,
  VAULT_FEE_BPS: 1000,
  ROASTING_FEE_BPS: 1000,
};
