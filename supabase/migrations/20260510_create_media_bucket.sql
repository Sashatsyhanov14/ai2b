-- Create a new bucket for media (units and faq)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies to allow public access and uploads for everyone (consistent with project's disabled RLS approach)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');
