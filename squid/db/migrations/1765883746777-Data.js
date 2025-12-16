module.exports = class Data1765883746777 {
    name = 'Data1765883746777'

    async up(db) {
        await db.query(`ALTER TABLE "article" RENAME COLUMN "arweave_id" TO "article_id"`)
        await db.query(`ALTER TABLE "article" DROP COLUMN "article_id"`)
        await db.query(`ALTER TABLE "article" ADD "article_id" numeric NOT NULL`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "article" RENAME COLUMN "article_id" TO "arweave_id"`)
        await db.query(`ALTER TABLE "article" ADD "article_id" text NOT NULL`)
        await db.query(`ALTER TABLE "article" DROP COLUMN "article_id"`)
    }
}
