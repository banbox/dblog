/**
 * GraphQL client configuration for SubSquid
 */
import { Client, cacheExchange, fetchExchange } from '@urql/svelte';
import { getSubsquidEndpoint } from '$lib/config';

export const client = new Client({
	url: getSubsquidEndpoint(),
	exchanges: [cacheExchange, fetchExchange]
});
