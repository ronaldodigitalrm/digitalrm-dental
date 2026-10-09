"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { MapPin, Tag, Trash, UserCircle } from "@/lib/ui/icons";

export type CatalogItem = { id: string; name: string; is_active: boolean; position: number };
type CatalogKey = "categorias" | "tipos-profissionais" | "locais";

type CatalogDefinition = {
  key: CatalogKey;
  title: string;
  singular: string;
  description: string;
  examples: string;
  icon: typeof Tag;
  items: CatalogItem[];
};

export function CadastrosDentalClient({
  categorias,
  tiposProfissionais,
  locais,
  podeEditar,
  erros,
}: {
  categorias: CatalogItem[];
  tiposProfissionais: CatalogItem[];
  locais: CatalogItem[];
  podeEditar: boolean;
  erros: string[];
}) {
  const catalogs: CatalogDefinition[] = [
    { key: "categorias", title: "Categorias de serviço", singular: "categoria", description: "Agrupe seus serviços para organizar a operação e os relatórios.", examples: "Ex.: Prevenção, Cirurgia, Implantodontia", icon: Tag, items: categorias },
    { key: "tipos-profissionais", title: "Tipos de profissional", singular: "tipo de profissional", description: "Descreva especialidades e funções, sem confundir com os membros da equipe.", examples: "Ex.: Dentista clínico, Implantodontista, Higienista", icon: UserCircle, items: tiposProfissionais },
    { key: "locais", title: "Locais de atendimento", singular: "local", description: "Cadastre unidades, salas e consultórios que a recepção pode oferecer.", examples: "Ex.: Unidade Centro, Consultório 2, Sala de raio-X", icon: MapPin, items: locais },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-7 sm:px-8 lg:py-10">
      <header className="border-b border-border pb-8">
        <p className="text-sm font-medium text-accent">Central Dental</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Cadastros da clínica</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
          Prepare os menus que a recepção e os Serviços usarão. Estes cadastros são administrativos e não incluem prontuário ou informação clínica.
        </p>
      </header>

      {erros.length ? (
        <div role="alert" className="border-l-4 border-error bg-error-bg px-4 py-3 text-sm text-error-fg">
          Não foi possível carregar um dos catálogos. Atualize a página; se persistir, verifique se a atualização do banco foi aplicada.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3" aria-label="Catálogos Dental">
        {catalogs.map((catalog) => <CatalogCard key={catalog.key} catalog={catalog} podeEditar={podeEditar} />)}
      </section>

      <aside className="border-l-4 border-accent bg-surface-elevated px-5 py-4 text-sm leading-6 text-text-muted">
        Primeiro cadastre estes três vocabulários. Em seguida, em <strong className="font-medium text-text">Serviços</strong>, cada serviço poderá selecionar mais de um tipo profissional e mais de um local onde pode ser realizado.
      </aside>
    </main>
  );
}

function CatalogCard({ catalog, podeEditar }: { catalog: CatalogDefinition; podeEditar: boolean }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const Icon = catalog.icon;

  async function execute(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    try {
      await action();
      toast.success(success);
      setName("");
      router.refresh();
    } catch (error) {
      showApiError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex min-h-[30rem] flex-col border border-border bg-surface" aria-labelledby={`${catalog.key}-heading`}>
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><Icon className="size-5" weight="bold" /></span>
          <Badge variant="neutral">{catalog.items.filter((item) => item.is_active).length} ativos</Badge>
        </div>
        <h2 id={`${catalog.key}-heading`} className="mt-4 text-lg font-semibold text-text">{catalog.title}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-text-muted">{catalog.description}</p>
      </div>

      <div className="flex-1 px-5 py-4">
        {catalog.items.length ? (
          <ul className="divide-y divide-border">
            {catalog.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{item.name}</span>
                {item.is_active ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>}
                {podeEditar && item.is_active ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Desativar ${item.name}`}
                    disabled={saving}
                    onClick={() => {
                      if (window.confirm(`Desativar ${item.name}? Ela não será apagada do histórico.`)) {
                        void execute(() => apiClient.delete(`/api/v1/dental/catalogos/${catalog.key}`, { id: item.id }), `${catalog.singular} desativada.`);
                      }
                    }}
                  ><Trash aria-hidden="true" /></Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="py-8 text-sm leading-6 text-text-muted">Ainda não há {catalog.title.toLowerCase()}. Comece pelo primeiro item.</p>}
      </div>

      <div className="border-t border-border bg-surface-elevated px-5 py-4">
        {podeEditar ? (
          <form className="flex gap-2" onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) void execute(() => apiClient.post(`/api/v1/dental/catalogos/${catalog.key}`, { name: name.trim() }), `${catalog.singular} cadastrada.`);
          }}>
            <label className="sr-only" htmlFor={`${catalog.key}-novo`}>Nova {catalog.singular}</label>
            <input id={`${catalog.key}-novo`} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required placeholder={catalog.examples} className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 text-sm text-text outline-hidden placeholder:text-text-subtle focus:border-accent" />
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando" : "Adicionar"}</Button>
          </form>
        ) : <p className="text-sm text-text-muted">Peça a um gerente para alterar este cadastro.</p>}
        <p className="mt-2 text-xs leading-5 text-text-subtle">{catalog.examples}</p>
      </div>
    </section>
  );
}
