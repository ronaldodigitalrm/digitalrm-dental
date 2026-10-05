# Setup local seguro — DigitalRM Dental

## Estado atual

- Repositório local: `~/Claude/DigitalRM-Dental`
- Branch de fundação: `dental/mvp-foundation`
- Repositório remoto: `github.com/ronaldodigitalrm/digitalrm-dental`
- O projeto original permanece separado em `~/Claude/DeskcommCRM`.

## Próximo passo do responsável

Crie no Supabase um projeto exclusivo chamado, por exemplo, **DigitalRM Dental Dev**. Escolha uma
região próxima da operação, guarde a senha em um gerenciador de senhas e não coloque nenhuma chave
em conversa, commit, screenshot ou documento versionado.

Ao terminar, basta informar que o projeto foi criado. A configuração local usará:

- URL do projeto;
- chave pública/anon para o front-end;
- credenciais administrativas apenas em `.env.local` e apenas quando forem realmente necessárias;
- URL de banco para migrations, mantida exclusivamente no ambiente local/seguro.

## Regras antes de rodar a aplicação

1. Use Node 22 e `pnpm`; não use `npm` nem `yarn` neste repositório.
2. Copie o arquivo de exemplo para `.env.local`; nunca versione `.env.local`.
3. Use somente contatos, serviços e agendas fictícios no desenvolvimento.
4. Não conecte WhatsApp real, Google Calendar de cliente ou dados de pacientes no ambiente Dev.
5. Não faça deploy na VPS enquanto a primeira jornada não estiver validada localmente.

## Ordem de desenvolvimento

1. Fundação de documentação e ambiente.
2. Especificação de dados e permissões.
3. Catálogo de serviços e profissionais.
4. Agenda administrativa.
5. Jornada de atendimento e handoff humano.
6. Lembretes/follow-up com consentimento.
7. Indicadores e validação em staging.
8. Deploy separado para a primeira clínica.
