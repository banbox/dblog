module.exports = class Data1765975265838 {
    name = 'Data1765975265838'

    async up(db) {
        await db.query(`ALTER TABLE "article" ADD "edited_at" TIMESTAMP WITH TIME ZONE`)
    }

    async down(db) {
        await db.query(`ALTER TABLE "article" DROP COLUMN "edited_at"`)
    }
}
