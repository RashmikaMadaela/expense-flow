-- DropForeignKey
ALTER TABLE "public"."expense_participants" DROP CONSTRAINT "expense_participants_userId_fkey";

-- DropIndex
DROP INDEX "public"."expense_participants_expenseId_userId_key";

-- AlterTable
ALTER TABLE "public"."expense_participants" ADD COLUMN     "customName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "expense_participants_expenseId_idx" ON "public"."expense_participants"("expenseId");

-- AddForeignKey
ALTER TABLE "public"."expense_participants" ADD CONSTRAINT "expense_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
