import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  UploadCloud,
  FileCode,
  ShieldCheck,
  Terminal,
  Layers,
  Users,
  Calendar,
  Camera,
  CheckSquare,
} from 'lucide-react';
import { api } from '../services/api.js';

export const AdminDatabaseTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSqlPath, setCopiedSqlPath] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
    counts?: any;
  } | null>(null);

  const [dbStatus, setDbStatus] = useState<{
    configured: boolean;
    connected: boolean;
    provider: 'supabase' | 'local_json';
    url: string | null;
    error?: string;
    counts: {
      clients: number;
      events: number;
      galleries: number;
      photos: number;
      selections: number;
      categories: number;
      portfolioPhotos: number;
    };
  } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getSupabaseStatus();
      setDbStatus(res);
    } catch (err: any) {
      console.error('Falha ao obter status do Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleMigrate = async () => {
    if (
      !window.confirm(
        'Deseja enviar todos os clientes, eventos, galerias, fotos e categorias locais para as tabelas do seu Supabase?'
      )
    ) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await api.migrateToSupabase();
      setMigrationResult({
        success: true,
        message: res.message || 'Dados migrados com sucesso para o Supabase!',
        counts: res.counts,
      });
      fetchStatus();
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: err.message || 'Erro ao migrar dados para o Supabase.',
      });
    } finally {
      setMigrating(false);
    }
  };

  const sampleEnv = `# Configuração para rodar fora do Google AI Studio (Local, VPS, Vercel, Docker)
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Supabase (PostgreSQL Cloud)
SUPABASE_URL=${dbStatus?.url || 'https://seu-projeto.supabase.co'}
SUPABASE_ANON_KEY=sua-chave-anon-publica-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui

# Frontend Vite
VITE_SUPABASE_URL=${dbStatus?.url || 'https://seu-projeto.supabase.co'}
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica-aqui`;

  return (
    <div className="space-y-8 animate-fadeIn text-[#f3f4f6]">
      {/* Header Info */}
      <div className="bg-[#12151a] border border-[#20252e] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c99e64]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c99e64]/10 text-[#c99e64] border border-[#c99e64]/20 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-serif-luxury text-white font-normal">
                  Gerenciador de Banco de Dados — Supabase
                </h2>
                <p className="text-xs text-[#9ca3af]">
                  Conexão com PostgreSQL Supabase na nuvem e redundância local (JSON).
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-3.5 py-2 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#c99e64] ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Verificando...' : 'Testar Conexão'}</span>
            </button>

            {dbStatus?.configured && (
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="px-4 py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#c99e64]/10 cursor-pointer"
              >
                <UploadCloud className={`w-4 h-4 ${migrating ? 'animate-bounce' : ''}`} />
                <span>{migrating ? 'Migrando Dados...' : 'Migrar para Supabase (1 Clique)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Status Card */}
        <div className="mt-6 pt-6 border-t border-[#1e232b] grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                dbStatus?.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {dbStatus?.connected ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-[11px] text-[#828a95] uppercase tracking-wider font-mono">
                Status Atual
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {dbStatus?.connected
                  ? 'Supabase Conectado (Nuvem)'
                  : 'Armazenamento Local (rocha_db.json)'}
              </p>
              <p className="text-[11px] text-[#9ca3af] mt-1">
                {dbStatus?.connected
                  ? 'Todas as alterações são sincronizadas com o PostgreSQL.'
                  : 'Operando em modo local offline seguro com persistência JSON.'}
              </p>
            </div>
          </div>

          <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-[11px] text-[#828a95] uppercase tracking-wider font-mono">
                Endereço Supabase
              </p>
              <p className="text-sm font-mono text-[#c99e64] truncate mt-0.5" title={dbStatus?.url || ''}>
                {dbStatus?.url || 'Não configurado no .env'}
              </p>
              <p className="text-[11px] text-[#9ca3af] mt-1">
                {dbStatus?.configured
                  ? 'Variável SUPABASE_URL carregada'
                  : 'Defina SUPABASE_URL e chaves no arquivo .env'}
              </p>
            </div>
          </div>

          <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-[#828a95] uppercase tracking-wider font-mono">
                Script SQL & RLS
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                supabase_schema.sql
              </p>
              <p className="text-[11px] text-[#9ca3af] mt-1">
                Contém tabelas, índices e políticas de segurança prontas.
              </p>
            </div>
          </div>
        </div>

        {/* Error diagnosis if connection failed */}
        {dbStatus?.error && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Aviso de Conexão Supabase:</p>
              <p className="mt-1 text-red-300 font-mono text-[11px]">{dbStatus.error}</p>
              <p className="mt-2 text-white/80">
                Dica: Verifique se você executou o conteúdo de <code className="text-[#c99e64]">supabase_schema.sql</code> no SQL Editor do Supabase para criar as tabelas necessárias.
              </p>
            </div>
          </div>
        )}

        {/* Migration Result Toast */}
        {migrationResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs flex items-start gap-3 ${
              migrationResult.success
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                : 'bg-red-950/30 border-red-800/40 text-red-200'
            }`}
          >
            {migrationResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{migrationResult.message}</p>
              {migrationResult.counts && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.clients} clientes
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.events} eventos
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.galleries} galerias
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.photos} fotos de galerias
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.selections} seleções
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.categories} categorias
                  </span>
                  <span className="px-2 py-0.5 bg-black/40 rounded border border-white/10">
                    {migrationResult.counts.portfolioPhotos} fotos de portfólio
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Database Inventory Metrics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9ca3af] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#c99e64]" />
          <span>Inventário Atual em Memória e Cache</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <Users className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.clients ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Clientes</p>
          </div>

          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <Calendar className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.events ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Eventos</p>
          </div>

          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <Layers className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.galleries ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Galerias</p>
          </div>

          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <Camera className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.photos ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Fotos Galerias</p>
          </div>

          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <CheckSquare className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.selections ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Seleções</p>
          </div>

          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <FileCode className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.categories ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Categorias</p>
          </div>

          <div className="bg-[#12151a] border border-[#20252e] rounded-xl p-3 text-center">
            <Camera className="w-4 h-4 text-[#c99e64] mx-auto mb-1.5" />
            <p className="text-xl font-bold text-white">{dbStatus?.counts.portfolioPhotos ?? 0}</p>
            <p className="text-[10px] text-[#828a95] uppercase">Fotos Portfólio</p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Guide for Running Outside Google AI Studio */}
      <div className="bg-[#12151a] border border-[#20252e] rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-[#c99e64]" />
          <div>
            <h3 className="text-base font-semibold text-white">
              Guia: Como Executar Fora da Plataforma Google AI Studio
            </h3>
            <p className="text-xs text-[#9ca3af]">
              Instruções simples para rodar localmente no seu computador (VS Code), VPS, Docker ou Vercel com Supabase.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#c99e64]/20 text-[#c99e64] text-xs font-bold flex items-center justify-center border border-[#c99e64]/30">
                1
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Criar Projeto Supabase
              </h4>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Acesse o site oficial do Supabase e crie um projeto gratuito (PostgreSQL).
            </p>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#c99e64] hover:underline"
            >
              <span>Abrir Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#c99e64]/20 text-[#c99e64] text-xs font-bold flex items-center justify-center border border-[#c99e64]/30">
                2
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Executar o Script SQL
              </h4>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              No painel do Supabase, clique em <strong>SQL Editor</strong> &gt; <strong>New query</strong> e cole o conteúdo de <code className="text-[#c99e64]">supabase_schema.sql</code>.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText('supabase_schema.sql');
                setCopiedSqlPath(true);
                setTimeout(() => setCopiedSqlPath(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#c99e64] hover:underline cursor-pointer"
            >
              {copiedSqlPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSqlPath ? 'Caminho copiado!' : 'Copiar nome do arquivo'}</span>
            </button>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#c99e64]/20 text-[#c99e64] text-xs font-bold flex items-center justify-center border border-[#c99e64]/30">
                3
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Preencher o .env
              </h4>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              Copie a <strong>URL</strong> e a chave <strong>anon</strong> em <em>Project Settings &gt; API</em> e salve no arquivo <code className="text-[#c99e64]">.env</code>.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sampleEnv);
                setCopiedEnv(true);
                setTimeout(() => setCopiedEnv(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#c99e64] hover:underline cursor-pointer"
            >
              {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedEnv ? 'Configuração copiada!' : 'Copiar modelo .env'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Commands */}
        <div className="bg-[#0a0c0e] border border-[#1e232b] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#828a95]">Comandos no Terminal (VS Code / Bash):</span>
          </div>
          <pre className="text-xs font-mono text-[#c99e64] overflow-x-auto bg-[#050608] p-3 rounded-lg border border-[#1e232b]">
{`# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev

# 3. Para compilar versão de produção
npm run build && npm start`}
          </pre>
        </div>
      </div>
    </div>
  );
};
