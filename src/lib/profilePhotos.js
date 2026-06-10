import { supabase } from './supabase';

const PHOTO_BUCKET = 'profile-photos';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export function validateProfilePhoto(file) {
  if (!file) return 'Please select a photo.';
  if (!file.type.startsWith('image/')) return 'Please upload an image file.';
  if (file.size > MAX_PHOTO_SIZE) return 'Photo must be smaller than 5MB.';
  return '';
}

export async function uploadProfilePhoto(file, ownerId) {
  const validationError = validateProfilePhoto(file);
  if (validationError) throw new Error(validationError);

  const safeOwnerId = ownerId || crypto.randomUUID();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `profiles/${safeOwnerId}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw new Error(
      error.message?.includes('Bucket not found')
        ? 'Profile photo storage is not set up. Create the profile-photos bucket in Supabase Storage.'
        : error.message || 'Profile photo upload failed.'
    );
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error('Could not create a public URL for the profile photo.');
  return data.publicUrl;
}
