/**
 * GraphQL client configuration for SubSquid
 */
import { Client, cacheExchange, fetchExchange } from '@urql/svelte';

// SubSquid GraphQL endpoint - update this to your deployed squid URL
const SUBSQUID_ENDPOINT = import.meta.env.VITE_SUBSQUID_ENDPOINT || 'http://localhost:4350/graphql';

export const client = new Client({
	url: SUBSQUID_ENDPOINT,
	exchanges: [cacheExchange, fetchExchange]
});

export function getSubsquidEndpoint(): string {
	return SUBSQUID_ENDPOINT;
}
