-- RBAC and server-side sessions. This migration is additive: existing client rows are preserved.
CREATE TABLE IF NOT EXISTS public.staff_users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username text NOT NULL,
  username_normalized text NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  phone text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'senior', 'team_leader', 'admin')),
  leader_id text,
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_id text
);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_hash text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_to_id text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_to_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_by_id text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_by_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by_id text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by_name text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_by_id text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_by_name text;

CREATE INDEX IF NOT EXISTS staff_users_leader_id_idx ON public.staff_users (leader_id);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON public.auth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS clients_assigned_to_id_idx ON public.clients (assigned_to_id);

-- The application is the only writer. Do not expose password hashes or session tokens through anon APIs.
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
