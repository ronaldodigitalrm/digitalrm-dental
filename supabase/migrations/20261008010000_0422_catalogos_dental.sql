-- CATÁLOGOS DENTAL — os vocabulários administrativos que tornam o serviço
-- configurável por clínica. Não guardam prontuário, anamnese, diagnóstico,
-- imagem ou qualquer dado clínico.
--
-- Esta primeira entrega cria as fontes de verdade. O vínculo N:N entre serviço
-- e tipo/local entra na próxima migration, junto com o formulário de Serviço;
-- assim não existe um seletor que aparente salvar algo que ainda não persiste.

create table if not exists public.dental_service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dental_service_categories_org_name_active_key
  on public.dental_service_categories (organization_id, lower(name))
  where is_active;
create index if not exists dental_service_categories_org_active_idx
  on public.dental_service_categories (organization_id, is_active, position, name);

create table if not exists public.dental_professional_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dental_professional_types_org_name_active_key
  on public.dental_professional_types (organization_id, lower(name))
  where is_active;
create index if not exists dental_professional_types_org_active_idx
  on public.dental_professional_types (organization_id, is_active, position, name);

create table if not exists public.dental_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dental_locations_org_name_active_key
  on public.dental_locations (organization_id, lower(name))
  where is_active;
create index if not exists dental_locations_org_active_idx
  on public.dental_locations (organization_id, is_active, position, name);

-- O mesmo isolamento por organização usado no restante do produto. A API usa
-- service role para ter audit consistente, mas ainda filtra organization_id
-- em toda operação; o acesso direto autenticado continua isolado aqui.
do $$
declare t text;
begin
  foreach t in array array['dental_service_categories', 'dental_professional_types', 'dental_locations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation_%I_all on public.%I', t, t);
    execute format($f$
      create policy tenant_isolation_%I_all on public.%I
        for all
        using (organization_id in (select public.fn_user_org_ids()) or public.fn_is_platform_admin())
        with check (
          public.fn_is_platform_admin()
          or (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'))
        )
    $f$, t, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

do $$
declare t text;
begin
  if exists (select 1 from pg_proc where proname = 'fn_touch_updated_at') then
    foreach t in array array['dental_service_categories', 'dental_professional_types', 'dental_locations'] loop
      execute format('drop trigger if exists trg_%I_touch on public.%I', t, t);
      execute format(
        'create trigger trg_%I_touch before update on public.%I for each row execute function public.fn_touch_updated_at()',
        t, t);
    end loop;
  end if;
end $$;

comment on table public.dental_service_categories is
  'Categorias administrativas de serviços dental (ex.: Prevenção, Cirurgia). Não contém dado clínico.';
comment on table public.dental_professional_types is
  'Tipos de profissional configurados pela clínica (ex.: Implantodontista). Não é a equipe nem um prontuário.';
comment on table public.dental_locations is
  'Locais administrativos onde o serviço pode ocorrer (ex.: Unidade Centro, Consultório 2).';
