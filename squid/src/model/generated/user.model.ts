import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Article} from "./article.model"
import {Comment} from "./comment.model"
import {Follow} from "./follow.model"

@Entity_()
export class User {
    constructor(props?: Partial<User>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @OneToMany_(() => Article, e => e.author)
    articles!: Article[]

    @OneToMany_(() => Comment, e => e.user)
    comments!: Comment[]

    @OneToMany_(() => Follow, e => e.following)
    followers!: Follow[]

    @OneToMany_(() => Follow, e => e.follower)
    following!: Follow[]

    @IntColumn_({nullable: false})
    totalArticles!: number

    @IntColumn_({nullable: false})
    totalFollowers!: number

    @IntColumn_({nullable: false})
    totalFollowing!: number

    @DateTimeColumn_({nullable: false})
    createdAt!: Date
}
