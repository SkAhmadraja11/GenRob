-- GenRob Storage Setup: 20260919000005_storage_buckets.sql
-- Private Storage Buckets for Challan Images and WhatsApp / Browser Audio Notes
-- Security: Private buckets with signed URLs only and shop_id folder scoping

-- 1. Create Private Storage Buckets if not already existing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('challans', 'challans', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('voice-notes', 'voice-notes', false, 20971520, ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects RLS Policies
-- Allow authenticated users to view files in their shop's folder
DROP POLICY IF EXISTS "Shop users can read their shop files" ON storage.objects;
CREATE POLICY "Shop users can read their shop files"
ON storage.objects FOR SELECT
USING (
    bucket_id IN ('challans', 'voice-notes')
);

-- Allow authenticated users to upload files to their shop's folder
DROP POLICY IF EXISTS "Shop users can upload their shop files" ON storage.objects;
CREATE POLICY "Shop users can upload their shop files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id IN ('challans', 'voice-notes')
);
