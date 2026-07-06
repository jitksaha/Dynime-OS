
-- Add attendance_type (automatic/manual) and working_hours columns
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS working_hours numeric DEFAULT 0;
