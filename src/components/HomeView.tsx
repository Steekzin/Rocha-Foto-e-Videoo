import React from 'react';
import {
  ArrowRight,
  Camera,
  Heart,
  Sparkles,
  Award,
  Calendar,
  Lock,
  MessageCircle,
  Clock,
  CheckCircle2,
  MapPin,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { RochaLogo } from './RochaLogo.js';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab }) => {
  const { theme } = useTheme();

  return (
    <div className={`w-full transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0c0d0e] text-[#f3f4f6]' : 'bg-[#ffffff] text-[#111827]'
    }`}>
      {/* 1. HERO BANNER */}
      <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden border-b border-black/10 dark:border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85"
            alt="Rocha Foto e Vídeo"
            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-10000"
          />
          <div className={`absolute inset-0 ${
            theme === 'dark'
              ? 'bg-gradient-to-t from-[#0c0d0e] via-[#0c0d0e]/70 to-[#0c0d0e]/40'
              : 'bg-gradient-to-t from-white via-white/80 to-white/40'
          }`} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          {/* Logo Badge in Hero */}
          <div className="mb-6 flex justify-center">
            <RochaLogo theme={theme} size="lg" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 backdrop-blur-md mb-6">
            <MapPin className="w-3.5 h-3.5 text-[#2b5bb0] dark:text-[#c99e64]" />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-gray-700 dark:text-gray-300">
              Montes Claros — Minas Gerais
            </span>
          </div>

          <h1 className="font-serif-luxury text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight leading-tight mb-6 text-gray-900 dark:text-white">
            Eternizando histórias com <span className="italic text-[#2b5bb0] dark:text-[#c99e64]">alma</span> e tecnologia.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed mb-10 text-gray-600 dark:text-gray-300">
            A Rocha Foto & Vídeo oferece registros fotográficos e cinematográficos de alto padrão.
            Casamentos, debutantes, estúdio fotográfico e eventos sociais com atendimento exclusivo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-btn-portfolio"
              onClick={() => {
                setActiveTab('portfolio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#2b5bb0] hover:bg-[#1f458a] text-white font-semibold text-xs tracking-widest uppercase rounded-full transition-all duration-300 shadow-lg shadow-[#2b5bb0]/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Portfólio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-btn-cliente"
              onClick={() => {
                setActiveTab('cliente');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full sm:w-auto px-8 py-3.5 font-semibold text-xs tracking-widest uppercase rounded-full border transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#181b20] hover:bg-[#232730] text-[#f3f4f6] border-[#333842] hover:border-[#c99e64]'
                  : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300 hover:border-[#2b5bb0] shadow-sm'
              }`}
            >
              <Lock className="w-4 h-4 text-[#2b5bb0] dark:text-[#c99e64]" />
              <span>Área do Cliente (Meu Álbum)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. SPLIT SECTION 1: FOTÓGRAFO DE CASAMENTO (EXACT COPY & STYLE FROM REFERENCE) */}
      <section className={`w-full border-b transition-colors duration-300 ${
        theme === 'dark' ? 'border-zinc-800 bg-[#0c0d0e]' : 'border-gray-200 bg-white'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Full-width Altar Wedding Photo */}
          <div className="relative h-[440px] md:h-[600px] overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85"
              alt="Fotógrafo de casamento Rocha no altar da igreja"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className={`absolute inset-0 ${
              theme === 'dark'
                ? 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
                : 'bg-gradient-to-t from-black/30 via-transparent to-transparent'
            }`} />
            <div className="absolute bottom-6 left-6 text-white text-xs uppercase tracking-widest drop-shadow-md">
              Cerimônia Religiosa • Altar & Noivos
            </div>
          </div>

          {/* Right Column: Editorial Text with Calligraphy Title */}
          <div className={`flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-16 sm:py-24 ${
            theme === 'dark' ? 'bg-[#101215]' : 'bg-[#fafafa]'
          }`}>
            <div className="max-w-xl">
              {/* Calligraphy Script Heading */}
              <h2 className={`font-script text-5xl sm:text-6xl lg:text-7xl font-normal leading-tight tracking-wide ${
                theme === 'dark' ? 'text-gray-100' : 'text-[#4b5563]'
              }`}>
                Fotografo de casamento
              </h2>

              {/* Authentic Subtle Underline Divider */}
              <div className={`w-28 h-[1.5px] my-6 ${
                theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-300'
              }`} />

              {/* Exact Authentic Text from Rocha Foto & Vídeo Reference */}
              <p className={`text-sm sm:text-base leading-relaxed text-justify sm:text-left font-light ${
                theme === 'dark' ? 'text-gray-300' : 'text-[#4b5563]'
              }`}>
                Confira toda a cobertura desses evento fotografico e tão planejado e esperado por todos
                os casais que se amam. Do making of a recepção, tudo fotografado com muita inspiração e amor.
                A equipe Rocha Foto & Video é composta por profissionais experientes, prontos a atender
                produções fotografica em tempo recorde. Nosso grande diferencial é oferecer fotos da mais
                alta tecnologia existente no mercado internacional, proporcionando fotografias de qualidade
                e atendimento personalizado, já que para nós, cada cliente é ÚNICO.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveTab('portfolio');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#2b5bb0] dark:text-[#c99e64] hover:underline"
                >
                  <span>Ver Galerias de Casamentos</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SPLIT SECTION 2: STUDIO FOTOGRÁFICO (EXACT COPY & STYLE FROM REFERENCE) */}
      <section className={`w-full border-b transition-colors duration-300 ${
        theme === 'dark' ? 'border-zinc-800 bg-[#0c0d0e]' : 'border-gray-200 bg-white'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Editorial Text with Calligraphy Title */}
          <div className={`flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-16 sm:py-24 order-2 md:order-1 ${
            theme === 'dark' ? 'bg-[#101215]' : 'bg-[#fafafa]'
          }`}>
            <div className="max-w-xl">
              {/* Calligraphy Script Heading */}
              <h2 className={`font-script text-5xl sm:text-6xl lg:text-7xl font-normal leading-tight tracking-wide ${
                theme === 'dark' ? 'text-gray-100' : 'text-[#4b5563]'
              }`}>
                Studio Fotográfico
              </h2>

              {/* Authentic Subtle Underline Divider */}
              <div className={`w-28 h-[1.5px] my-6 ${
                theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-300'
              }`} />

              {/* Exact Authentic Text from Rocha Foto & Vídeo Reference */}
              <p className={`text-sm sm:text-base leading-relaxed text-justify sm:text-left font-light ${
                theme === 'dark' ? 'text-gray-300' : 'text-[#4b5563]'
              }`}>
                Book em studio, 15 anos, ensaio fotografico, Estudio fotografico, fotos em eventos.
                Nosso objetivo é fazer fotos retrata sonhos atraves de fotgarfia em studio. Em Montes
                Claros Minas Gerais!
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10">
                  Book em Studio
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10">
                  15 Anos & Debutantes
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10">
                  Fotos Gestantes
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10">
                  Retratos Profissionais
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Debutante / 15 Anos Photo with Tiara & Glow */}
          <div className="relative h-[440px] md:h-[600px] overflow-hidden group order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85"
              alt="Ensaio 15 Anos e Book Debutante Studio Rocha"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className={`absolute inset-0 ${
              theme === 'dark'
                ? 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
                : 'bg-gradient-to-t from-black/30 via-transparent to-transparent'
            }`} />
            <div className="absolute bottom-6 right-6 text-white text-xs uppercase tracking-widest drop-shadow-md">
              Montes Claros • MG
            </div>
          </div>
        </div>
      </section>

      {/* 4. OUTROS TRABALHOS & COBERTURAS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-[#2b5bb0] dark:text-[#c99e64] text-xs font-semibold uppercase tracking-[0.25em] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Outras Coberturas</span>
          </div>
          <h3 className="font-serif-luxury text-3xl sm:text-4xl text-gray-900 dark:text-white font-normal">
            Momentos Especiais em Todas as Fases
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
            Registro completo de formaturas, aniversários infantis, bodas, batizados e produções de vídeo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            onClick={() => {
              setActiveTab('portfolio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`cursor-pointer rounded-xl overflow-hidden border p-5 transition-all duration-300 group ${
              theme === 'dark'
                ? 'bg-[#121418] border-zinc-800 hover:border-[#c99e64]'
                : 'bg-white border-gray-200 hover:border-[#2b5bb0] shadow-sm hover:shadow-md'
            }`}
          >
            <div className="h-44 rounded-lg overflow-hidden mb-4">
              <img
                src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80"
                alt="Formatura"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h4 className="font-serif-luxury text-base font-semibold text-gray-900 dark:text-white mb-1">
              Formaturas
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Colação de grau, baile de gala e ensaio da turma com foto e vídeo.
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab('portfolio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`cursor-pointer rounded-xl overflow-hidden border p-5 transition-all duration-300 group ${
              theme === 'dark'
                ? 'bg-[#121418] border-zinc-800 hover:border-[#c99e64]'
                : 'bg-white border-gray-200 hover:border-[#2b5bb0] shadow-sm hover:shadow-md'
            }`}
          >
            <div className="h-44 rounded-lg overflow-hidden mb-4">
              <img
                src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80"
                alt="Aniversários e 15 Anos"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h4 className="font-serif-luxury text-base font-semibold text-gray-900 dark:text-white mb-1">
              Aniversários & 15 Anos
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Celebrações marcantes: 15 Anos, 30, 50, 70 e 90 anos de vida.
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab('portfolio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`cursor-pointer rounded-xl overflow-hidden border p-5 transition-all duration-300 group ${
              theme === 'dark'
                ? 'bg-[#121418] border-zinc-800 hover:border-[#c99e64]'
                : 'bg-white border-gray-200 hover:border-[#2b5bb0] shadow-sm hover:shadow-md'
            }`}
          >
            <div className="h-44 rounded-lg overflow-hidden mb-4">
              <img
                src="https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80"
                alt="Infantil e Batizados"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h4 className="font-serif-luxury text-base font-semibold text-gray-900 dark:text-white mb-1">
              Infantil & Batizados
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A pureza dos primeiros anos e celebrações de fé em família.
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab('portfolio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`cursor-pointer rounded-xl overflow-hidden border p-5 transition-all duration-300 group ${
              theme === 'dark'
                ? 'bg-[#121418] border-zinc-800 hover:border-[#c99e64]'
                : 'bg-white border-gray-200 hover:border-[#2b5bb0] shadow-sm hover:shadow-md'
            }`}
          >
            <div className="h-44 rounded-lg overflow-hidden mb-4">
              <img
                src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80"
                alt="Produção de Vídeos"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h4 className="font-serif-luxury text-base font-semibold text-gray-900 dark:text-white mb-1">
              Vídeos & Cinema
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Filmagem cinematográfica, drones e teasers para redes sociais.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION FOR CLIENT PORTAL */}
      <section className={`py-16 border-t ${
        theme === 'dark' ? 'bg-[#0f1115] border-zinc-800' : 'bg-gray-100 border-gray-200'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-[#2b5bb0] dark:text-[#c99e64]">
              <ShieldCheck className="w-4 h-4" />
              <span>Plataforma Exclusiva</span>
            </div>
            <h3 className="font-serif-luxury text-2xl sm:text-3xl font-normal text-gray-900 dark:text-white">
              Já realizou seu evento conosco?
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-lg">
              Acesse sua Área Privada para visualizar suas fotografias em alta resolução,
              montar seu álbum de seleção e enviar a lista final direto para o nosso WhatsApp.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveTab('cliente');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3 bg-[#2b5bb0] hover:bg-[#1e4282] text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Entrar na Área do Cliente</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('contato');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full sm:w-auto px-6 py-3 text-xs font-semibold tracking-wider uppercase rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                  : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-[#2b5bb0] dark:text-[#c99e64]" />
              <span>Falar no WhatsApp</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
