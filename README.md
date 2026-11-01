# DMM Montagens

Site responsivo de apresentação e agendamento, com painel de administração. O site público pode ser hospedado como arquivos estáticos; o Supabase guarda a agenda compartilhada, controla os acessos da DMM Montagens e executa as funções que enviam as notificações por e-mail.

## O que o projeto oferece

- Página pública com serviços, galeria demonstrativa, apresentação, área de atendimento, orçamento e contato.
- Consulta dos horários livres antes do pedido. Horários ocupados não podem ser reservados novamente, mesmo se duas pessoas enviarem o pedido ao mesmo tempo.
- Pedidos salvos no Supabase, com status inicial **Aguardando confirmação**.
- E-mails para a DMM Montagens e para o cliente quando chega um pedido. A mensagem informa que o horário depende de confirmação.
- Painel privado em `#admin`: login, calendário mensal, agenda do dia e atualização do status (aguardando, confirmado, concluído ou cancelado).
- Dados de clientes protegidos por políticas do Supabase: visitantes não podem consultar a agenda nem os dados de outros clientes.

## Antes de publicar

Os contatos, as fotos de trabalhos reais, os bairros e a integração dependem de informações da DMM Montagens. A galeria atual usa fotos ilustrativas e está identificada como tal. Preencha [config.js](./config.js) com o telefone WhatsApp em formato internacional só com números (por exemplo `5511999999999`), o e-mail público e a área atendida.

Não publique informações de conexão inventadas nem coloque a chave **service role** do Supabase no site. O site recebe somente a URL do projeto e a chave pública **anon/publishable**; a chave privada fica nos segredos das Edge Functions.

## Configurar Supabase e agenda

1. Crie um projeto em [supabase.com](https://supabase.com/) e abra o **SQL Editor**.
2. Execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) para criar as tabelas, índices, permissões e políticas de segurança.
3. No Supabase, crie o usuário administrador da DMM Montagens em **Authentication → Users → Add user** e use um e-mail controlado pela empresa. Copie o UUID desse usuário.
4. No SQL Editor, conceda acesso somente a esse usuário:

   ```sql
   insert into public.admins (user_id) values ('UUID-DO-USUARIO-ADMINISTRADOR');
   ```

   Não habilite cadastro público para clientes. O painel usa as contas cadastradas pelo administrador.
5. Instale a CLI do Supabase, entre na conta e vincule a pasta do projeto ao identificador exibido em **Project Settings → General**:

   ```powershell
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase secrets set RESEND_API_KEY="SUA_CHAVE_RESEND" ADMIN_EMAIL="EMAIL_DA_DMM_MONTAGENS" EMAIL_FROM='DMM Montagens <agenda@seudominio.com>'
   npx supabase functions deploy booking-slots --no-verify-jwt
   npx supabase functions deploy create-booking --no-verify-jwt
   ```

   As funções usam as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` disponibilizadas pelo próprio ambiente Supabase. O parâmetro `--no-verify-jwt` é necessário para a solicitação pública do cliente; a função valida os campos, protege a chave privada no servidor e não retorna dados pessoais da agenda.
6. Crie/verifique um domínio de envio no [Resend](https://resend.com/) e configure nele o remetente autorizado no segredo `EMAIL_FROM`. O `ADMIN_EMAIL` recebe novos pedidos; o e-mail informado pelo cliente recebe a confirmação de recebimento. A DMM Montagens ainda precisa confirmar o horário.
7. Copie a URL do projeto e a chave **anon/publicável** em `config.js`. Complete telefone e região. **Nunca copie a chave service role para esse arquivo.**
8. Abra `index.html` em um navegador para conferir a apresentação. Para testar as Edge Functions localmente, configure e inicie o Supabase CLI para a instância local, ou publique as funções no projeto Supabase de teste.
9. Cadastre uma solicitação de teste e confirme que ela aparece em `#admin`, que dois pedidos não ocupam o mesmo horário e que as mensagens chegam a ambas as caixas de e-mail. Exclua os dados de teste antes de abrir a agenda ao público.

O envio de e-mail usa o remetente/domínio verificado pelo Resend. Se o envio falhar após a gravação do pedido, o site avisa o cliente; a solicitação permanece salva e visível no painel, com indicação registrada na coluna `notifications_sent`.

## Publicar o site

Este diretório é um projeto separado do repositório Brainrot Pets. Para publicar sem alterar o jogo, crie um repositório Git próprio para DMM Montagens, envie **o conteúdo desta pasta** para ele e ative o GitHub Pages apontando para a branch principal e a raiz. O site estático não contém servidor: agendamentos e e-mails dependem do projeto Supabase configurado acima.

Use HTTPS no domínio do site e mantenha o projeto Supabase e a conta Resend sob controle da DMM Montagens. A agenda deste painel é compartilhada entre dispositivos autorizados. Ainda não existe sincronização automática com Google Calendar nem lembrete automático; os horários aparecem diretamente neste painel.

## Personalizar dias e horários

O exemplo atende de segunda a sábado com intervalos entre 08:00 e 16:30, limitando pedidos aos próximos 90 dias. Se o horário de trabalho mudar, atualize os mesmos horários nas funções `booking-slots` e `create-booking`. A reserva em banco impede conflito; cancelamentos liberam o horário.
