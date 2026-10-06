import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarCheck,
  CalendarDots,
  CalendarPlus,
  CheckCircle,
  UsersThree,
} from "@/lib/ui/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Central Dental" };

type SetupStep = {
  title: string;
  description: string;
  href: string;
  action: string;
  ready: boolean;
  icon: typeof CalendarDots;
};

/**
 * Central operacional do produto Dental.
 *
 * Ela não cria cópias de pacientes, profissionais nem de agenda. A experiência
 * fala a linguagem de uma clínica; os dados continuam nas fontes do núcleo:
 * contatos/CRM, equipe/disponibilidade e tipos/agendamentos de calendário.
 */
export default async function DentalPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const supabase = await createClient();
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);

  const [servicos, profissionais, agendamentosDeHoje, pacientes] = await Promise.all([
    supabase
      .from("calendar_event_types")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrg.orgId)
      .eq("is_active", true),
    supabase
      .from("user_organizations")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", activeOrg.orgId)
      .is("revoked_at", null),
    supabase
      .from("calendar_appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrg.orgId)
      .gte("starts_at", inicioDeHoje.toISOString())
      .in("status", ["pending", "confirmed"]),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrg.orgId),
  ]);

  const quantidadeDeServicos = servicos.count ?? 0;
  const quantidadeDeProfissionais = profissionais.count ?? 0;
  const quantidadeDeHoje = agendamentosDeHoje.count ?? 0;
  const quantidadeDePacientes = pacientes.count ?? 0;
  const podeConfigurar =
    (user.is_platform_admin && !user.support) || ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;

  const passos: SetupStep[] = [
    {
      title: "Serviços da clínica",
      description:
        "Cadastre avaliação, retorno e procedimentos com duração, preço e lembretes aprovados.",
      href: "/app/settings/tenant/agenda",
      action: quantidadeDeServicos > 0 ? "Revisar serviços" : "Cadastrar serviço",
      ready: quantidadeDeServicos > 0,
      icon: CalendarPlus,
    },
    {
      title: "Profissionais e horários",
      description:
        "Defina quem atende e publique os horários em que cada profissional pode receber pacientes.",
      href: "/app/team?aba=atendimento",
      action: quantidadeDeProfissionais > 0 ? "Organizar horários" : "Adicionar profissional",
      ready: quantidadeDeProfissionais > 0,
      icon: UsersThree,
    },
    {
      title: "Agenda de pacientes",
      description:
        "Marque, confirme, remarque ou registre ausência sem tirar a recepção da conversa.",
      href: "/app/agenda",
      action: "Abrir agenda",
      ready: quantidadeDeHoje > 0,
      icon: CalendarCheck,
    },
  ];

  const proximaAcao = passos.find((passo) => !passo.ready) ?? passos[2];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-7 sm:px-8 lg:py-10">
      <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-accent">
            <span className="grid size-8 place-items-center rounded-full bg-accent-soft">
              <CalendarDots aria-hidden="true" className="size-4" weight="bold" />
            </span>
            DigitalRM Dental
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            A recepção enxerga o próximo passo. A clínica preserva o foco no paciente.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-text-muted">
            Central administrativa para organizar os contatos que chegam, transformar interesse em
            horário e acompanhar o que precisa de retorno — sem registrar informação clínica.
          </p>
        </div>

        <section className="border-l-4 border-accent bg-surface-elevated px-5 py-4" aria-label="Próxima ação">
          <p className="text-sm font-medium text-text-muted">Próxima ação</p>
          <p className="mt-1 text-lg font-semibold text-text">{proximaAcao.title}</p>
          <Button asChild size="sm" className="mt-4">
            <Link href={proximaAcao.href}>{proximaAcao.action}</Link>
          </Button>
        </section>
      </header>

      <section aria-label="Resumo da operação" className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <Metric label="Serviços ativos" value={quantidadeDeServicos} detail="o que a recepção pode oferecer" />
        <Metric label="Profissionais" value={quantidadeDeProfissionais} detail="membros da equipe com agenda" />
        <Metric label="Agenda de hoje" value={quantidadeDeHoje} detail="aguardando ou confirmados" />
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text">Preparar a operação</h2>
              <p className="mt-1 text-sm text-text-muted">Conclua nesta ordem para a recepção começar a agendar.</p>
            </div>
            <Badge variant="neutral">{passos.filter((passo) => passo.ready).length}/3 preparados</Badge>
          </div>

          <ol className="divide-y divide-border border-y border-border">
            {passos.map((passo, index) => {
              const Icon = passo.icon;
              return (
                <li key={passo.title} className="grid gap-4 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
                  <div className="grid size-10 place-items-center rounded-full bg-surface-elevated text-accent">
                    {passo.ready ? <CheckCircle className="size-5" weight="fill" /> : <Icon className="size-5" weight="bold" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-text">{index + 1}. {passo.title}</h3>
                      <Badge variant={passo.ready ? "success" : "warning"}>
                        {passo.ready ? "Pronto" : "Pendente"}
                      </Badge>
                    </div>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-text-muted">{passo.description}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm" className="justify-self-start sm:justify-self-end">
                    <Link href={passo.href}>{passo.action}</Link>
                  </Button>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="self-start border border-border bg-surface p-5">
          <h2 className="font-semibold text-text">Limite seguro</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Esta central opera dados administrativos: contato, serviço, agenda e retorno.
          </p>
          <p className="mt-3 text-sm leading-6 text-text-muted">
            Prontuário, anamnese, diagnóstico, imagens e prescrições ficam fora deste produto.
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-2xl font-semibold tracking-tight text-text">{quantidadeDePacientes}</p>
            <p className="text-sm text-text-muted">contatos no CRM</p>
          </div>
        </aside>
      </section>

      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text">Recepção assistida por IA</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          A próxima fase conecta um agente ao catálogo aprovado, à disponibilidade e às regras de
          transferência para humano. Até ela estar configurada, a equipe continua usando o Inbox
          e a Agenda normalmente.
        </p>
        <Button asChild variant="link" className="mt-3">
          <Link href="/app/ai">Abrir configuração de agentes</Link>
        </Button>
        {!podeConfigurar ? (
          <p className="mt-3 text-sm text-text-muted">Peça a um gerente para editar serviços, equipe e horários.</p>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="bg-surface px-5 py-5 sm:px-6">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{value}</p>
      <p className="mt-1 text-xs leading-5 text-text-muted">{detail}</p>
    </div>
  );
}
