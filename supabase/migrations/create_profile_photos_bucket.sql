-- Create profile-photos bucket for storing user profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up bucket policies for authenticated users
CREATE POLICY "Allow authenticated users to upload profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow anyone to view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow users to delete their own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.role() = 'authenticated'
);
