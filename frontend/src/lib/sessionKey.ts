/**
 * Session Key management for seamless interactions
 * Allows users to perform frequent operations without signing each time
 */

import { formatEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getBlogHubContractAddress, getSessionKeyManagerAddress, getMinGasFeeMultiplier, getDefaultGasFeeMultiplier } from '$lib/config';
import { getEthereumAccount, getWalletClient, getPublicClient } from '$lib/wallet';
import { browser } from '$app/environment';
import { getIrysUploaderDevnet, getIrysUploader, type IrysUploader } from '$lib/arweave/irys';
import { getIrysNetwork } from '$lib/config';

const SESSION_KEY_STORAGE = 'amberink_session_key';

/**
 * Stored session key data structure
 */
export interface StoredSessionKey {
	address: string;
	privateKey: string;
	owner: string;
	validUntil: number;
}

// SessionKeyManager contract ABI (minimal)
const SESSION_KEY_MANAGER_ABI = [
	{
		name: 'registerSessionKey',
		type: 'function',
		inputs: [
			{ name: '_sessionKey', type: 'address' },
			{ name: '_validAfter', type: 'uint48' },
			{ name: '_validUntil', type: 'uint48' },
			{ name: '_target', type: 'address' },
			{ name: '_allowedSelectors', type: 'bytes4[]' },
			{ name: '_spendingLimit', type: 'uint256' }
		],
		outputs: [],
		stateMutability: 'nonpayable'
	},
	{
		name: 'revokeSessionKey',
		type: 'function',
		inputs: [{ name: '_sessionKey', type: 'address' }],
		outputs: [],
		stateMutability: 'nonpayable'
	},
	{
		name: 'getSessionKeyData',
		type: 'function',
		inputs: [
			{ name: 'owner', type: 'address' },
			{ name: 'sessionKey', type: 'address' }
		],
		outputs: [
			{
				name: '',
				type: 'tuple',
				components: [
					{ name: 'sessionKey', type: 'address' },
					{ name: 'validAfter', type: 'uint48' },
					{ name: 'validUntil', type: 'uint48' },
					{ name: 'allowedContract', type: 'address' },
					{ name: 'allowedSelectors', type: 'bytes4[]' },
					{ name: 'spendingLimit', type: 'uint256' },
					{ name: 'spentAmount', type: 'uint256' },
					{ name: 'nonce', type: 'uint256' }
				]
			}
		],
		stateMutability: 'view'
	}
] as const;

const PUBLISH_SELECTOR = '0x21a25d60' as const;

// Allowed function selectors for session key
// Use: cast sig "functionName(params)" to get selector
const ALLOWED_SELECTORS: `0x${string}`[] = [
	'0xff1f090a', // evaluate(uint256,uint8,string,address,uint256)
	'0xdffd40f2', // likeComment(uint256,uint256,address,address)
	'0x63c3cc16', // follow(address,bool)
	'0x21a25d60', // publish((string,uint16,uint96,string,string,string,address,uint96,uint32,uint8)) - PublishParams struct
	'0x8d3c100a', // collect(uint256,address)
	'0xaacf0da4'  // editArticle(uint256,string,string,uint64,uint8)
];

// Default spending limit (10 ETH)
const DEFAULT_SPENDING_LIMIT = BigInt('10000000000000000000');

// Session key validity duration (7 days in seconds)
const SESSION_KEY_DURATION = 7 * 24 * 60 * 60;

// Estimated gas for a typical transaction (used for calculating minimum balance)
const ESTIMATED_GAS_UNITS = 200000n;


/** Calculate gas-based amount: gasPrice * estimatedGas * multiplier */
async function calculateGasAmount(multiplier: number): Promise<bigint> {
	const gasPrice = await getPublicClient().getGasPrice();
	return gasPrice * ESTIMATED_GAS_UNITS * BigInt(multiplier);
}

/**
 * Get session key balance
 * @param address - Session key address
 * @returns Balance in wei
 */
export async function getSessionKeyBalance(address: string): Promise<bigint> {
	const publicClient = getPublicClient();
	return await publicClient.getBalance({ address: address as `0x${string}` });
}

/**
 * Check if session key has sufficient balance
 * @param address - Session key address
 * @returns true if balance is sufficient
 */
export async function hasSessionKeySufficientBalance(address: string): Promise<boolean> {
	const [balance, minBalance] = await Promise.all([
		getSessionKeyBalance(address),
		calculateGasAmount(getMinGasFeeMultiplier())
	]);
	return balance >= minBalance;
}

