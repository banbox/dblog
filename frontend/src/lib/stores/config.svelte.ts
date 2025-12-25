/**
 * Reactive configuration store with localStorage persistence
 * Allows users to override default config values after deployment
 */
import { browser } from '$app/environment';

// Import env defaults (build-time values)
import {
	PUBLIC_BLOG_HUB_CONTRACT_ADDRESS,
	PUBLIC_SESSION_KEY_MANAGER_ADDRESS,
	PUBLIC_RPC_URL,
	PUBLIC_CHAIN_ID,
	PUBLIC_IRYS_NETWORK,
	PUBLIC_ARWEAVE_GATEWAYS,
	PUBLIC_SUBSQUID_ENDPOINT
} from '$env/static/public';

import * as publicEnv from '$env/static/public';
const PUBLIC_MIN_GAS_FEE_MULTIPLIER = (publicEnv as Record<string, string>)['PUBLIC_MIN_GAS_FEE_MULTIPLIER'] || '';
const PUBLIC_DEFAULT_GAS_FEE_MULTIPLIER = (publicEnv as Record<string, string>)['PUBLIC_DEFAULT_GAS_FEE_MULTIPLIER'] || '';

const CONFIG_STORAGE_KEY = 'amberink_user_config';

// Pyth Network contract addresses for different chains
// See https://docs.pyth.network/price-feeds/contract-addresses/evm
export const PYTH_CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
	// Ethereum Mainnet
	1: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
	// Sepolia (testnet)
	11155111: '0xDd24F84d36BF92C65F92307595335bdFab5Bbd21',

	// Arbitrum One
	42161: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
	// Arbitrum Nova
	42170: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
	// Arbitrum Sepolia (Testnet)
	421614: '0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF',

	// Optimism Mainnet
	10: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
	11155420: '0x0708325268dF9F66270F1401206434524814508b',

	// Base Mainnet
	8453: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a',
	84532: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',

	// zkSync Era
	324: '0xf087c864AEccFb6A2Bf1Af6A0382B0d0f6c5D834',
	300: '0x056f829183Ec806A78c26C98961678c24faB71af',

	// Polygon zkEVM
	1101: '0xC5E56d6b40F3e3B5fbfa266bCd35C37426537c65',
	2442: '0xFf255f800044225f54Af4510332Aa3D67CC77635',

	// Polygon PoS
	137: '0xff1a0f4744e8582DF1aE09D5611b887B6a12925C',
	80002: '0x2880aB155794e7179c9eE2e38200202908C17B43',

	// Mantle
	5000: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',
	5003: '0x98046Bd286715D3B0BC227Dd7a956b83D8978603',

	// Scroll
	534352: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729',
	534351: '0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c',

	// Local Anvil (mock - will use fallback price)
	31337: '0x0000000000000000000000000000000000000000'
};

// Pyth Price Feed IDs - same across all chains
// See https://pyth.network/developers/price-feed-ids
export const PYTH_PRICE_FEED_IDS: Record<string, `0x${string}`> = {
	// ETH/USD - used for ETH, OP, Arbitrum, Base, Polygon zkEvm
	'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
	// POL/USD - Polygon Pos
	'POL': '0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472',
	// MNT/USD - Mantle
	'MNT': '0x4e3037c822d852d79af3ac80e35eb420ee3b870dca49f9344a38ef4773fb0585'
};

