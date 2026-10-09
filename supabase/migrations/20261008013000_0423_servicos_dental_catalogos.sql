-- SERVIÇOS DENTAL ↔ CATÁLOGOS
--
-- `calendar_event_types` continua sendo o serviço: duração, preço, lembretes
-- e regras de agenda permanecem numa única fonte. Esta migration só acrescenta
-- a categoria Dental e as duas relações N:N que a recepção precisa consultar.

alter table public.calendar_event_types
  add column if not exists dental_category_id uuid
  references public.dental_service_categories(id) on delete restrict;

create index if not exists calendar_event_types_dental_category_idx
  on public.calendar_event_types (organization_id, dental_category_id)
  where dental_category_id is not null;

create table if not exists public.dental_service_professional_types (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null references public.calendar_event_types(id) on delete cascade,
  professional_type_id uuid not null references public.dental_professional_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (event_type_id, professional_type_id)
);
create index if not exists dental_service_professional_types_org_service_idx
  on public.dental_service_professional_types (organization_id, event_type_id);
create index if not exists dental_service_professional_types_org_type_idx
  on public.dental_service_professional_types (organization_id, professional_type_id);

create table if not exists public.dental_service_locations (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null references public.calendar_event_types(id) on delete cascade,
  location_id uuid not null references public.dental_locations(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (event_type_id, location_id)
);
create index if not exists dental_service_locations_org_service_idx
  on public.dental_service_locations (organization_id, event_type_id);
create index if not exists dental_service_locations_org_location_idx
  on public.dental_service_locations (organization_id, location_id);

do $$
declare t text;
begin
  foreach t in array array['dental_service_professional_types', 'dental_service_locations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation_%I_all on public.%I', t, t);
    execute format($f$ create policy tenant_isolation_%I_all on public.%I for all using (organization_id in (select public.fn_user_org_ids()) or public.fn_is_platform_admin()) with check (public.fn_is_platform_admin() or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'manager'))) $f$, t, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

comment on column public.calendar_event_types.dental_category_id is
  'Categoria administrativa Dental. Nullable para preservar os tipos legados; novos serviços Dental devem escolher uma categoria cadastrada.';
comment on table public.dental_service_professional_types is
  'Tipos de profissional permitidos para cada serviço Dental. Mais de um por serviço.';
comment on table public.dental_service_locations is
  'Locais permitidos para cada serviço Dental. Mais de um por serviço.';