/**
 * Fund session key with ETH from main wallet
 * @param sessionKeyAddress - Session key address to fund
 * @param amount - Amount to send (optional, calculated based on gas price if not provided)
 * @returns Transaction hash
 */
export async function fundSessionKey(
	sessionKeyAddress: string,
	amount?: bigint
): Promise<string> {
	const walletClient = await getWalletClient();
	const minBalance = await calculateGasAmount(getMinGasFeeMultiplier());
	const fundAmount = amount ?? await calculateGasAmount(getDefaultGasFeeMultiplier());
	const actualAmount = fundAmount >= minBalance ? fundAmount : minBalance;
	
	console.log(`Funding session key with ${formatEther(actualAmount)} ETH (min: ${formatEther(minBalance)} ETH)`);
	
	const txHash = await walletClient.sendTransaction({
		to: sessionKeyAddress as `0x${string}`,
		value: actualAmount
	});
	
	// Wait for transaction confirmation
	const publicClient = getPublicClient();
	await publicClient.waitForTransactionReceipt({ hash: txHash });
	
	console.log(`Funded session key ${sessionKeyAddress} with ${formatEther(actualAmount)} ETH. Tx: ${txHash}`);
	return txHash;
}

/**
 * Ensure session key has sufficient balance, fund if necessary
 * @param sessionKeyAddress - Session key address
 * @returns true if balance is now sufficient
 */
export async function ensureSessionKeyBalance(sessionKeyAddress: string): Promise<boolean> {
	const [balance, minBalance] = await Promise.all([
		getSessionKeyBalance(sessionKeyAddress),
		calculateGasAmount(getMinGasFeeMultiplier())
	]);
	
	if (balance >= minBalance) {
		console.log(`Session key balance sufficient: ${formatEther(balance)} ETH`);
		return true;
	}
	
	console.log(`Session key balance low (${formatEther(balance)} ETH), funding...`);
	try {
		await fundSessionKey(sessionKeyAddress);
		return true;
	} catch (error) {
		console.error('Failed to fund session key:', error);
		return false;
	}
}

/**
 * Check if there is a valid session key stored
 * @returns Stored session key data or null if not found/expired
 */
export function getStoredSessionKey(): StoredSessionKey | null {
	if (!browser) return null;

	const stored = localStorage.getItem(SESSION_KEY_STORAGE);
	if (!stored) return null;

	try {
		const data: StoredSessionKey = JSON.parse(stored);

		// Check if expired
		if (Date.now() / 1000 > data.validUntil) {
			localStorage.removeItem(SESSION_KEY_STORAGE);
			return null;
		}

		return data;
	} catch {
		localStorage.removeItem(SESSION_KEY_STORAGE);
		return null;
	}
}

/**
 * Check if stored session key belongs to current wallet
 * @returns true if session key is valid for current wallet
 */
export async function isSessionKeyValidForCurrentWallet(): Promise<boolean> {
	const sessionKey = getStoredSessionKey();
	if (!sessionKey) return false;

	try {
		const account = await getEthereumAccount();
		return account.toLowerCase() === sessionKey.owner.toLowerCase();
	} catch {
		return false;
	}
}

/**
 * Create Irys Balance Approval for Session Key
 * This allows the Session Key to upload to Irys using the main account's balance
 * @param uploader - Irys uploader instance (connected with main account)
 * @param sessionKeyAddress - Session Key address to approve
 * @param expiresInSeconds - Approval expiration time in seconds (default: 7 days)
 */
async function createIrysBalanceApproval(
	uploader: IrysUploader,
	sessionKeyAddress: string,
	expiresInSeconds: number = SESSION_KEY_DURATION
): Promise<void> {
	try {
		// Create a large approval amount (1 ETH worth in atomic units)
		// This should be enough for many uploads
		const approvalAmount = uploader.utils.toAtomic(1);
		
		console.log(`Creating Irys Balance Approval for ${sessionKeyAddress}...`);
		const receipt = await uploader.approval.createApproval({
			amount: approvalAmount,
			approvedAddress: sessionKeyAddress,
			expiresInSeconds
		});
		console.log(`Irys Balance Approval created:`, receipt);
	} catch (error) {
		console.error('Failed to create Irys Balance Approval:', error);
		// Don't throw - this is not critical for session key creation
		// The user can still fund the session key directly if needed
	}
}

