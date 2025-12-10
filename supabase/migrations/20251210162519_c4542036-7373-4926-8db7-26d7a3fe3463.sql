-- Allow students to view assignment files
CREATE POLICY "Students can view assignment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-files' AND EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'student'
));