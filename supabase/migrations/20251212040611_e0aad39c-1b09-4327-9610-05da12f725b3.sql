-- Make assignment-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'assignment-files';