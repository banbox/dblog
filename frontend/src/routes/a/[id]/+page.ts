/**
 * Article detail page load function
 * Uses short URL /a/[id] for minimal URL length
 */
import type { PageLoad } from './$types';
import { client } from '$lib/graphql/client';
import { ARTICLE_BY_ID_QUERY, type ArticleDetailData } from '$lib/graphql/queries';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const articleId = params.id;

	// Use 'network-only' to always fetch fresh data and avoid cache issues
	const result = await client.query(ARTICLE_BY_ID_QUERY, { id: articleId }, { requestPolicy: 'network-only' }).toPromise();

	if (result.error) {
		throw error(500, result.error.message);
	}

	const article: ArticleDetailData | null = result.data?.articleById;

	if (!article) {
		throw error(404, 'Article not found');
	}

	return {
		article
	};
};
