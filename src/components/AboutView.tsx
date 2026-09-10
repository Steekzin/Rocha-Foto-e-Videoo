import React from 'react';
import {
  Award,
  Camera,
  Heart,
  Sparkles,
  Users,
  Video,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Briefcase,
  FileCheck2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface AboutViewProps {
  setActiveTab: (tab: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ setActiveTab }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const serviceCategories = [
    {
      title: 'Casamentos',
      desc: 'Coberturas completas e sofisticadas para celebrações religiosas, ao ar livre e recepções luxuosas.',
      icon: Heart,
    },
    {
      title: 'Eventos',
      desc: 'Festas de 15 anos, aniversários memoráveis, formaturas, batizados e confraternizações.',
      icon: Calendar,
    },
    {
      title: 'Ensaios',
      desc: 'Sessões em Studio Fotográfico ou locações externas: gestantes, debutantes, casais e infantil.',
      icon: Camera,
    },
    {
      title: 'Publicidade',
      desc: 'Produções visuais para marcas, personal branding, campanhas comerciais e retratos corporativos.',
      icon: Briefcase,
    },
    {
      title: 'Casamento Civil',
      desc: 'Registros intimistas em cartório, celebrações familiares e mini weddings cheios de emoção.',
      icon: FileCheck2,
    },
    {
      title: 'Outros Serviços',
      desc: 'Captação aérea em 4K com drone, restauração digital de fotos antigas e álbuns encadernados.',
      icon: Layers,
    },
  ];

  return (
    <div
      className={`w-full py-16 transition-colors ${
        isLight ? 'bg-[#fcfcfc] text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumb / Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-[#c99e64] text-xs font-semibold uppercase tracking-[0.25em] mb-3">
            <Building className="w-3.5 h-3.5" />
            <span>A Empresa</span>
          </div>
          <h1
            className={`font-serif-luxury text-4xl sm:text-5xl font-normal leading-tight ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}
          >
            Paixão por registrar a história e o afeto das pessoas.
          </h1>
          <p
            className={`text-sm sm:text-base mt-4 leading-relaxed ${
              isLight ? 'text-gray-600' : 'text-[#9ca3af]'
            }`}
          >
            A Rocha Foto & Vídeo nasceu da dedicação incondicional à arte fotográfica. Ao longo de
            anos de trajetória, nos consolidamos como referência em coberturas de alta sensibilidade.
          </p>
        </div>

        {/* Story Section: Modern Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div
            className={`lg:col-span-6 space-y-6 text-sm leading-relaxed ${
              isLight ? 'text-gray-600' : 'text-[#9ca3af]'
            }`}
          >
            <h2
              className={`font-serif-luxury text-2xl sm:text-3xl font-normal ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}
            >
              Mais que fotos: um patrimônio de memórias vivas.
            </h2>
            <p>
              A Rocha Foto & Vídeo atua com o compromisso de unir técnica apurada, iluminação
              direcionada e um olhar estético refinado. Não buscamos apenas registrar poses rígidas,
              mas sim capturar os instantes efêmeros — o olhar trocado antes do "sim", o riso solto
              dos amigos, o abraço apertado dos pais e a energia indescritível de cada celebração.
            </p>
            <p>
              Com estúdio próprio estruturado e equipe especializada em captação cinematográfica,
              oferecemos uma experiência completa desde o primeiro café de alinhamento até a entrega
              dos álbuns diagramados e da galeria privada digital dos clientes.
            </p>

            <div
              className={`grid grid-cols-3 gap-4 pt-4 border-t ${
                isLight ? 'border-gray-200' : 'border-[#20242c]'
              }`}
            >
              <div>
                <span className="font-serif-luxury text-3xl text-[#c99e64] block">15+</span>
                <span
                  className={`text-[11px] uppercase tracking-wider ${
                    isLight ? 'text-gray-500' : 'text-[#828a95]'
                  }`}
                >
                  Anos de História
                </span>
              </div>
              <div>
                <span className="font-serif-luxury text-3xl text-[#c99e64] block">1.200+</span>
                <span
                  className={`text-[11px] uppercase tracking-wider ${
                    isLight ? 'text-gray-500' : 'text-[#828a95]'
                  }`}
                >
                  Casamentos & Festas
                </span>
              </div>
              <div>
                <span className="font-serif-luxury text-3xl text-[#c99e64] block">100%</span>
                <span
                  className={`text-[11px] uppercase tracking-wider ${
                    isLight ? 'text-gray-500' : 'text-[#828a95]'
                  }`}
                >
                  Compromisso
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-2 gap-4">
              <img
                src="https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=600&q=80"
                alt="Equipe e Cobertura Rocha"
                className={`rounded-xl h-64 sm:h-72 w-full object-cover border ${
                  isLight ? 'border-gray-200 shadow-md' : 'border-[#22272f]'
                }`}
              />
              <img
                src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80"
                alt="Detalhe de fotografia e alianças"
                className={`rounded-xl h-64 sm:h-72 w-full object-cover border mt-8 ${
                  isLight ? 'border-gray-200 shadow-md' : 'border-[#22272f]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Service Categories with Subtle Icons as requested */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#c99e64] text-xs font-semibold uppercase tracking-[0.25em]">
              Áreas de Atuação
            </span>
            <h2
              className={`font-serif-luxury text-3xl font-normal mt-2 ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}
            >
              Nossos Serviços & Categorias
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((srv, idx) => {
              const IconComp = srv.icon;
              return (
                <div
                  key={idx}
                  className={`border rounded-xl p-6 transition-all ${
                    isLight
                      ? 'bg-white border-gray-200 hover:border-[#c99e64]/60 shadow-sm'
                      : 'bg-[#121418] border-[#22262e] hover:border-[#c99e64]/40'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-[#c99e64] mb-4 border ${
                      isLight
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-[#1a1d22] border-[#2a2e36]'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3
                    className={`text-base font-serif-luxury mb-2 ${
                      isLight ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {srv.title}
                  </h3>
                  <p
                    className={`text-xs leading-relaxed ${
                      isLight ? 'text-gray-600' : 'text-[#9ca3af]'
                    }`}
                  >
                    {srv.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commitment Banner & CTA */}
        <div
          className={`border rounded-2xl p-8 sm:p-12 text-center max-w-4xl mx-auto ${
            isLight
              ? 'bg-white border-gray-200 shadow-md'
              : 'bg-[#14171d] border-[#242933]'
          }`}
        >
          <Sparkles className="w-8 h-8 text-[#c99e64] mx-auto mb-4" />
          <h3
            className={`font-serif-luxury text-2xl sm:text-3xl mb-3 ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}
          >
            Vamos planejar juntos o registro do seu próximo momento especial?
          </h3>
          <p
            className={`text-xs sm:text-sm max-w-xl mx-auto mb-6 ${
              isLight ? 'text-gray-600' : 'text-[#9ca3af]'
            }`}
          >
            Agende uma visita ao nosso Studio ou converse diretamente conosco pelo WhatsApp para tirar
            dúvidas, conferir mostruários de álbuns e receber uma proposta personalizada.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setActiveTab('contato')}
              className="px-6 py-3 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] text-xs font-semibold uppercase tracking-widest rounded-full transition-colors cursor-pointer shadow-md shadow-[#c99e64]/20"
            >
              Falar com o Fotógrafo
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-3 text-xs font-semibold uppercase tracking-widest rounded-full border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                  : 'bg-[#1d2128] hover:bg-[#252a33] text-white border-[#333a46]'
              }`}
            >
              Conhecer Portfólio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