// Map chain ID to native token symbol for price lookup
export const CHAIN_NATIVE_TOKEN: Record<number, string> = {
	// Ethereum
	1: 'ETH',           // Ethereum Mainnet
	11155111: 'ETH',    // Sepolia (Testnet)

	// Arbitrum
	42161: 'ETH',       // Arbitrum One (Mainnet)
	42170: 'ETH',       // Arbitrum Nova (Mainnet)
	421614: 'ETH',      // Arbitrum Sepolia (Testnet)

	// Optimism
	10: 'ETH',          // Optimism Mainnet (OP Mainnet)
	11155420: 'ETH',    // Optimism Sepolia (Testnet)

	// Base
	8453: 'ETH',        // Base Mainnet
	84532: 'ETH',       // Base Sepolia (Testnet)

	// zkSync Era
	324: 'ETH',         // zkSync Era Mainnet
	300: 'ETH',         // zkSync Sepolia (Testnet)

	// Polygon zkEVM
	1101: 'ETH',        // Polygon zkEVM Mainnet
	2442: 'ETH',        // Polygon zkEVM Cardona (Testnet)

	// Polygon PoS
	137: 'POL',         // Polygon PoS Mainnet
	80002: 'POL',       // Polygon Amoy (Testnet)

	// Mantle
	5000: 'MNT',        // Mantle Mainnet
	5003: 'MNT',        // Mantle Sepolia (Testnet)

	// Scroll
	534352: 'ETH',      // Scroll Mainnet
	534351: 'ETH',      // Scroll Sepolia (Testnet)

	// Local Development
	31337: 'ANVIL'      // Local Anvil
};

// Default values (used when env vars are not set)
export const defaults = {
	blogHubContractAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
	sessionKeyManagerAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
	rpcUrl: 'http://localhost:8545',
	chainId: 31337,
	irysNetwork: 'devnet' as const,
	appName: 'AmberInk',
	appVersion: '1.0.0',
	arweaveGateways: ['https://gateway.irys.xyz', 'https://arweave.net', 'https://arweave.dev'],
	subsquidEndpoint: 'http://localhost:4350/graphql',
	minGasFeeMultiplier: 10,
	defaultGasFeeMultiplier: 30,
	irysFreeUploadLimit: 102400,
	minActionValue: '20000000000000', // Store as string for JSON serialization
	// USD pricing defaults
	defaultTipAmountUsd: '1.00',
	defaultDislikeAmountUsd: '1.00',
	defaultCollectPriceUsd: '5.00',
	minActionValueUsd: '0.05',
	// Price cache duration in seconds (5 minutes)
	priceCacheDuration: 300,
	// Fallback ETH price in USD (used when price feed unavailable)
	fallbackEthPriceUsd: 3000
};

// Environment-based defaults (build-time values from .env)
export const envDefaults = {
	blogHubContractAddress: PUBLIC_BLOG_HUB_CONTRACT_ADDRESS || defaults.blogHubContractAddress,
	sessionKeyManagerAddress: PUBLIC_SESSION_KEY_MANAGER_ADDRESS || defaults.sessionKeyManagerAddress,
	rpcUrl: PUBLIC_RPC_URL || defaults.rpcUrl,
	chainId: PUBLIC_CHAIN_ID ? parseInt(PUBLIC_CHAIN_ID, 10) : defaults.chainId,
	irysNetwork: (PUBLIC_IRYS_NETWORK || defaults.irysNetwork) as 'mainnet' | 'devnet',
	arweaveGateways: PUBLIC_ARWEAVE_GATEWAYS
		? PUBLIC_ARWEAVE_GATEWAYS.split(',').map((g: string) => g.trim())
		: defaults.arweaveGateways,
	subsquidEndpoint: PUBLIC_SUBSQUID_ENDPOINT || defaults.subsquidEndpoint,
	minGasFeeMultiplier: PUBLIC_MIN_GAS_FEE_MULTIPLIER
		? parseInt(PUBLIC_MIN_GAS_FEE_MULTIPLIER, 10)
		: defaults.minGasFeeMultiplier,
	defaultGasFeeMultiplier: PUBLIC_DEFAULT_GAS_FEE_MULTIPLIER
		? parseInt(PUBLIC_DEFAULT_GAS_FEE_MULTIPLIER, 10)
		: defaults.defaultGasFeeMultiplier,
	irysFreeUploadLimit: defaults.irysFreeUploadLimit,
	minActionValue: defaults.minActionValue,
	// USD pricing defaults
	defaultTipAmountUsd: defaults.defaultTipAmountUsd,
	defaultDislikeAmountUsd: defaults.defaultDislikeAmountUsd,
	defaultCollectPriceUsd: defaults.defaultCollectPriceUsd,
	minActionValueUsd: defaults.minActionValueUsd,
	priceCacheDuration: defaults.priceCacheDuration,
	fallbackEthPriceUsd: defaults.fallbackEthPriceUsd
};

