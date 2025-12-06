<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as m from '$lib/paraglide/messages';

	const DISCONNECTED_KEY = 'wallet_disconnected';

	let address = $state<string | undefined>();
	let isConnected = $state(false);
	let isLoading = $state(false);
	let showDropdown = $state(false);

	let displayAddress = $derived(
		address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
	);

	function handleAccountsChanged(accounts: unknown) {
		const accts = accounts as string[];
		if (accts.length === 0) {
			address = undefined;
			isConnected = false;
		} else if (isConnected) {
			// Only update address if already connected (user switched accounts in wallet)
			address = accts[0];
		}
		// If not connected, ignore account changes (user explicitly disconnected)
	}

	function handleChainChanged() {
		// Reload on chain change to ensure correct state
		window.location.reload();
	}

	async function checkConnection() {
		if (typeof window === 'undefined' || !window.ethereum) return;

		// If user explicitly disconnected, don't auto-connect
		if (localStorage.getItem(DISCONNECTED_KEY) === 'true') {
			return;
		}

		try {
			const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[];
			if (accounts.length > 0) {
				address = accounts[0];
				isConnected = true;
			}
		} catch (error) {
			console.error('Failed to check connection:', error);
		}
	}

	async function handleConnect() {
		if (typeof window === 'undefined' || !window.ethereum) {
			alert('Please install MetaMask or another Ethereum wallet');
			return;
		}

		isLoading = true;
		try {
			// Use wallet_requestPermissions to force account picker popup
			// This ensures user can select their currently active MetaMask account
			await window.ethereum.request({
				method: 'wallet_requestPermissions',
				params: [{ eth_accounts: {} }]
			});

			// After permission granted, get the selected accounts
			const accounts = (await window.ethereum.request({
				method: 'eth_accounts'
			})) as string[];

			if (accounts.length > 0) {
				address = accounts[0];
				isConnected = true;
				// Clear disconnected flag on successful connect
				localStorage.removeItem(DISCONNECTED_KEY);
			}

			// Try to switch to correct chain
			await ensureCorrectChain();
		} catch (error) {
			console.error('Failed to connect:', error);
		} finally {
			isLoading = false;
		}
	}

	async function ensureCorrectChain() {
		if (typeof window === 'undefined' || !window.ethereum) return;

		// Dynamic import to avoid SSR issues with viem
		const { getChainConfig } = await import('$lib/chain');
		const chain = getChainConfig();
		const targetChainId = chain.id;
		const targetChainIdHex = `0x${targetChainId.toString(16)}`;

		try {
			const currentChainIdHex = (await window.ethereum.request({
				method: 'eth_chainId'
			})) as string;
			const currentChainId = parseInt(currentChainIdHex, 16);

			if (currentChainId !== targetChainId) {
				try {
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: targetChainIdHex }]
					});
				} catch (switchError: unknown) {
					// Chain not added, try to add it
					if ((switchError as { code?: number })?.code === 4902) {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: targetChainIdHex,
									chainName: chain.name,
									nativeCurrency: chain.nativeCurrency,
									rpcUrls: [chain.rpcUrls.default.http[0]],
									blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined
								}
							]
						});
					}
				}
			}
		} catch (error) {
			console.error('Failed to switch chain:', error);
		}
	}

	function handleDisconnect() {
		// Store disconnected state to prevent auto-reconnect
		localStorage.setItem(DISCONNECTED_KEY, 'true');
		address = undefined;
		isConnected = false;
		showDropdown = false;
	}

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.wallet-dropdown')) {
			showDropdown = false;
		}
	}

	onMount(() => {
		checkConnection();
		// Listen for account changes
		if (typeof window !== 'undefined' && window.ethereum?.on) {
			window.ethereum.on('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
			window.ethereum.on('chainChanged', handleChainChanged);
		}
		// Listen for clicks outside dropdown
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		// Cleanup listeners - check for browser environment
		if (typeof window !== 'undefined') {
			if (window.ethereum?.removeListener) {
				window.ethereum.removeListener(
					'accountsChanged',
					handleAccountsChanged as (...args: unknown[]) => void
				);
				window.ethereum.removeListener('chainChanged', handleChainChanged);
			}
			document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

{#if isConnected}
	<div class="wallet-dropdown relative">
		<button
			class="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
			onclick={toggleDropdown}
		>
			<span class="h-2 w-2 rounded-full bg-green-400"></span>
			{displayAddress}
			<svg class="h-4 w-4 transition-transform" class:rotate-180={showDropdown} fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if showDropdown}
			<div class="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg bg-gray-800 py-2 shadow-lg">
				<div class="border-b border-gray-700 px-4 py-2 text-xs text-gray-400">
					{address}
				</div>
				<button
					class="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
					onclick={handleDisconnect}
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
					{m.disconnect()}
				</button>
			</div>
		{/if}
	</div>
{:else}
	<button
		class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
		disabled={isLoading}
		onclick={handleConnect}
	>
		{isLoading ? '...' : m.connect_wallet()}
	</button>
{/if}
