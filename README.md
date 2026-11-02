# DMM Montagens

Site responsivo de apresentação e agendamento, com painel de administração. O site público pode ser hospedado como arquivos estáticos; o Supabase guarda a agenda compartilhada, controla os acessos da DMM Montagens e executa as funções que enviam as notificações por e-mail.

## O que o projeto oferece

- Página direta para divulgar montagem de móveis, armários planejados e desmontagem/remontagem.
- Consulta de horários livres considerando a duração escolhida para cada serviço e os bloqueios da agenda.
- Pedidos salvos no Supabase, com status inicial **Aguardando confirmação**.
- E-mails para a DMM Montagens e para o cliente quando chega um pedido. A mensagem informa que o horário depende de confirmação.
- Painel privado em `/gestao/`: login, calendário mensal, agenda do dia, atualização do status e bloqueio de dias ou horários.
- Dados de clientes protegidos por políticas do Supabase: visitantes não podem consultar a agenda nem os dados de outros clientes.

## Antes de publicar

Os contatos, os bairros e a integração dependem de informações da DMM Montagens. O carrossel usa 10 fotos ilustrativas do Pexels de profissionais trabalhando com ferramentas e montagem; elas não são registros de serviços feitos pela equipe. Os links de crédito levam às fontes. Trocar por fotos próprias deixa a divulgação mais autêntica. Preencha [config.js](./config.js) com o telefone WhatsApp em formato internacional só com números (por exemplo `5511999999999`), o e-mail público e a área atendida.

Não publique informações de conexão inventadas nem coloque a chave **service role** do Supabase no site. O site recebe somente a URL do projeto e a chave pública **anon/publishable**; a chave privada fica nos segredos das Edge Functions.

## Configurar Supabase e agenda

1. Crie um projeto em [supabase.com](https://supabase.com/) e abra o **SQL Editor**.
2. Execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) para criar as tabelas, índices, permissões e políticas de segurança. Se o projeto já tinha a agenda antiga, execute [`supabase/upgrade-schedule-blocks.sql`](./supabase/upgrade-schedule-blocks.sql) no SQL Editor para adicionar os bloqueios, tempos por serviço e proteção contra sobreposição.
3. No Supabase, crie o usuário administrador da DMM Montagens em **Authentication → Users → Add user** e use um e-mail controlado pela empresa. Escolha uma senha exclusiva e forte; as credenciais não ficam gravadas no site. Copie o UUID desse usuário.
4. No SQL Editor, conceda acesso somente a esse usuário:

   ```sql
   insert into public.admins (user_id) values ('UUID-DO-USUARIO-ADMINISTRADOR');
   ```

   Não habilite cadastro público para clientes. O painel usa as contas cadastradas pelo administrador.
