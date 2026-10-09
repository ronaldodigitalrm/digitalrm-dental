import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

import { CadastrosDentalClient, type CatalogItem } from "./_client";

export const dynamic = "force-dynamic";

export default async function CadastrosDentalPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const supabase = await createClient();
  const [categorias, tiposProfissionais, locais] = await Promise.all([
    supabase.from("dental_service_categories").select("id, name, is_active, position").eq("organization_id", activeOrg.orgId).order("is_active", { ascending: false }).order("position").order("name"),
    supabase.from("dental_professional_types").select("id, name, is_active, position").eq("organization_id", activeOrg.orgId).order("is_active", { ascending: false }).order("position").order("name"),
    supabase.from("dental_locations").select("id, name, is_active, position").eq("organization_id", activeOrg.orgId).order("is_active", { ascending: false }).order("position").order("name"),
  ]);

  return (
    <CadastrosDentalClient
      categorias={(categorias.data ?? []) as CatalogItem[]}
      tiposProfissionais={(tiposProfissionais.data ?? []) as CatalogItem[]}
      locais={(locais.data ?? []) as CatalogItem[]}
      podeEditar={(user.is_platform_admin && !user.support) || ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
      erros={[categorias.error?.message, tiposProfissionais.error?.message, locais.error?.message].filter(Boolean) as string[]}
    />
  );
}
