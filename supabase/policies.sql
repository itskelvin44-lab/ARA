-- ============================================================
-- ARA Hub — Row Level Security Policies
-- Run this SECOND in Supabase SQL Editor (after schema.sql)
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.messages         enable row level security;
alter table public.notices          enable row level security;
alter table public.notice_reactions enable row level security;
alter table public.resources        enable row level security;
alter table public.uploads          enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone authenticated can read all profiles
create policy "profiles: authenticated read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Users can only insert their own profile row
create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can only update their own profile row
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- MESSAGES
-- ============================================================

-- All authenticated users can read all messages
create policy "messages: authenticated read"
  on public.messages for select
  using (auth.role() = 'authenticated');

-- Users can only insert messages as themselves
create policy "messages: own insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- ============================================================
-- NOTICES
-- ============================================================

-- All authenticated users can read all notices
create policy "notices: authenticated read"
  on public.notices for select
  using (auth.role() = 'authenticated');

-- Users can only insert notices as themselves
create policy "notices: own insert"
  on public.notices for insert
  with check (auth.uid() = author_id);

-- Authors can update their own notices
create policy "notices: own update"
  on public.notices for update
  using (auth.uid() = author_id);

-- ============================================================
-- NOTICE REACTIONS
-- ============================================================

-- All authenticated users can read reactions
create policy "reactions: authenticated read"
  on public.notice_reactions for select
  using (auth.role() = 'authenticated');

-- Users can only insert their own reactions
create policy "reactions: own insert"
  on public.notice_reactions for insert
  with check (auth.uid() = user_id);

-- Users can delete their own reactions (toggle off)
create policy "reactions: own delete"
  on public.notice_reactions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RESOURCES
-- ============================================================

-- All authenticated users can read all resources
create policy "resources: authenticated read"
  on public.resources for select
  using (auth.role() = 'authenticated');

-- Users can only insert resources as themselves
create policy "resources: own insert"
  on public.resources for insert
  with check (auth.uid() = author_id);

-- ============================================================
-- UPLOADS
-- ============================================================

-- All authenticated users can read all uploads
create policy "uploads: authenticated read"
  on public.uploads for select
  using (auth.role() = 'authenticated');

-- Users can only insert uploads as themselves
create policy "uploads: own insert"
  on public.uploads for insert
  with check (auth.uid() = uploaded_by);

-- ============================================================
-- STORAGE BUCKET POLICIES
-- Run these after creating the buckets in the Supabase dashboard
-- ============================================================

-- Bucket: chat-attachments
-- Authenticated users can upload to their own folder
create policy "chat-attachments: own upload"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read any file in this bucket
create policy "chat-attachments: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and auth.role() = 'authenticated'
  );

-- Bucket: project-uploads
-- Authenticated users can upload to their own folder
create policy "project-uploads: own upload"
  on storage.objects for insert
  with check (
    bucket_id = 'project-uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read any file in this bucket
create policy "project-uploads: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'project-uploads'
    and auth.role() = 'authenticated'
  );
