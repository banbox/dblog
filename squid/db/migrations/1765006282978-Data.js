module.exports = class Data1765006282978 {
    name = 'Data1765006282978'

    async up(db) {
        // 先添加可空的 title 列
        await db.query(`ALTER TABLE "article" ADD "title" text`)
        // 为现有记录设置默认值
        await db.query(`UPDATE "article" SET "title" = '' WHERE "title" IS NULL`)
        // 然后设置为 NOT NULL
        await db.query(`ALTER TABLE "article" ALTER COLUMN "title" SET NOT NULL`)
        await db.query(`ALTER TABLE "article" ADD "cover_image" text`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "article" DROP COLUMN "title"`)
        await db.query(`ALTER TABLE "article" DROP COLUMN "cover_image"`)
    }
}