// User-overridable config keys
// NOT overridable: minGasFeeMultiplier, irysFreeUploadLimit, minActionValue
export type UserConfigKey =
	| 'blogHubContractAddress'
	| 'sessionKeyManagerAddress'
	| 'rpcUrl'
	| 'chainId'
	| 'irysNetwork'
	| 'arweaveGateways'
	| 'subsquidEndpoint'
	| 'defaultGasFeeMultiplier'
	| 'defaultTipAmountUsd'
	| 'defaultDislikeAmountUsd'
	| 'defaultCollectPriceUsd'
	| 'minActionValueUsd';

export interface UserConfig {
	blogHubContractAddress?: string;
	sessionKeyManagerAddress?: string;
	rpcUrl?: string;
	chainId?: number;
	irysNetwork?: 'mainnet' | 'devnet';
	arweaveGateways?: string[];
	subsquidEndpoint?: string;
	defaultGasFeeMultiplier?: number;
	defaultTipAmountUsd?: string;
	defaultDislikeAmountUsd?: string;
	defaultCollectPriceUsd?: string;
	minActionValueUsd?: string;
}

// Config field metadata for settings UI
export interface ConfigFieldMeta {
	key: UserConfigKey;
	labelKey: string;
	type: 'text' | 'number' | 'select' | 'array';
	options?: { value: string; labelKey: string }[];
	placeholder?: string;
	description?: string;
}

// Minimum value for defaultGasFeeMultiplier
export const MIN_DEFAULT_GAS_FEE_MULTIPLIER = 10;

export const configFields: ConfigFieldMeta[] = [
	{
		key: 'rpcUrl',
		labelKey: 'rpc_url',
		type: 'text',
		placeholder: 'https://...'
	},
	{
		key: 'chainId',
		labelKey: 'chain_id',
		type: 'number',
		placeholder: '31337'
	},
	{
		key: 'blogHubContractAddress',
		labelKey: 'blog_hub_address',
		type: 'text',
		placeholder: '0x...'
	},
	{
		key: 'sessionKeyManagerAddress',
		labelKey: 'session_manager_address',
		type: 'text',
		placeholder: '0x...'
	},
	{
		key: 'subsquidEndpoint',
		labelKey: 'subsquid_endpoint',
		type: 'text',
		placeholder: 'https://...'
	},
	{
		key: 'irysNetwork',
		labelKey: 'irys_network',
		type: 'select',
		options: [
			{ value: 'mainnet', labelKey: 'mainnet' },
			{ value: 'devnet', labelKey: 'devnet' }
		]
	},
	{
		key: 'arweaveGateways',
		labelKey: 'arweave_gateways',
		type: 'array',
		placeholder: 'https://gateway.irys.xyz'
	},
	{
		key: 'defaultGasFeeMultiplier',
		labelKey: 'gas_multiplier',
		type: 'number',
		placeholder: '30'
	},
	{
		key: 'defaultTipAmountUsd',
		labelKey: 'default_tip_usd',
		type: 'text',
		placeholder: '1.00'
	},
	{
		key: 'defaultDislikeAmountUsd',
		labelKey: 'default_dislike_usd',
		type: 'text',
		placeholder: '1.00'
	},
	{
		key: 'defaultCollectPriceUsd',
		labelKey: 'default_collect_price_usd',
		type: 'text',
		placeholder: '5.00'
	},
	{
		key: 'minActionValueUsd',
		labelKey: 'min_action_value_usd',
		type: 'text',
		placeholder: '0.05'
	}
];

