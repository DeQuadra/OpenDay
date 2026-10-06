-- Rode isto no painel do Supabase: SQL Editor -> New query -> cole e execute.

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  prize_emoji text,
  prize_name text,
  prize_hype text,
  photo_url text,
  lat double precision,
  lon double precision,
  accuracy double precision,
  ip text,
  user_agent text,
  os text,
  browser text,
  device text,
  language text,
  timezone text,
  screen text,
  consent boolean not null default false
);

create table if not exists quiz_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  total_ms integer,
  errors integer
);

-- RLS ligado por padrão no Supabase. As funções do Netlify usam a
-- "service role key", que ignora RLS -- então não é obrigatório criar
-- políticas aqui. Mesmo assim, deixamos RLS ativo para que, se alguém
-- um dia usar a "anon key" direto do navegador, nada vaze por engano.
alter table entries enable row level security;
alter table quiz_scores enable row level security;

-- Bucket de Storage "photos" NÃO é mais necessário: a foto agora vem
-- direto da URL pública do avatar do Google (avatar_url do login OAuth),
-- sem precisar fazer upload/hospedar a imagem no Supabase.
