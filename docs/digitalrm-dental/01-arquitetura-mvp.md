# Arquitetura do MVP — DigitalRM Dental

**Status:** aprovado como direção inicial de produto; implementação pendente.

## 1. Decisão

O DigitalRM Dental será um produto independente, derivado do DeskcommCRM, para clínicas
odontológicas. Cada ambiente terá seu próprio repositório, domínio, banco Supabase e variáveis
de ambiente. O CRM da agência em `crm.ronaldolabs.com.br` não é ambiente de desenvolvimento nem
origem de dados deste produto.

### Alternativas consideradas

| Alternativa | Decisão | Motivo |
| --- | --- | --- |
| CRM genérico com campos soltos | Não adotar | Rápido no início, mas deixa agenda, serviços e permissões inconsistentes. |
| Produto Dental separado, com módulo administrativo | **Adotar** | Permite uma experiência clara para a clínica e preserva as garantias do CRM base. |
| Prontuário odontológico completo desde o início | Adiar | Exige governança de dados de saúde, controles clínicos e validação jurídica antes de entrar em produção. |

## 2. Problema que o MVP resolve

A clínica já recebe contatos por WhatsApp, mas perde contexto, demora em responder, esquece
retornos e deixa a agenda depender da memória de uma pessoa. O produto organiza o caminho entre
interesse, agendamento, comparecimento e relacionamento posterior.

O resultado prometido é operacional: **agenda mais organizada, melhor aproveitamento dos
interessados existentes e uma experiência mais cuidadosa para o paciente.** Qualquer aumento de
agendamentos deve ser medido como resultado observado, nunca garantido.

## 3. Escopo do MVP

### Incluído

- Caixa de entrada WhatsApp com atendimento humano e agente de IA supervisionado.
- Cadastro de contatos e funil comercial da clínica.
- Catálogo de serviços administrativos: nome, duração estimada, faixa de preço opcional,
  profissional/is e instruções de agendamento.
- Cadastro de profissionais e regras básicas de disponibilidade.
- Agenda administrativa: solicitação, horário proposto, confirmado, concluído, cancelado e
  ausência.
- Confirmações e lembretes configuráveis, com opt-in, limites de envio e transferência para
  humano.
- Registro de origem do lead, histórico de atendimento e motivo de perda/cancelamento.
- Painel inicial: contatos recebidos, agendamentos confirmados, ausências, conversões do funil
  e pendências de retorno.

### Fora do MVP

- Prontuário, anamnese, diagnóstico, odontograma, imagens clínicas, radiografias, prescrições ou
  planos de tratamento clínicos.
- Decisão clínica, triagem médica/odontológica ou recomendação de procedimento pelo agente.
- Cobrança, prontuário financeiro, convênios e emissão fiscal.
- Sincronização bidirecional com softwares clínicos de terceiros.
- Envio automático de prospecção fria por WhatsApp.

## 4. Limite de responsabilidade

O agente pode explicar serviços aprovados pela clínica, coletar dados de contato mínimos,
oferecer horários e encaminhar dúvidas clínicas para uma pessoa. Ele não interpreta sintomas,
não dá orientação de saúde e não lê dados clínicos detalhados.

Informações de saúde são dados pessoais sensíveis. Antes de um módulo clínico existir, será
necessário um desenho próprio de LGPD, revisão com responsável jurídico/odontológico, perfis de
acesso, trilha de auditoria, política de retenção, consentimentos e avaliação de segurança.

## 5. Módulos e fronteiras

```text
WhatsApp / recepção humana
        │
        ▼
Inbox + agente supervisionado ──► CRM e funil
        │                              │
        │                              ▼
        └──────────────► Agenda administrativa ◄── Serviços e profissionais
                                      │
                                      ▼
                         Lembretes, follow-up e painel
```

