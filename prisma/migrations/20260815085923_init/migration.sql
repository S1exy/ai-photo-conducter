-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'INVITED_CREATOR', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "TemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('USER_INPUT', 'GENERATED_OUTPUT', 'TEMPLATE_COVER', 'TEMPLATE_PREVIEW', 'USER_AVATAR');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('NOT_CHECKED', 'PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('CREATED', 'QUEUED', 'RUNNING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('DRAFT', 'DELETED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'WITHDRAWN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('INPUT_ASSET', 'OUTPUT_ASSET', 'PUBLICATION');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'RUNNING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('GRANT', 'RESERVE', 'CONSUME', 'RELEASE', 'REFUND', 'ADJUST');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "openid" VARCHAR(128) NOT NULL,
    "unionid" VARCHAR(128),
    "system_nickname" VARCHAR(32) NOT NULL,
    "avatar_asset_id" UUID,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID,
    "name" VARCHAR(80) NOT NULL,
    "cover_asset_id" UUID,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "input_schema" JSONB NOT NULL,
    "render_config" JSONB NOT NULL,
    "model_config" JSONB NOT NULL,
    "output_specs" JSONB NOT NULL,
    "preview_asset_id" UUID,
    "checksum" CHAR(64) NOT NULL,
    "status" "TemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "byte_size" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "created_by_user_id" UUID,
    "safety_status" "SafetyStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "input_asset_id" UUID NOT NULL,
    "output_asset_id" UUID,
    "source_job_id" UUID,
    "aspect_ratio" VARCHAR(16) NOT NULL,
    "provider" VARCHAR(40) NOT NULL DEFAULT 'mock',
    "provider_job_id" VARCHAR(200),
    "status" "GenerationStatus" NOT NULL DEFAULT 'CREATED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "billing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "points_cost_snapshot" INTEGER NOT NULL DEFAULT 0,
    "failure_code" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "generation_job_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "input_asset_id" UUID NOT NULL,
    "output_asset_id" UUID NOT NULL,
    "parent_creation_id" UUID,
    "status" "CreationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "creations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "creation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version_id" UUID NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "review_reason_code" VARCHAR(64),
    "published_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_likes" (
    "user_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_likes_pkey" PRIMARY KEY ("user_id","publication_id")
);

-- CreateTable
CREATE TABLE "work_bookmarks" (
    "user_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_bookmarks_pkey" PRIMARY KEY ("user_id","publication_id")
);

