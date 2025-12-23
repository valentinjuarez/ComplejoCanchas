/*
  Warnings:

  - A unique constraint covering the columns `[cancelToken]` on the table `Reserva` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CANCELED');

-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "cancelToken" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_cancelToken_key" ON "Reserva"("cancelToken");
