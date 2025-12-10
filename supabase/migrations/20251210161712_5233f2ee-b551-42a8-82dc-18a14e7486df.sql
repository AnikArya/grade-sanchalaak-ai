-- Add column for assignment description file
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS description_file_url TEXT;

-- Create storage bucket for assignment descriptions
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow teachers to upload assignment files
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('teacher', 'admin')
  )
);

-- Allow teachers to view their uploaded files
CREATE POLICY "Teachers can view assignment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-files'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('teacher', 'admin', 'student')
  )
);

-- Allow teachers to delete their files
CREATE POLICY "Teachers can delete assignment files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignment-files'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('teacher', 'admin')
  )
);