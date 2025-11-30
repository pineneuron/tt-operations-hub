-- CreateEnum
CREATE TYPE "WorkLocation" AS ENUM ('OFFICE', 'SITE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ON_TIME', 'LATE', 'ABSENT', 'HALF_DAY', 'AUTO_CHECKED_OUT');

-- CreateEnum
CREATE TYPE "AttendanceFlag" AS ENUM ('MISSING_LOCATION_CHECKS', 'LOCATION_OUT_OF_BOUNDS', 'AUTO_CHECKED_OUT', 'INCOMPLETE_SESSION');

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workLocation" "WorkLocation" NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ON_TIME',
    "flags" "AttendanceFlag"[],
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "expectedCheckInTime" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lateMinutes" INTEGER,
    "lateReason" TEXT,
    "checkInLocationLat" DOUBLE PRECISION,
    "checkInLocationLng" DOUBLE PRECISION,
    "checkInLocationAddress" TEXT,
    "checkOutTime" TIMESTAMP(3),
    "expectedCheckOutTime" TIMESTAMP(3),
    "checkOutLocationLat" DOUBLE PRECISION,
    "checkOutLocationLng" DOUBLE PRECISION,
    "checkOutLocationAddress" TEXT,
    "totalHours" DOUBLE PRECISION,
    "autoCheckedOut" BOOLEAN NOT NULL DEFAULT false,
    "checkInNotes" TEXT,
    "checkOutNotes" TEXT,
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_locations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_idx" ON "attendance_sessions"("userId");

-- CreateIndex
CREATE INDEX "attendance_sessions_date_idx" ON "attendance_sessions"("date");

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_date_idx" ON "attendance_sessions"("userId", "date");

-- CreateIndex
CREATE INDEX "attendance_sessions_userId_checkInTime_idx" ON "attendance_sessions"("userId", "checkInTime");

-- CreateIndex
CREATE INDEX "attendance_sessions_status_idx" ON "attendance_sessions"("status");

-- CreateIndex
CREATE INDEX "attendance_sessions_isLate_idx" ON "attendance_sessions"("isLate");

-- CreateIndex
CREATE INDEX "attendance_locations_sessionId_idx" ON "attendance_locations"("sessionId");

-- CreateIndex
CREATE INDEX "attendance_locations_sessionId_timestamp_idx" ON "attendance_locations"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "attendance_locations_timestamp_idx" ON "attendance_locations"("timestamp");

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_locations" ADD CONSTRAINT "attendance_locations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
