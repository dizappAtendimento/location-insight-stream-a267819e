UPDATE saas_configuracoes 
SET valor = 'https://evo.dizapp.com.br', updated_at = now() 
WHERE chave = 'api_evolution_url';

UPDATE saas_configuracoes 
SET valor = '@Apocalipse12_', updated_at = now() 
WHERE chave = 'api_evolution_key';