| Módulo | Responsabilidade | Não faz |
| --- | --- | --- |
| CRM | contatos, oportunidades, origem e histórico comercial | guardar informações clínicas |
| Atendimento | conversar, classificar, repassar para humano e registrar a conversa | decidir conduta de saúde |
| Agenda | propor e confirmar horários administrativos | bloquear agenda clínica sem regra explícita |
| Serviços | catálogo visível à recepção e ao agente | diagnóstico ou plano clínico |
| Profissionais | disponibilidade, especialidade administrativa e agenda | acesso automático ao CRM de outras clínicas |
| Indicadores | medir operação e pendências | prometer aumento de faturamento |

## 6. Papéis de acesso iniciais

| Papel | Pode fazer |
| --- | --- |
| Administrador da clínica | configurar equipe, serviços, agentes, integrações e relatórios. |
| Gestor | acompanhar indicadores, funil, agenda e atribuir atendimento. |
| Recepção | atender conversas, cadastrar contatos, agendar, confirmar e registrar retorno. |
| Profissional | ver apenas a própria agenda administrativa e dados mínimos necessários ao atendimento. |

O agente de IA nunca recebe uma permissão superior à de um atendente. Toda tabela nova que
pertença a uma clínica será tenant-aware (`organization_id`), terá RLS e teste de isolamento
entre organizações.

## 7. Dados iniciais

| Entidade | Dados permitidos no MVP | Observação |
| --- | --- | --- |
| Contato | nome, telefone, e-mail, origem, consentimento e preferências de contato | dados mínimos para relacionamento. |
| Serviço | nome, descrição aprovada, duração, faixa de preço opcional | sem orientação clínica. |
| Profissional | nome, função, especialidade administrativa e disponibilidade | sem credenciais clínicas no MVP. |
| Agendamento | contato, serviço, profissional, data/hora, status, origem e observação administrativa mínima | não usar para diagnóstico. |
| Conversa | mensagens, responsável, intenção, handoff e opt-out | segue retenção e controles do CRM base. |

## 8. Jornada principal

1. A pessoa chega por WhatsApp, formulário ou importação autorizada.
2. A recepção ou agente identifica o interesse e responde dentro das regras aprovadas.
3. O agente apresenta apenas serviços e informações autorizadas; dúvida clínica vira handoff.
4. A pessoa escolhe ou recebe opções de horário.
5. A agenda é confirmada e gera lembretes conforme consentimento.
6. Após o horário, a equipe atualiza o status: concluído, cancelado, ausência ou retorno.
7. O sistema cria tarefas de follow-up e mede o que ficou sem resposta.

## 9. Ambientes

| Ambiente | Finalidade | Dados permitidos |
| --- | --- | --- |
| Local (Mac) | desenvolvimento e testes | somente dados fictícios. |
| Supabase Dev | banco de desenvolvimento compartilhado | somente dados fictícios. |
| Staging | validação antes de produção | dados sintéticos ou autorizados e minimizados. |
| Produção (VPS) | operação de uma clínica | somente após deploy, revisão de segurança e configuração do cliente. |

Não reutilizar a URL, a service role key, o banco ou o Storage do CRM da agência.

## 10. Critérios para a primeira entrega utilizável

- Uma organização de teste consegue criar serviços, profissionais e horários fictícios.
- Uma atendente consegue conduzir um contato de “novo” até “agendado”.
- Um agente consegue sugerir horários e repassar dúvida clínica, sem acessar dados clínicos.
- Um administrador vê pendências de retorno e agenda do dia.
- Não há vazamento entre duas organizações de teste.
- A interface é testada no navegador em banco fresco, além dos testes de código e banco.

## 11. Próximas etapas aprovadas

1. Criar um Supabase exclusivo para desenvolvimento.
2. Configurar o projeto local sem segredos no Git.
3. Mapear as tabelas já existentes e escrever a especificação de `serviços`, `profissionais` e
   `agendamentos` antes de criar migrations.
4. Implementar primeiro o catálogo de serviços e profissionais com RLS e testes.
5. Implementar agenda administrativa e só depois conectar automações de WhatsApp/Google Calendar.
