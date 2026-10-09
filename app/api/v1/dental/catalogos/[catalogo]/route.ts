import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CATALOGOS = {
  categorias: { table: "dental_service_categories", label: "Categoria" },
  "tipos-profissionais": { table: "dental_professional_types", label: "Tipo de profissional" },
  locais: { table: "dental_locations", label: "Local" },
} as const;

type Catalogo = keyof typeof CATALOGOS;

const createSchema = z.object({ name: z.string().trim().min(2).max(80) });
const renameSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(80) });
const deactivateSchema = z.object({ id: z.string().uuid() });

function resolveCatalogo(raw: string): Catalogo | null {
  return raw in CATALOGOS ? (raw as Catalogo) : null;
}

function dadosDoContexto(context: { params: Promise<{ catalogo: string }> }) {
  return context.params.then(({ catalogo }) => resolveCatalogo(catalogo));
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ catalogo: string }> },
): Promise<Response> {
  const requestId = req.headers.get("x-request-id") ?? undefined;
  const autorizado = await requireRole("viewer", { requestId, resource: "dental_catalogs" });
  if (!autorizado.ok) return autorizado.response;

  const catalogo = await dadosDoContexto(context);
  if (!catalogo) return fail("not_found", "Catálogo Dental não encontrado.", 404, { requestId });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(CATALOGOS[catalogo].table)
    .select("id, name, is_active, position")
    .eq("organization_id", autorizado.org.orgId)
    .order("is_active", { ascending: false })
    .order("position")
    .order("name");

  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok(data ?? [], { requestId });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ catalogo: string }> },
): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = req.headers.get("x-request-id") ?? undefined;
  const autorizado = await requireRole("manager", { requestId, resource: "dental_catalogs" });
  if (!autorizado.ok) return autorizado.response;
  const catalogo = await dadosDoContexto(context);
  if (!catalogo) return fail("not_found", "Catálogo Dental não encontrado.", 404, { requestId });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("validation_failed", "Informe um nome entre 2 e 80 caracteres.", 422, { requestId });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(CATALOGOS[catalogo].table)
    .insert({ organization_id: autorizado.org.orgId, name: parsed.data.name })
    .select("id, name, is_active, position")
    .single();

  if (error) {
    if (error.code === "23505") return fail("conflict", `${CATALOGOS[catalogo].label} já cadastrada nesta clínica.`, 409, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  await audit({
    action: "dental.catalogo_criado",
    actorUserId: autorizado.user.id,
    organizationId: autorizado.org.orgId,
    resourceType: CATALOGOS[catalogo].table,
    resourceId: data.id,
    requestId,
    metadata: { catalogo, nome: data.name },
  });
  return ok(data, { requestId, status: 201 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ catalogo: string }> },
): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = req.headers.get("x-request-id") ?? undefined;
  const autorizado = await requireRole("manager", { requestId, resource: "dental_catalogs" });
  if (!autorizado.ok) return autorizado.response;
  const catalogo = await dadosDoContexto(context);
  if (!catalogo) return fail("not_found", "Catálogo Dental não encontrado.", 404, { requestId });

  const parsed = renameSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("validation_failed", "Informe um nome entre 2 e 80 caracteres.", 422, { requestId });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(CATALOGOS[catalogo].table)
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("organization_id", autorizado.org.orgId)
    .select("id, name, is_active, position")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return fail("conflict", `${CATALOGOS[catalogo].label} já cadastrada nesta clínica.`, 409, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  if (!data) return fail("not_found", `${CATALOGOS[catalogo].label} não encontrada.`, 404, { requestId });
  await audit({
    action: "dental.catalogo_renomeado",
    actorUserId: autorizado.user.id,
    organizationId: autorizado.org.orgId,
    resourceType: CATALOGOS[catalogo].table,
    resourceId: data.id,
    requestId,
    metadata: { catalogo, nome: data.name },
  });
  return ok(data, { requestId });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ catalogo: string }> },
): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = req.headers.get("x-request-id") ?? undefined;
  const autorizado = await requireRole("manager", { requestId, resource: "dental_catalogs" });
  if (!autorizado.ok) return autorizado.response;
  const catalogo = await dadosDoContexto(context);
  if (!catalogo) return fail("not_found", "Catálogo Dental não encontrado.", 404, { requestId });

  const parsed = deactivateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("validation_failed", "Cadastro inválido.", 422, { requestId });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(CATALOGOS[catalogo].table)
    .update({ is_active: false })
    .eq("id", parsed.data.id)
    .eq("organization_id", autorizado.org.orgId)
    .select("id, name")
    .maybeSingle();

  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", `${CATALOGOS[catalogo].label} não encontrada.`, 404, { requestId });
  await audit({
    action: "dental.catalogo_desativado",
    actorUserId: autorizado.user.id,
    organizationId: autorizado.org.orgId,
    resourceType: CATALOGOS[catalogo].table,
    resourceId: data.id,
    requestId,
    metadata: { catalogo, nome: data.name },
  });
  return ok(data, { requestId });
}
