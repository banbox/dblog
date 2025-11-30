import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Article} from "./article.model"
import {User} from "./user.model"

@Entity_()
export class Evaluation {
    constructor(props?: Partial<Evaluation>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Article, {nullable: true})
    article!: Article

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @IntColumn_({nullable: false})
    score!: number

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @StringColumn_({nullable: true})
    comment!: string | undefined | null

    @StringColumn_({nullable: true})
    referrer!: string | undefined | null

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @StringColumn_({nullable: false})
    txHash!: string
}