-- CreateTable
CREATE TABLE "template_bookmarks" (
    "user_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_bookmarks_pkey" PRIMARY KEY ("user_id","template_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "publication_id" UUID,
    "template_id" UUID,
    "reason_code" VARCHAR(40) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_requests" (
    "id" UUID NOT NULL,
    "target_type" "ReviewTargetType" NOT NULL,
    "asset_id" UUID,
    "publication_id" UUID,
    "provider" VARCHAR(40) NOT NULL DEFAULT 'mock',
    "provider_request_id" VARCHAR(200),
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reason_code" VARCHAR(64),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_accounts" (
    "user_id" UUID NOT NULL,
    "available_points" INTEGER NOT NULL DEFAULT 0,
    "frozen_points" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "point_ledger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "generation_job_id" UUID,
    "transaction_type" "PointTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_invitations" (
    "id" UUID NOT NULL,
    "invite_code_hash" CHAR(64) NOT NULL,
    "invited_user_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "users_unionid_key" ON "users"("unionid");

-- CreateIndex
CREATE UNIQUE INDEX "users_system_nickname_key" ON "users"("system_nickname");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "templates_status_sort_order_created_at_idx" ON "templates"("status", "sort_order", "created_at" DESC);

-- CreateIndex
CREATE INDEX "templates_owner_user_id_status_idx" ON "templates"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "template_versions_template_id_status_version_number_idx" ON "template_versions"("template_id", "status", "version_number" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_template_id_version_number_key" ON "template_versions"("template_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "assets_storage_key_key" ON "assets"("storage_key");

-- CreateIndex
CREATE INDEX "assets_created_by_user_id_kind_created_at_idx" ON "assets"("created_by_user_id", "kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "assets_safety_status_created_at_idx" ON "assets"("safety_status", "created_at");

-- CreateIndex
CREATE INDEX "assets_sha256_idx" ON "assets"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "generation_jobs_idempotency_key_key" ON "generation_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "generation_jobs_user_id_created_at_idx" ON "generation_jobs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "generation_jobs_status_updated_at_idx" ON "generation_jobs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "generation_jobs_template_version_id_created_at_idx" ON "generation_jobs"("template_version_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "generation_jobs_provider_provider_job_id_idx" ON "generation_jobs"("provider", "provider_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "creations_generation_job_id_key" ON "creations"("generation_job_id");

-- CreateIndex
CREATE INDEX "creations_user_id_status_created_at_idx" ON "creations"("user_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "creations_template_version_id_created_at_idx" ON "creations"("template_version_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "publications_creation_id_key" ON "publications"("creation_id");

-- CreateIndex
CREATE INDEX "publications_status_published_at_id_idx" ON "publications"("status", "published_at" DESC, "id");

-- CreateIndex
CREATE INDEX "publications_template_id_status_published_at_idx" ON "publications"("template_id", "status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "publications_user_id_status_created_at_idx" ON "publications"("user_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "work_likes_publication_id_created_at_idx" ON "work_likes"("publication_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "work_bookmarks_publication_id_created_at_idx" ON "work_bookmarks"("publication_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "template_bookmarks_template_id_created_at_idx" ON "template_bookmarks"("template_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_publication_id_status_idx" ON "reports"("publication_id", "status");

-- CreateIndex
CREATE INDEX "reports_template_id_status_idx" ON "reports"("template_id", "status");

-- CreateIndex
CREATE INDEX "moderation_requests_status_updated_at_idx" ON "moderation_requests"("status", "updated_at");

-- CreateIndex
CREATE INDEX "moderation_requests_provider_provider_request_id_idx" ON "moderation_requests"("provider", "provider_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_ledger_idempotency_key_key" ON "point_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "point_ledger_user_id_created_at_idx" ON "point_ledger"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "point_ledger_generation_job_id_transaction_type_idx" ON "point_ledger"("generation_job_id", "transaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "creator_invitations_invite_code_hash_key" ON "creator_invitations"("invite_code_hash");

-- CreateIndex
CREATE INDEX "creator_invitations_expires_at_accepted_at_idx" ON "creator_invitations"("expires_at", "accepted_at");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_topic_aggregate_id_idx" ON "outbox_events"("topic", "aggregate_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_asset_id_fkey" FOREIGN KEY ("avatar_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_preview_asset_id_fkey" FOREIGN KEY ("preview_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_input_asset_id_fkey" FOREIGN KEY ("input_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_output_asset_id_fkey" FOREIGN KEY ("output_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_source_job_id_fkey" FOREIGN KEY ("source_job_id") REFERENCES "generation_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_input_asset_id_fkey" FOREIGN KEY ("input_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_output_asset_id_fkey" FOREIGN KEY ("output_asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creations" ADD CONSTRAINT "creations_parent_creation_id_fkey" FOREIGN KEY ("parent_creation_id") REFERENCES "creations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_creation_id_fkey" FOREIGN KEY ("creation_id") REFERENCES "creations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_likes" ADD CONSTRAINT "work_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_likes" ADD CONSTRAINT "work_likes_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_bookmarks" ADD CONSTRAINT "work_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_bookmarks" ADD CONSTRAINT "work_bookmarks_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_bookmarks" ADD CONSTRAINT "template_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_bookmarks" ADD CONSTRAINT "template_bookmarks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_requests" ADD CONSTRAINT "moderation_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_requests" ADD CONSTRAINT "moderation_requests_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_accounts" ADD CONSTRAINT "point_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_invitations" ADD CONSTRAINT "creator_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
