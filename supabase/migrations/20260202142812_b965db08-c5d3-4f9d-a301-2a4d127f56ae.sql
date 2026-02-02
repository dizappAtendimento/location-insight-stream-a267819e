-- Tabela de módulos de vídeos
CREATE TABLE public.SAAS_Video_Modulos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vídeos
CREATE TABLE public.SAAS_Videos (
  id SERIAL PRIMARY KEY,
  idModulo INTEGER NOT NULL REFERENCES public.SAAS_Video_Modulos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  youtube_url TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.SAAS_Video_Modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.SAAS_Videos ENABLE ROW LEVEL SECURITY;

-- Políticas para módulos - leitura pública para ativos
CREATE POLICY "Módulos ativos são visíveis para todos"
ON public.SAAS_Video_Modulos
FOR SELECT
USING (ativo = true);

-- Políticas para vídeos - leitura pública para ativos
CREATE POLICY "Vídeos ativos são visíveis para todos"
ON public.SAAS_Videos
FOR SELECT
USING (ativo = true);

-- Índices para performance
CREATE INDEX idx_video_modulos_ordem ON public.SAAS_Video_Modulos(ordem);
CREATE INDEX idx_videos_modulo_ordem ON public.SAAS_Videos(idModulo, ordem);