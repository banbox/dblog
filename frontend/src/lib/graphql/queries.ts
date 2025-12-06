/**
 * GraphQL queries for SubSquid
 */
import { gql } from '@urql/svelte';

/**
 * Get articles with pagination and optional category filter
 */
export const ARTICLES_QUERY = gql`
	query Articles($limit: Int!, $offset: Int!, $categoryId: BigInt) {
		articles(
			orderBy: createdAt_DESC
			limit: $limit
			offset: $offset
			where: { categoryId_eq: $categoryId }
		) {
			id
			arweaveId
			author {
				id
			}
			originalAuthor
			title
			coverImage
			categoryId
			likes
			dislikes
			totalTips
			createdAt
			blockNumber
			txHash
		}
	}
`;

/**
 * Get all articles (no category filter)
 */
export const ALL_ARTICLES_QUERY = gql`
	query AllArticles($limit: Int!, $offset: Int!) {
		articles(orderBy: createdAt_DESC, limit: $limit, offset: $offset) {
			id
			arweaveId
			author {
				id
			}
			originalAuthor
			title
			coverImage
			categoryId
			likes
			dislikes
			totalTips
			createdAt
			blockNumber
			txHash
		}
	}
`;

/**
 * Get article count for a category
 */
export const ARTICLE_COUNT_QUERY = gql`
	query ArticleCount($categoryId: BigInt) {
		articlesConnection(where: { categoryId_eq: $categoryId }) {
			totalCount
		}
	}
`;

/**
 * Get total article count
 */
export const TOTAL_ARTICLE_COUNT_QUERY = gql`
	query TotalArticleCount {
		articlesConnection {
			totalCount
		}
	}
`;

export interface ArticleData {
	id: string;
	arweaveId: string;
	author: {
		id: string;
	};
	originalAuthor: string | null;
	title: string;
	coverImage: string | null;
	categoryId: string;
	likes: number;
	dislikes: number;
	totalTips: string;
	createdAt: string;
	blockNumber: number;
	txHash: string;
}

export interface ArticlesQueryResult {
	articles: ArticleData[];
}

export interface ArticleCountResult {
	articlesConnection: {
		totalCount: number;
	};
}
