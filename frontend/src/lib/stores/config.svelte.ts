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
	PUBLIC_APP_NAME,
	PUBLIC_APP_VERSION,
	PUBLIC_ARWEAVE_GATEWAYS,
	PUBLIC_SUBSQUID_ENDPOINT
} from '$env/static/public';

import * as publicEnv from '$env/static/public';
const PUBLIC_MIN_GAS_FEE_MULTIPLIER = (publicEnv as Record<string, string>)['PUBLIC_MIN_GAS_FEE_MULTIPLIER'] || '';
const PUBLIC_DEFAULT_GAS_FEE_MULTIPLIER = (publicEnv as Record<string, string>)['PUBLIC_DEFAULT_GAS_FEE_MULTIPLIER'] || '';

const CONFIG_STORAGE_KEY = 'dblog_user_config';

// Default values (used when env vars are not set)
export const defaults = {
	blogHubContractAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
	sessionKeyManagerAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
	rpcUrl: 'http://localhost:8545',
	chainId: 31337,
	irysNetwork: 'devnet' as const,
	appName: 'DBlog',
	appVersion: '1.0.0',
	arweaveGateways: ['https://gateway.irys.xyz', 'https://arweave.net', 'https://arweave.dev'],
	subsquidEndpoint: 'http://localhost:4350/graphql',
	minGasFeeMultiplier: 10,
	defaultGasFeeMultiplier: 30,
	irysFreeUploadLimit: 102400,
	minActionValue: '20000000000000' // Store as string for JSON serialization
};

// Environment-based defaults (build-time values from .env)
export const envDefaults = {
	blogHubContractAddress: PUBLIC_BLOG_HUB_CONTRACT_ADDRESS || defaults.blogHubContractAddress,
	sessionKeyManagerAddress: PUBLIC_SESSION_KEY_MANAGER_ADDRESS || defaults.sessionKeyManagerAddress,
	rpcUrl: PUBLIC_RPC_URL || defaults.rpcUrl,
	chainId: PUBLIC_CHAIN_ID ? parseInt(PUBLIC_CHAIN_ID, 10) : defaults.chainId,
	irysNetwork: (PUBLIC_IRYS_NETWORK || defaults.irysNetwork) as 'mainnet' | 'devnet',
	appName: PUBLIC_APP_NAME || defaults.appName,
	appVersion: PUBLIC_APP_VERSION || defaults.appVersion,
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
	minActionValue: defaults.minActionValue
};

// User-overridable config keys
// NOT overridable: appName, appVersion, minGasFeeMultiplier, irysFreeUploadLimit, minActionValue
export type UserConfigKey = 
	| 'blogHubContractAddress'
	| 'sessionKeyManagerAddress'
	| 'rpcUrl'
	| 'chainId'
	| 'irysNetwork'
	| 'arweaveGateways'
	| 'subsquidEndpoint'
	| 'defaultGasFeeMultiplier';

export interface UserConfig {
	blogHubContractAddress?: string;
	sessionKeyManagerAddress?: string;
	rpcUrl?: string;
	chainId?: number;
	irysNetwork?: 'mainnet' | 'devnet';
	arweaveGateways?: string[];
	subsquidEndpoint?: string;
	defaultGasFeeMultiplier?: number;
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
		labelKey: 'settings_rpc_url',
		type: 'text',
		placeholder: 'https://...'
	},
	{
		key: 'chainId',
		labelKey: 'settings_chain_id',
		type: 'number',
		placeholder: '31337'
	},
	{
		key: 'blogHubContractAddress',
		labelKey: 'settings_blog_hub_address',
		type: 'text',
		placeholder: '0x...'
	},
	{
		key: 'sessionKeyManagerAddress',
		labelKey: 'settings_session_key_manager_address',
		type: 'text',
		placeholder: '0x...'
	},
	{
		key: 'subsquidEndpoint',
		labelKey: 'settings_subsquid_endpoint',
		type: 'text',
		placeholder: 'https://...'
	},
	{
		key: 'irysNetwork',
		labelKey: 'settings_irys_network',
		type: 'select',
		options: [
			{ value: 'mainnet', labelKey: 'mainnet' },
			{ value: 'devnet', labelKey: 'devnet' }
		]
	},
	{
		key: 'arweaveGateways',
		labelKey: 'settings_arweave_gateways',
		type: 'array',
		placeholder: 'https://gateway.irys.xyz'
	},
	{
		key: 'defaultGasFeeMultiplier',
		labelKey: 'settings_default_gas_multiplier',
		type: 'number',
		placeholder: '30'
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
		// Non-overridable (always from env)
		appName: envDefaults.appName,
		appVersion: envDefaults.appVersion,
		// Overridable
		blogHubContractAddress: (userConfig.blogHubContractAddress || envDefaults.blogHubContractAddress) as `0x${string}`,
		sessionKeyManagerAddress: (userConfig.sessionKeyManagerAddress || envDefaults.sessionKeyManagerAddress) as `0x${string}`,
		rpcUrl: userConfig.rpcUrl || envDefaults.rpcUrl,
		chainId: userConfig.chainId ?? envDefaults.chainId,
		irysNetwork: userConfig.irysNetwork || envDefaults.irysNetwork,
		arweaveGateways: userConfig.arweaveGateways || envDefaults.arweaveGateways,
		subsquidEndpoint: userConfig.subsquidEndpoint || envDefaults.subsquidEndpoint,
		defaultGasFeeMultiplier: userConfig.defaultGasFeeMultiplier ?? envDefaults.defaultGasFeeMultiplier,
		// Fixed values (not user-overridable)
		minGasFeeMultiplier: envDefaults.minGasFeeMultiplier,
		irysFreeUploadLimit: envDefaults.irysFreeUploadLimit,
		minActionValue: BigInt(envDefaults.minActionValue)
	};
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