5. Execute a CLI do Supabase, entre na conta e vincule a pasta do site ao projeto:

   ```powershell
   npx supabase login
   npx supabase link --project-ref wgpzzzazmpffbrpqlcam
   npx supabase secrets set RESEND_API_KEY="SUA_CHAVE_RESEND" ADMIN_EMAIL="EMAIL_DA_DMM_MONTAGENS" EMAIL_FROM="agenda@SEU_DOMINIO_VERIFICADO" --project-ref wgpzzzazmpffbrpqlcam
   npx supabase functions deploy booking-slots --no-verify-jwt
   npx supabase functions deploy create-booking --no-verify-jwt
   ```

   Ao alterar a disponibilidade da agenda, publique novamente as duas funções para que bloqueios sejam aplicados tanto na consulta quanto no envio do pedido.

   As funções usam as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` disponibilizadas pelo próprio ambiente Supabase. O parâmetro `--no-verify-jwt` é necessário para a solicitação pública do cliente; a função valida os campos, protege a chave privada no servidor e não retorna dados pessoais da agenda. `create-booking` salva o pedido mesmo se faltar configuração de e-mail ou o Resend falhar; o cliente recebe um alerta com o serviço, a data, o horário e os detalhes informados.

   Se o site mostrar **“Requested function was not found”** ou erro 404 ao consultar horários, publique as duas funções acima: esse erro é de publicação, não das tabelas. Depois do deploy, `booking-slots` consulta as durações, bloqueios e pedidos pendentes/confirmados salvos no banco. Se a função responder erro 500, confira se executou o SQL de atualização e se os segredos do Supabase estão configurados.
6. Crie uma chave de API e verifique um domínio de envio no [Resend](https://resend.com/). Configure `RESEND_API_KEY`, `EMAIL_FROM` e `ADMIN_EMAIL` **como segredos do projeto Supabase** usando o comando acima. Em `EMAIL_FROM`, use só um endereço remetente que exista no domínio verificado, por exemplo `agenda@seudominio.com` (substitua pelo endereço real); não inclua aspas literais no valor. Também é aceito `DMM Montagens <agenda@seudominio.com>`. Não use Gmail pessoal como remetente: o Resend exige um domínio próprio verificado. O valor `DDM Montagens guilherme.glsantos@gmail.com"` está mal formatado (faltam `< >` e sobra uma aspa) e o endereço Gmail não serve como remetente de produção. Nunca cole a chave do Resend em `config.js`, no GitHub ou no chat: ela não é uma configuração do site público. Para conferir se os nomes dos segredos foram cadastrados, rode `npx supabase secrets list --project-ref wgpzzzazmpffbrpqlcam`; essa listagem mostra nomes, não os valores. São enviados dois e-mails separados: um para o cliente e outro para a equipe. Se houver erro, o pedido continua salvo e a versão atualizada da função informa o motivo retornado pelo Resend ou o segredo que está faltando. A DMM Montagens ainda precisa confirmar o horário.
7. Copie a URL do projeto e a chave **anon/publicável** em `config.js`. Complete telefone e região. **Nunca copie a chave service role para esse arquivo.**
8. Abra `index.html` em um navegador para conferir a apresentação. Para testar as Edge Functions localmente, configure e inicie o Supabase CLI para a instância local, ou publique as funções no projeto Supabase de teste.
9. Cadastre uma solicitação de teste e confirme que ela aparece em `/gestao/`, que os bloqueios e as durações evitam horários sobrepostos e que as mensagens chegam a ambas as caixas de e-mail. Exclua os dados de teste antes de abrir a agenda ao público.

O envio de e-mail usa o remetente/domínio verificado pelo Resend. Se o envio falhar após a gravação do pedido, o site avisa o cliente; a solicitação permanece salva e visível no painel, com indicação registrada na coluna `notifications_sent`. Em `/gestao/`, configure a duração dos serviços em intervalos de 30 minutos (padrões: 90 minutos para móveis em geral/outros e 180 para planejados/desmontagem), bloqueie dias ou horários e confirme os pedidos manualmente. O botão **Exportar semana para agenda (.ics)** baixa os atendimentos confirmados de segunda a domingo, considerando a data selecionada no calendário. Importe o arquivo `.ics` no Google Calendar, Outlook ou outro aplicativo de agenda. Os tempos de pedidos existentes são preservados mesmo que a estimativa de um serviço mude depois.

## Publicar o site

Este diretório é um projeto separado do repositório Brainrot Pets. Para publicar sem alterar o jogo, crie um repositório Git próprio para DMM Montagens, envie **o conteúdo desta pasta** para ele e ative o GitHub Pages apontando para a branch principal e a raiz. O site estático não contém servidor: agendamentos e e-mails dependem do projeto Supabase configurado acima.

Use HTTPS no domínio do site e mantenha o projeto Supabase e a conta Resend sob controle da DMM Montagens. A agenda deste painel é compartilhada entre dispositivos autorizados. Ainda não existe sincronização automática com Google Calendar; quando aceitar um serviço, confirme o pedido manualmente e registre-o na agenda que já usa.

## Personalizar dias e horários

O exemplo atende de segunda a sábado, com início de serviço a cada 30 minutos entre 08:00 e 16:30 e término até 18:00; os pedidos ficam limitados aos próximos 90 dias. Para mudar o expediente, atualize os intervalos correspondentes nas funções `booking-slots` e `create-booking`. O banco bloqueia atendimentos que se sobrepõem, inclusive se dois clientes pedirem ao mesmo tempo; cancelar um pedido libera o horário.
