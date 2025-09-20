-- CreateEnum
CREATE TYPE "public"."SettlementRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."settlement_requests" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "status" "public"."SettlementRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "settlement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlement_requests_senderId_idx" ON "public"."settlement_requests"("senderId");

-- CreateIndex
CREATE INDEX "settlement_requests_receiverId_idx" ON "public"."settlement_requests"("receiverId");

-- CreateIndex
CREATE INDEX "settlement_requests_status_idx" ON "public"."settlement_requests"("status");

-- AddForeignKey
ALTER TABLE "public"."settlement_requests" ADD CONSTRAINT "settlement_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlement_requests" ADD CONSTRAINT "settlement_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