/**
 * Generate and register a new session key
 * NOTE: This only registers the session key on-chain and saves to localStorage.
 * Irys approval and ETH funding are done lazily when needed to minimize MetaMask popups.
 * @param options - Optional configuration
 * @param options.skipFunding - If true, skip initial ETH funding (default: true for lazy funding)
 * @param options.skipIrysApproval - If true, skip Irys balance approval (default: true for lazy approval)
 * @returns Created session key data
 */
export async function createSessionKey(options?: {
	skipFunding?: boolean;
	skipIrysApproval?: boolean;
}): Promise<StoredSessionKey> {
	const { skipFunding = true, skipIrysApproval = true } = options ?? {};
	
	const account = await getEthereumAccount();
	const sessionKeyManager = getSessionKeyManagerAddress();
	const blogHub = getBlogHubContractAddress();

	// 1. Generate temporary key pair using viem
	const privateKey = generatePrivateKey();
	const sessionKeyAccount = privateKeyToAccount(privateKey);

	// 2. Set validity period (use chain timestamp to avoid local/chain time drift)
	const publicClient = getPublicClient();
	const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
	const validAfter = Number(latestBlock.timestamp);
	const validUntil = validAfter + SESSION_KEY_DURATION;

	// 3. Get wallet client and register session key on blockchain (ONE MetaMask popup)
	const walletClient = await getWalletClient();

	const txHash = await walletClient.writeContract({
		address: sessionKeyManager,
		abi: SESSION_KEY_MANAGER_ABI,
		functionName: 'registerSessionKey',
		args: [
			sessionKeyAccount.address,
			validAfter,
			validUntil,
			blogHub,
			ALLOWED_SELECTORS,
			DEFAULT_SPENDING_LIMIT
		]
	});
	await publicClient.waitForTransactionReceipt({ hash: txHash });

	// 4. Save to localStorage immediately after registration
	const sessionKeyData: StoredSessionKey = {
		address: sessionKeyAccount.address,
		privateKey: privateKey,
		owner: account,
		validUntil
	};
	localStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(sessionKeyData));
	console.log(`Session key created and registered: ${sessionKeyAccount.address}`);

	// 5. Optionally create Irys Balance Approval (lazy by default)
	if (!skipIrysApproval) {
		await ensureIrysApproval(sessionKeyData);
	}

	// 6. Optionally fund session key (lazy by default)
	if (!skipFunding) {
		await ensureSessionKeyBalance(sessionKeyAccount.address);
	}

	return sessionKeyData;
}

/**
 * Revoke the current session key
 */
export async function revokeSessionKey(): Promise<void> {
	const sessionKey = getStoredSessionKey();
	if (!sessionKey) return;

	const sessionKeyManager = getSessionKeyManagerAddress();
	const walletClient = await getWalletClient();

	await walletClient.writeContract({
		address: sessionKeyManager,
		abi: SESSION_KEY_MANAGER_ABI,
		functionName: 'revokeSessionKey',
		args: [sessionKey.address as `0x${string}`]
	});

	localStorage.removeItem(SESSION_KEY_STORAGE);
}

/**
 * Clear session key from local storage without revoking on-chain
 * Use when switching wallets or cleaning up
 */
export function clearLocalSessionKey(): void {
	if (browser) {
		localStorage.removeItem(SESSION_KEY_STORAGE);
	}
}

/**
 * Get session key account for signing
 * @returns Account instance or null if no valid session key
 */
export function getSessionKeyAccount() {
	const sessionKey = getStoredSessionKey();
	if (!sessionKey) return null;
	return privateKeyToAccount(sessionKey.privateKey as `0x${string}`);
}

/**
 * Check if session key is valid on-chain (registered, not expired, has required selectors)
 * @param sessionKey - Session key to validate
 * @param requiredSelector - Optional specific selector to check for (e.g., PUBLISH_SELECTOR '0x21a25d60')
 * @returns true if session key is valid on-chain
 */
