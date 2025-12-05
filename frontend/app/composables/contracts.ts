/**
 * Smart contract interaction utilities
 * Handles publishing articles to BlogHub contract
 */

import { createWalletClient, custom } from 'viem'
import { optimismSepolia } from 'viem/chains'

// BlogHub contract ABI (minimal for publish function)
const BLOGHUB_ABI = [
	{
		name: 'publish',
		type: 'function',
		inputs: [
			{ name: '_arweaveId', type: 'string' },
			{ name: '_categoryId', type: 'uint64' },
			{ name: '_royaltyBps', type: 'uint96' },
			{ name: '_originalAuthor', type: 'string' },
			{ name: '_title', type: 'string' },
			{ name: '_coverImage', type: 'string' }
		],
		outputs: [{ type: 'uint256' }],
		stateMutability: 'nonpayable'
	}
] as const

// BlogHub contract address (Optimism Sepolia testnet)
const BLOGHUB_CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as `0x${string}`

/**
 * Get Ethereum account from wallet
 */
async function getEthereumAccount(): Promise<`0x${string}`> {
	if (typeof window === 'undefined' || !window.ethereum) {
		throw new Error('Ethereum provider not found. Please install MetaMask or another wallet.')
	}
	const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as `0x${string}`[]
	const account = accounts?.[0]
	if (!account) {
		throw new Error('No accounts found. Please connect your wallet.')
	}
	return account
}

/**
 * Ensure wallet is connected to the correct chain, switch if necessary
 */
async function ensureCorrectChain(): Promise<void> {
	if (typeof window === 'undefined' || !window.ethereum) {
		throw new Error('Ethereum provider not found. Please install MetaMask or another wallet.')
	}

	const targetChainId = optimismSepolia.id
	const targetChainIdHex = `0x${targetChainId.toString(16)}`

	try {
		// Get current chain ID
		const currentChainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
		const currentChainId = parseInt(currentChainIdHex, 16)

		if (currentChainId === targetChainId) {
			return // Already on correct chain
		}

		console.log(`Switching from chain ${currentChainId} to ${targetChainId} (${optimismSepolia.name})`)

		// Try to switch to the target chain
		try {
			await window.ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: targetChainIdHex }]
			})
		} catch (switchError: unknown) {
			// Chain not added to wallet, try to add it
			if ((switchError as { code?: number })?.code === 4902) {
				await window.ethereum.request({
					method: 'wallet_addEthereumChain',
					params: [
						{
							chainId: targetChainIdHex,
							chainName: optimismSepolia.name,
							nativeCurrency: optimismSepolia.nativeCurrency,
							rpcUrls: [optimismSepolia.rpcUrls.default.http[0]],
							blockExplorerUrls: [optimismSepolia.blockExplorers?.default.url]
						}
					]
				})
			} else {
				throw switchError
			}
		}
	} catch (error) {
		throw new Error(
			`Failed to switch to ${optimismSepolia.name}: ${error instanceof Error ? error.message : 'User rejected or unknown error'}`
		)
	}
}

/**
 * Get wallet client for contract interaction
 */
async function getWalletClient() {
	if (typeof window === 'undefined' || !window.ethereum) {
		throw new Error('Ethereum provider not found. Please install MetaMask or another wallet.')
	}

	// Ensure we're on the correct chain before creating client
	await ensureCorrectChain()

	const account = await getEthereumAccount()

	return createWalletClient({
		account,
		chain: optimismSepolia,
		transport: custom(window.ethereum)
	})
}

/**
 * Publish article to BlogHub contract
 * @param arweaveId - Arweave hash of article content
 * @param categoryId - Category ID (0-based)
 * @param royaltyBps - Royalty basis points (0-10000, where 100 = 1%)
 * @param originalAuthor - Original author name (optional, for repost scenarios)
 * @param title - Article title (max 128 bytes)
 * @param coverImage - Cover image Arweave hash (optional, max 64 bytes)
 * @returns Transaction hash
 */
export async function publishToContract(
	arweaveId: string,
	categoryId: bigint,
	royaltyBps: bigint,
	originalAuthor: string = '',
	title: string = '',
	coverImage: string = ''
): Promise<string> {
	if (!arweaveId) {
		throw new Error('Arweave ID is required')
	}

	if (categoryId < 0n) {
		throw new Error('Category ID must be non-negative')
	}

	if (royaltyBps > 10000n) {
		throw new Error('Royalty percentage cannot exceed 100% (10000 basis points)')
	}

	if (originalAuthor && originalAuthor.length > 64) {
		throw new Error('Original author name is too long (max 64 characters)')
	}

	if (title && new TextEncoder().encode(title).length > 128) {
		throw new Error('Title is too long (max 128 bytes)')
	}

	if (coverImage && coverImage.length > 64) {
		throw new Error('Cover image hash is too long (max 64 characters)')
	}

	try {
		const walletClient = await getWalletClient()

		// Call publish function
		const txHash = await walletClient.writeContract({
			address: BLOGHUB_CONTRACT_ADDRESS,
			abi: BLOGHUB_ABI,
			functionName: 'publish',
			args: [arweaveId, categoryId, royaltyBps, originalAuthor, title, coverImage]
		})

		console.log(`Article published to contract. Tx: ${txHash}`)
		return txHash
	} catch (error) {
		console.error('Error publishing to contract:', error)
		throw new Error(
			`Failed to publish to contract: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}