-- Storage bucket policies for chat-attachments
create policy "chat-attachments: own upload"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "chat-attachments: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
  );

-- Storage bucket policies for project-uploads
create policy "project-uploads: own upload"
  on storage.objects for insert
  with check (
    bucket_id = 'project-uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "project-uploads: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'project-uploads'
    and auth.role() = 'authenticated'
  );
