-- AlterTable
ALTER TABLE "generation_jobs" ADD COLUMN     "source_publication_id" UUID;

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "catalog_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "generation_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "generation_jobs_source_publication_id_created_at_idx" ON "generation_jobs"("source_publication_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_source_publication_id_fkey" FOREIGN KEY ("source_publication_id") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
