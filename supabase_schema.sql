-- ==============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS SUPABASE
-- Rocha Foto & Vídeo - Sistema de Portfólio & Área Privada de Clientes
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral, clique em "SQL Editor" -> "New query"
-- 3. Cole todo este script e clique no botão verde "Run"
-- ==============================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABELA: clients (Clientes do estúdio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password TEXT DEFAULT 'cliente123',
    address TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: events (Eventos e Ensaios Fotográficos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT,
    location TEXT,
    type TEXT DEFAULT 'Outro',
    status TEXT DEFAULT 'Agendado',
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: galleries (Galerias privadas de clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.galleries (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    cover_image TEXT,
    status TEXT DEFAULT 'Ativa',
    download_pin TEXT,
    watermark_enabled BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    default_price NUMERIC(10, 2) DEFAULT 0,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: photos (Fotografias das galerias de clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.photos (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    number TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) DEFAULT 0,
    order_num INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: selections (Seleções de fotos enviadas pelos clientes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.selections (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
    event_name TEXT,
    gallery_id TEXT REFERENCES public.galleries(id) ON DELETE SET NULL,
    gallery_title TEXT,
    selected_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    photo_count INTEGER DEFAULT 0,
    total_price NUMERIC(10, 2),
    notes TEXT,
    status TEXT DEFAULT 'Nova',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: portfolio_categories (Categorias do Portfólio Público)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.portfolio_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    order_num INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- TABELA: portfolio_photos (Fotografias do Portfólio Público)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.portfolio_categories(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    number TEXT NOT NULL,
    order_num INTEGER DEFAULT 1,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    aspect TEXT DEFAULT 'portrait',
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA CONSULTAS RÁPIDAS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_photos_gallery_id ON public.photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON public.events(client_id);
CREATE INDEX IF NOT EXISTS idx_galleries_client_id ON public.galleries(client_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_cat_id ON public.portfolio_photos(category_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_active ON public.portfolio_photos(active);
CREATE INDEX IF NOT EXISTS idx_portfolio_categories_active ON public.portfolio_categories(active);
CREATE INDEX IF NOT EXISTS idx_selections_status ON public.selections(status);

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS DE ACESSO (POLICIES)
-- Permite leitura pública do portfólio ativo e acesso total para service_role / backend
-- ==============================================================================

-- Portfólio público: Leitura permitida para todos (anônimo ou autenticado)
DROP POLICY IF EXISTS "Public read access for portfolio categories" ON public.portfolio_categories;
CREATE POLICY "Public read access for portfolio categories"
    ON public.portfolio_categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public read access for portfolio photos" ON public.portfolio_photos;
CREATE POLICY "Public read access for portfolio photos"
    ON public.portfolio_photos FOR SELECT
    USING (true);

-- Galerias e fotos: Leitura permitida (validação de PIN / senha é feita na aplicação)
DROP POLICY IF EXISTS "Public read galleries" ON public.galleries;
CREATE POLICY "Public read galleries"
    ON public.galleries FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public read photos" ON public.photos;
CREATE POLICY "Public read photos"
    ON public.photos FOR SELECT
    USING (true);

-- Seleções: Permite que clientes criem novas seleções de fotos
DROP POLICY IF EXISTS "Public can insert selections" ON public.selections;
CREATE POLICY "Public can insert selections"
    ON public.selections FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view selections" ON public.selections;
CREATE POLICY "Public can view selections"
    ON public.selections FOR SELECT
    USING (true);

-- Permitir todas as operações para o backend (service_role ou anon key do servidor)
DROP POLICY IF EXISTS "Service role full access clients" ON public.clients;
CREATE POLICY "Service role full access clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access events" ON public.events;
CREATE POLICY "Service role full access events" ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access galleries" ON public.galleries;
CREATE POLICY "Service role full access galleries" ON public.galleries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access photos" ON public.photos;
CREATE POLICY "Service role full access photos" ON public.photos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access selections" ON public.selections;
CREATE POLICY "Service role full access selections" ON public.selections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access categories" ON public.portfolio_categories;
CREATE POLICY "Service role full access categories" ON public.portfolio_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access portfolio_photos" ON public.portfolio_photos;
CREATE POLICY "Service role full access portfolio_photos" ON public.portfolio_photos FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- BUCKETS DE ARMAZENAMENTO (STORAGE) OPCIONAIS NO SUPABASE
-- Se desejar armazenar arquivos de fotos no Supabase Storage:
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('galleries', 'galleries', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage público para visualização das imagens
DROP POLICY IF EXISTS "Public Access Portfolio Images" ON storage.objects;
CREATE POLICY "Public Access Portfolio Images"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('portfolio', 'galleries'));

DROP POLICY IF EXISTS "Public Upload Portfolio Images" ON storage.objects;
CREATE POLICY "Public Upload Portfolio Images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('portfolio', 'galleries'));