export async function isSessionKeyValidOnChain(
	sessionKey: StoredSessionKey,
	requiredSelector?: `0x${string}`
): Promise<boolean> {
	try {
		const publicClient = getPublicClient();
		const sessionKeyManager = getSessionKeyManagerAddress();
		const blogHub = getBlogHubContractAddress();

		const [data, latestBlock] = await Promise.all([
			publicClient.readContract({
				address: sessionKeyManager,
				abi: SESSION_KEY_MANAGER_ABI,
				functionName: 'getSessionKeyData',
				args: [sessionKey.owner as `0x${string}`, sessionKey.address as `0x${string}`]
			}),
			publicClient.getBlock({ blockTag: 'latest' })
		]);

		// Check if registered
		if ((data.sessionKey as string).toLowerCase() === '0x0000000000000000000000000000000000000000') return false;
		// Check target contract
		if ((data.allowedContract as string).toLowerCase() !== blogHub.toLowerCase()) return false;

		// Check required selector if specified
		if (requiredSelector) {
			const selectors = (data.allowedSelectors as readonly string[]).map((s) => s.toLowerCase());
			if (!selectors.includes(requiredSelector.toLowerCase())) return false;
		}

		// Check time validity
		const now = Number(latestBlock.timestamp);
		if (now < Number(data.validAfter)) return false;
		if (now > Number(data.validUntil)) return false;

		return true;
	} catch {
		return false;
	}
}

/**
 * Get or create a valid session key for the current wallet.
 * This is the unified entry point for all session key operations.
 * Only triggers MetaMask popup if no valid session key exists.
 * 
 * @param options - Optional configuration
 * @param options.requiredSelector - Specific function selector that must be authorized
 * @param options.autoCreate - If true, automatically create new session key if needed (default: true)
 * @returns Valid session key or null if autoCreate is false and no valid key exists
 */
export async function getOrCreateValidSessionKey(options?: {
	requiredSelector?: `0x${string}`;
	autoCreate?: boolean;
}): Promise<StoredSessionKey | null> {
	const { requiredSelector, autoCreate = true } = options ?? {};
	
	// 1. Check if we have a stored session key
	let sessionKey = getStoredSessionKey();
	
	if (sessionKey) {
		// 2. Verify it belongs to current wallet
		const isOwnerValid = await isSessionKeyValidForCurrentWallet();
		if (!isOwnerValid) {
			console.log('Stored session key belongs to different wallet, clearing...');
			clearLocalSessionKey();
			sessionKey = null;
		} else {
			// 3. Verify it's valid on-chain
			const isOnChainValid = await isSessionKeyValidOnChain(sessionKey, requiredSelector);
			if (!isOnChainValid) {
				console.log('Stored session key is invalid or missing required selector, clearing...');
				clearLocalSessionKey();
				sessionKey = null;
			} else {
				console.log('Using existing valid session key:', sessionKey.address);
				return sessionKey;
			}
		}
	}
	
	// 4. No valid session key - create new one if autoCreate is enabled
	if (!autoCreate) {
		return null;
	}
	
	console.log('Creating new session key (requires MetaMask signature)...');
	sessionKey = await createSessionKey();
	console.log(`New session key created: ${sessionKey.address}`);
	
	return sessionKey;
}

/**
 * Ensure session key is ready for use: valid and has sufficient balance.
 * This is the unified function to call before any session key operation.
 * Minimizes MetaMask popups by:
 * - Only creating session key if needed (one popup for registration)
 * - Only funding if balance is insufficient (one popup for transfer)
 * 
 * @param options - Optional configuration
 * @param options.requiredSelector - Specific function selector that must be authorized
 * @returns Ready session key, or null if user rejected or operation failed
 */
export async function ensureSessionKeyReady(options?: {
	requiredSelector?: `0x${string}`;
}): Promise<StoredSessionKey | null> {
	try {
		// 1. Get or create valid session key
		const sessionKey = await getOrCreateValidSessionKey(options);
		if (!sessionKey) {
			return null;
		}
		
		// 2. Ensure sufficient balance (may trigger MetaMask for funding)
		const hasBalance = await ensureSessionKeyBalance(sessionKey.address);
		if (!hasBalance) {
			console.log('User rejected session key funding');
			return null;
		}
		
		return sessionKey;
	} catch (error) {
		console.error('Failed to ensure session key ready:', error);
		return null;
	}
}

/** Get Irys uploader based on network config */
async function getIrysUploaderByNetwork(): Promise<IrysUploader> {
	return getIrysNetwork() === 'mainnet' ? getIrysUploader() : getIrysUploaderDevnet();
}

/**
 * Ensure Irys balance approval exists for session key.
 * Call this lazily before Arweave uploads.
 */
export async function ensureIrysApproval(sessionKey: StoredSessionKey): Promise<void> {
	try {
		const uploader = await getIrysUploaderByNetwork();
		await createIrysBalanceApproval(uploader, sessionKey.address, SESSION_KEY_DURATION);
	} catch (error) {
		console.warn('Failed to create Irys Balance Approval:', error);
	}
}
