-- Create the storage bucket 'cms-uploads' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('cms-uploads', 'cms-uploads', true)
on conflict (id) do nothing;

-- Set up RLS policies for the bucket
-- Allow public access to view files
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'cms-uploads' );

-- Allow authenticated users to upload files
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'cms-uploads' and auth.role() = 'authenticated' );

-- Allow authenticated users to update files
create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'cms-uploads' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete files
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'cms-uploads' and auth.role() = 'authenticated' );
