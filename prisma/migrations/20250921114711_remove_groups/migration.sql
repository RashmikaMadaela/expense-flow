/*
  Warnings:

  - You are about to drop the column `groupId` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the `group_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `groups` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."expenses" DROP CONSTRAINT "expenses_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."group_members" DROP CONSTRAINT "group_members_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."group_members" DROP CONSTRAINT "group_members_userId_fkey";

-- DropIndex
DROP INDEX "public"."expenses_groupId_idx";

-- AlterTable
ALTER TABLE "public"."expenses" DROP COLUMN "groupId";

-- DropTable
DROP TABLE "public"."group_members";

-- DropTable
DROP TABLE "public"."groups";

-- DropEnum
DROP TYPE "public"."GroupRole";
