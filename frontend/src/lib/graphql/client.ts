/**
 * GraphQL client configuration for SubSquid
 * 
 * Note: We use 'cache-and-network' as default requestPolicy to ensure
 * fresh data while still benefiting from cache for instant display.
 * This fixes SSR hydration issues where client cache might be empty.
 */
import { Client, cacheExchange, fetchExchange } from '@urql/svelte';
import { getSubsquidEndpoint } from '$lib/config';

export const client = new Client({
	url: getSubsquidEndpoint(),
	exchanges: [cacheExchange, fetchExchange],
	requestPolicy: 'cache-and-network'
});
