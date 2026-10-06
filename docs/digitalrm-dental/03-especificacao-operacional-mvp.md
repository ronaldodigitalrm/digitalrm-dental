# Especificação operacional — MVP DigitalRM Dental

**Status:** aprovado para implementação incremental no fork DigitalRM Dental.

## Decisão estrutural

O Dental é um **produto vertical dedicado**, não uma extensão declarativa do DeskcommCRM. A
extensão atual não pode ter tabelas, telas ou regras próprias; este fork pode. Ainda assim, o
módulo reutiliza o núcleo de CRM, inbox, agenda, lembretes, handoff, auditoria e RLS.

| Necessidade do produto | Fonte de verdade | Decisão |
| --- | --- | --- |
| Lead/paciente e histórico comercial | `contacts` + `crm_leads` | Reutilizar; “paciente” é o contato em contexto de clínica. |
| Serviço odontológico | `calendar_event_types` | Reutilizar; ele já traz duração, preço, lembretes, confirmação e janela de agendamento. |
| Profissional | `user_organizations` + disponibilidade da Agenda | Reutilizar; um profissional é uma pessoa da equipe com agenda e disponibilidade. |
| Agendamento | `calendar_appointments` | Reutilizar; já liga contato, conversa, tipo de serviço, responsável, status e Google Calendar. |
| Vínculo específico Dental | `dental_appointment_details` | Criar apenas para associar um agendamento a serviço/profissional sem tocar no prontuário. |
| IA e transbordo humano | `ai_agents`, inbox e regras existentes | Configurar depois que o fluxo administrativo estiver utilizável. |

## Escopo do primeiro incremento

1. Renomear a experiência administrativa para “Serviços” e “Profissionais” onde o produto Dental
   apresenta agenda, sem quebrar rotas do núcleo.
2. Criar configuração Dental por organização para declarar se a equipe usa a nomenclatura
   “Paciente” e “Profissional”.
3. Criar tipos de serviço odontológico sobre o catálogo nativo de `calendar_event_types`.
4. Usar profissionais da equipe já existente como responsáveis de agenda.
5. Criar agendamentos usando `calendar_appointments`, com os status já suportados:
   aguardando confirmação, confirmado, cancelado, realizado e não compareceu.
6. Ligar o agendamento a CRM e conversa pela infraestrutura existente.

## Fora deste incremento

- Prontuário, anamnese, odontograma, diagnóstico, radiografia, prescrição e plano de tratamento.
- Dados de saúde no `notes`, `description`, tags ou campos personalizados.
- Recomendação clínica pelo agente de IA.
- Cobrança, convênios e prontuário financeiro.

## Fluxo administrativo

```text
Contato chega pelo WhatsApp
        ↓
CRM cria/atualiza lead e contato
        ↓
Recepção ou IA identifica serviço administrativo
        ↓
Consulta disponibilidade do profissional
        ↓
Cria calendar_appointment
        ↓
Confirmação e lembretes existentes
        ↓
Recepção marca realizado / cancelado / não compareceu
        ↓
CRM e painel comercial medem o resultado
```

## Segurança e LGPD

- Todas as escritas permanecem isoladas por `organization_id`, RLS e papel atual.
- O agente recebe catálogo, disponibilidade e estado administrativo; nunca conteúdo clínico.
- A transição para humano continua obrigatória em dúvida clínica, reclamação, pedido de falar com
  pessoa ou informação que não esteja no catálogo aprovado.
- Alterações operacionais serão auditadas pelo mecanismo já existente.

## Testes de aceite

1. Uma organização A não lê nem altera dados de agenda/serviços da organização B.
2. Recepção cria serviço, define profissional e marca contato fictício.
3. Agendamento ocupa horário e aparece no CRM/agenda do profissional.
4. Cancelamento, confirmação, realização e ausência preservam histórico.
5. Uma solicitação de conteúdo clínico é encaminhada para humano; não é persistida como nota.
6. A tela funciona em navegador com ambiente Dev e dados fictícios.

## Entregas em ordem

| Fase | Resultado verificável |
| --- | --- |
| 1 — Base Dental | Preset, terminologia e catálogo de serviços sobre Agenda existente. |
| 2 — Agenda da clínica | Profissional, disponibilidade e marcação administrativa funcionando. |
| 3 — Recepção IA | Prompt, catálogo aprovado, limites e handoff humano. |
| 4 — Pós-agendamento | Confirmação, lembretes, follow-up e pesquisa de satisfação. |
| 5 — Comercial | Dashboard de origem, agendamentos, comparecimento e pendências. |

