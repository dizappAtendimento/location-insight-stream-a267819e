-- Adicionar coluna para mensagens personalizadas
ALTER TABLE public."SAAS_Maturador" 
ADD COLUMN IF NOT EXISTS "mensagensPersonalizadas" text[] DEFAULT ARRAY[
  'Oi, tudo bem?',
  'E aí, como vai?',
  'Olá! Como você está?',
  'Opa, beleza?',
  'Bom dia!',
  'Boa tarde!',
  'Boa noite!',
  'Como estão as coisas?',
  'Tudo tranquilo por aí?',
  'O que você está fazendo?',
  'Hoje o dia está corrido!',
  'Estou trabalhando aqui',
  'Legal, que bom!',
  'Entendi, valeu!',
  'Ok, combinado!',
  'Perfeito!',
  'Show de bola!',
  'Beleza, depois a gente se fala',
  'Até mais!',
  'Tchau!',
  'Abraço!',
  '😊',
  '👍',
  '✅'
]::text[];