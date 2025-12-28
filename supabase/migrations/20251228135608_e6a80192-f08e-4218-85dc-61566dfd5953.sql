-- Drop existing select policies for assignment-files
DROP POLICY IF EXISTS "Teachers can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view assignment files" ON storage.objects;

-- Create a simple public read policy for assignment-files bucket
CREATE POLICY "Anyone can view assignment files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assignment-files');