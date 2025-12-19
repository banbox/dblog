import { Arg, Field, InputType, ObjectType, Query, Resolver, Int } from 'type-graphql'
import type { EntityManager } from 'typeorm'
import { Article } from '../../model'

@InputType()
export class SearchArticlesInput {
    @Field({ nullable: true })
    query?: string

    @Field(() => Int, { nullable: true })
    categoryId?: number

    @Field(() => Int, { nullable: true })
    originality?: number

    @Field(() => Int, { nullable: true })
    minLikeAmount?: number

    @Field(() => Int, { nullable: true })
    limit?: number

    @Field(() => Int, { nullable: true })
    offset?: number

    @Field({ nullable: true })
    orderBy?: string

    @Field({ nullable: true })
    orderDirection?: string
}

@ObjectType()
export class SearchArticleResult {
    @Field()
    id!: string

    @Field()
    articleId!: string

    @Field()
    title!: string

    @Field({ nullable: true })
    summary?: string

    @Field()
    categoryId!: string

    @Field()
    originality!: number

    @Field()
    likeAmount!: string

    @Field()
    dislikeAmount!: string

    @Field()
    totalTips!: string

    @Field()
    collectCount!: string

    @Field()
    createdAt!: Date

    @Field({ nullable: true })
    authorId?: string

    @Field({ nullable: true })
    authorNickname?: string
}

@ObjectType()
export class SearchArticlesResponse {
    @Field(() => [SearchArticleResult])
    articles!: SearchArticleResult[]

    @Field(() => Int)
    total!: number
}

@Resolver()
export class SearchResolver {
    constructor(private tx: () => Promise<EntityManager>) {}

    @Query(() => SearchArticlesResponse)
    async searchArticles(
        @Arg('input') input: SearchArticlesInput
    ): Promise<SearchArticlesResponse> {
        const manager = await this.tx()
        
        const {
            query,
            categoryId,
            originality,
            minLikeAmount,
            limit = 20,
            offset = 0,
            orderBy = 'createdAt',
            orderDirection = 'DESC'
        } = input

        // Build the query
        let qb = manager.createQueryBuilder(Article, 'article')
            .leftJoinAndSelect('article.author', 'author')

        // Full-text search across title, summary
        if (query && query.trim()) {
            const searchTerm = `%${query.trim().toLowerCase()}%`
            qb = qb.where(
                '(LOWER(article.title) LIKE :searchTerm OR LOWER(article.summary) LIKE :searchTerm)',
                { searchTerm }
            )
        }

        if (categoryId != null) {
            qb = qb.andWhere('article.categoryId = :categoryId', { categoryId: BigInt(categoryId) })
        }
        if (originality != null) {
            qb = qb.andWhere('article.originality = :originality', { originality })
        }
        if (minLikeAmount != null) {
            qb = qb.andWhere('article.likeAmount >= :minLikeAmount', { minLikeAmount: BigInt(minLikeAmount) })
        }

        // Get total count before pagination
        const total = await qb.getCount()

        // Apply ordering
        const validOrderFields = ['createdAt', 'likeAmount', 'totalTips', 'collectCount']
        const orderField = validOrderFields.includes(orderBy) ? orderBy : 'createdAt'
        const direction = orderDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
        qb = qb.orderBy(`article.${orderField}`, direction)

        // Apply pagination
        qb = qb.skip(offset).take(Math.min(limit, 100))

        const articles = await qb.getMany()

        return {
            articles: articles.map(a => ({
                id: a.id,
                articleId: a.articleId.toString(),
                title: a.title,
                summary: a.summary || undefined,
                categoryId: a.categoryId.toString(),
                originality: a.originality,
                likeAmount: a.likeAmount.toString(),
                dislikeAmount: a.dislikeAmount.toString(),
                totalTips: a.totalTips.toString(),
                collectCount: a.collectCount.toString(),
                createdAt: a.createdAt,
                authorId: (a.author as any)?.id,
                authorNickname: (a.author as any)?.nickname
            })),
            total
        }
    }
}