// Load user config from localStorage
function loadUserConfig(): UserConfig {
	if (!browser) return {};
	try {
		const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (e) {
		console.warn('Failed to load user config from localStorage:', e);
	}
	return {};
}

// Save user config to localStorage
function saveUserConfig(config: UserConfig): void {
	if (!browser) return;
	try {
		localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
	} catch (e) {
		console.warn('Failed to save user config to localStorage:', e);
	}
}

// Reactive state using Svelte 5 runes
let userConfig = $state<UserConfig>(loadUserConfig());

// Merged config (user overrides + env defaults)
export function getConfig() {
	return {
		// Overridable
		blogHubContractAddress: (userConfig.blogHubContractAddress || envDefaults.blogHubContractAddress) as `0x${string}`,
		sessionKeyManagerAddress: (userConfig.sessionKeyManagerAddress || envDefaults.sessionKeyManagerAddress) as `0x${string}`,
		rpcUrl: userConfig.rpcUrl || envDefaults.rpcUrl,
		chainId: userConfig.chainId ?? envDefaults.chainId,
		irysNetwork: userConfig.irysNetwork || envDefaults.irysNetwork,
		arweaveGateways: userConfig.arweaveGateways || envDefaults.arweaveGateways,
		subsquidEndpoint: userConfig.subsquidEndpoint || envDefaults.subsquidEndpoint,
		defaultGasFeeMultiplier: userConfig.defaultGasFeeMultiplier ?? envDefaults.defaultGasFeeMultiplier,
		// USD pricing (user-overridable)
		defaultTipAmountUsd: userConfig.defaultTipAmountUsd || envDefaults.defaultTipAmountUsd,
		defaultDislikeAmountUsd: userConfig.defaultDislikeAmountUsd || envDefaults.defaultDislikeAmountUsd,
		defaultCollectPriceUsd: userConfig.defaultCollectPriceUsd || envDefaults.defaultCollectPriceUsd,
		minActionValueUsd: userConfig.minActionValueUsd || envDefaults.minActionValueUsd,
		// Fixed values (not user-overridable)
		minGasFeeMultiplier: envDefaults.minGasFeeMultiplier,
		irysFreeUploadLimit: envDefaults.irysFreeUploadLimit,
		minActionValue: BigInt(envDefaults.minActionValue),
		priceCacheDuration: envDefaults.priceCacheDuration,
		fallbackEthPriceUsd: envDefaults.fallbackEthPriceUsd
	};
}

// Get Pyth contract address for current chain
export function getPythContractAddress(): `0x${string}` {
	const chainId = getConfig().chainId;
	return PYTH_CONTRACT_ADDRESSES[chainId] || '0x0000000000000000000000000000000000000000';
}

// Get Pyth Price Feed ID for current chain's native token
export function getPythPriceFeedId(): `0x${string}` {
	const chainId = getConfig().chainId;
	const tokenSymbol = CHAIN_NATIVE_TOKEN[chainId] || 'ETH';
	return PYTH_PRICE_FEED_IDS[tokenSymbol] || PYTH_PRICE_FEED_IDS['ETH'];
}

// Get current user overrides
export function getUserConfig(): UserConfig {
	return { ...userConfig };
}

// Update a single config value
export function setConfigValue<K extends UserConfigKey>(key: K, value: UserConfig[K]): void {
	userConfig = { ...userConfig, [key]: value };
	saveUserConfig(userConfig);
}

// Update multiple config values
export function updateConfig(updates: Partial<UserConfig>): void {
	userConfig = { ...userConfig, ...updates };
	saveUserConfig(userConfig);
}

// Reset a single config value to env default
export function resetConfigValue(key: UserConfigKey): void {
	const { [key]: _, ...rest } = userConfig;
	userConfig = rest;
	saveUserConfig(userConfig);
}

// Reset all user config to env defaults
export function resetAllConfig(): void {
	userConfig = {};
	saveUserConfig(userConfig);
}

// Check if a config value is overridden by user
export function isConfigOverridden(key: UserConfigKey): boolean {
	return key in userConfig && userConfig[key] !== undefined;
}

// Get env default value for a key
export function getEnvDefault<K extends UserConfigKey>(key: K): typeof envDefaults[K] {
	return envDefaults[key];
}

// Initialize store (call this on app load if needed)
export function initConfigStore(): void {
	if (browser) {
		userConfig = loadUserConfig();
	}
}
