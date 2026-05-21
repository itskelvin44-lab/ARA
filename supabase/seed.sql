-- ============================================================
-- ARA Hub — Seed Data
-- Run this THIRD in Supabase SQL Editor
-- (after at least one real user has signed in, so profiles exist)
-- ============================================================

-- Seed notices — attributed to the first user who signed up
insert into public.notices (id, title, body, category, author_id, created_at)
values
(
  gen_random_uuid(),
  'Shadow Demo architecture finalised',
  'After two weeks of iteration, the 10M parameter architecture spec is locked. d_model=128, 8 layers, d_ff=512, 40/60 split at neuron level. Full breakdown in the Mathematical Companion document. Build phase starts Monday — see the group chat for task assignments.',
  'update',
  (select id from public.profiles order by created_at asc limit 1),
  now() - interval '1 day'
),
(
  gen_random_uuid(),
  'Weekly sync — Friday 3pm UTC',
  'Our weekly all-hands video call. Agenda: (1) Shadow Demo progress, (2) Benchmark baseline results, (3) Supabase Hub demo. Link in your calendar invite. All welcome, recordings posted afterward.',
  'info',
  (select id from public.profiles order by created_at asc limit 1),
  now() - interval '2 days'
),
(
  gen_random_uuid(),
  'Training data generator — help needed',
  'We need 3–4 volunteers to review the output of the arithmetic problem generator. Specifically checking coverage of all 25 reasoning primitives. Estimated 2 hours. Reply in the group chat if you can help.',
  'urgent',
  (select id from public.profiles order by created_at asc limit 1),
  now() - interval '3 hours'
),
(
  gen_random_uuid(),
  'Welcome to ARA Hub!',
  'This is the collaboration workspace for the Adaptive Reasoning Architecture project. Introduce yourself in the group chat, check the Repository for the codebase, and browse the Project Notes for key papers and resources. Glad to have you here!',
  'info',
  (select id from public.profiles order by created_at asc limit 1),
  now() - interval '5 days'
);
