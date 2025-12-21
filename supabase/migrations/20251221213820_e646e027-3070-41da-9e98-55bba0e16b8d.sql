-- Inserir webhooks do DizApp usados nas páginas de Disparos
INSERT INTO public.saas_configuracoes (chave, valor, descricao, tipo, categoria) VALUES
-- Webhooks DizApp
('webhook_listar_conexoes', 'https://app.dizapp.com.br/listarconexoes', 'Webhook para listar conexões do usuário', 'webhook', 'webhooks'),
('webhook_puxar_lista', 'https://app.dizapp.com.br/puxar-lista', 'Webhook para buscar listas de contatos/grupos', 'webhook', 'webhooks'),
('webhook_upload_media', 'https://app.dizapp.com.br/uploadmedia', 'Webhook para upload de mídias (imagens, vídeos, áudios)', 'webhook', 'webhooks'),
('webhook_gerar_mensagem_ia', 'https://app.dizapp.com.br/gerarmensagem-ia', 'Webhook para gerar mensagens com IA', 'webhook', 'webhooks'),
('webhook_disparo_individual', 'https://app.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120', 'Webhook para disparos individuais', 'webhook', 'webhooks'),
('webhook_disparo_grupo', 'https://app.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120123', 'Webhook para disparos em grupos', 'webhook', 'webhooks')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, descricao = EXCLUDED.descricao;