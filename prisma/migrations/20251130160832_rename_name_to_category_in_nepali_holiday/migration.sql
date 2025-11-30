-- Check if column 'name' exists and rename to 'category', otherwise assume 'category' already exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'nepali_holidays' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE "nepali_holidays" RENAME COLUMN "name" TO "category";
    END IF;
END $$;

-- Drop the old unique constraint if it exists
ALTER TABLE "nepali_holidays" DROP CONSTRAINT IF EXISTS "nepali_holidays_name_date_year_key";

-- Create new unique constraint on category, date, and year (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'nepali_holidays_category_date_year_key'
    ) THEN
        ALTER TABLE "nepali_holidays" ADD CONSTRAINT "nepali_holidays_category_date_year_key" UNIQUE ("category", "date", "year");
    END IF;
END $$;

-- Drop old index if it exists
DROP INDEX IF EXISTS "nepali_holidays_name_year_idx";

-- Create new index on category and year (if it doesn't exist)
CREATE INDEX IF NOT EXISTS "nepali_holidays_category_year_idx" ON "nepali_holidays"("category", "year");

