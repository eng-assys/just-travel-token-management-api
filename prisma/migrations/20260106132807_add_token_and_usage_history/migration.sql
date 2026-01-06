-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('AVAILABLE', 'ACTIVE');

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentUserId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_histories" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "usage_histories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "usage_histories" ADD CONSTRAINT "usage_histories_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
