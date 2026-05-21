-- ============================================================
-- ARA Hub — Database Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TRIGGER FUNCTION: auto-update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- TRIGGER FUNCTION: auto-create profile on sign-up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '#1a56e8'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- TABLE 1: profiles
-- ============================================================
create table public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  name                text        not null default 'New Member',
  role                text        not null default 'Contributor',
  bio                 text        default '',
  skills              text[]      default '{}',
  color               text        not null default '#1a56e8',
  onboarding_complete boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Trigger: auto-create profile when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: keep updated_at current
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- TABLE 2: messages
-- ============================================================
create table public.messages (
  id          uuid        primary key default gen_random_uuid(),
  sender_id   uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null default 'text' check (type in ('text', 'file')),
  content     text,
  file_name   text,
  file_url    text,
  file_size   text,
  created_at  timestamptz not null default now()
);

-- Index: load messages ordered by time
create index messages_created_at_idx on public.messages (created_at asc);

-- ============================================================
-- TABLE 3: notices
-- ============================================================
create table public.notices (
  id          uuid        primary key default gen_random_uuid(),
  author_id   uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  body        text        not null,
  category    text        not null default 'info' check (category in ('info','urgent','update','question','idea')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: keep updated_at current
drop trigger if exists notices_updated_at on public.notices;
create trigger notices_updated_at
  before update on public.notices
  for each row execute procedure public.set_updated_at();

-- Index: load notices ordered by time
create index notices_created_at_idx on public.notices (created_at desc);

-- ============================================================
-- TABLE 4: notice_reactions
-- ============================================================
create table public.notice_reactions (
  id          uuid        primary key default gen_random_uuid(),
  notice_id   uuid        not null references public.notices(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null check (type in ('like', 'pin')),
  created_at  timestamptz not null default now(),

  -- One reaction per user per notice per type
  unique (notice_id, user_id, type)
);

-- ============================================================
-- TABLE 5: resources
-- ============================================================
create table public.resources (
  id          uuid        primary key default gen_random_uuid(),
  author_id   uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  type        text        not null default 'link' check (type in ('paper','book','doc','link','other')),
  description text        not null,
  created_at  timestamptz not null default now()
);

-- Index: load resources ordered by time
create index resources_created_at_idx on public.resources (created_at desc);

-- ============================================================
-- TABLE 6: uploads
-- ============================================================
create table public.uploads (
  id           uuid        primary key default gen_random_uuid(),
  uploaded_by  uuid        not null references public.profiles(id) on delete cascade,
  file_name    text        not null,
  file_url     text        not null,
  file_size    text        not null,
  created_at   timestamptz not null default now()
);

-- Index: load uploads ordered by time
create index uploads_created_at_idx on public.uploads (created_at desc);
