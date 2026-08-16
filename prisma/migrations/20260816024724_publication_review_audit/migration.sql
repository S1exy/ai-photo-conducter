-- AlterTable
ALTER TABLE "publications" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_user_id" UUID;

-- CreateIndex
CREATE INDEX "publications_reviewed_by_user_id_reviewed_at_idx" ON "publications"("reviewed_by_user_id", "reviewed_at" DESC);

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
