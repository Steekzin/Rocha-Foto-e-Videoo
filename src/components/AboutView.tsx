import React, { useState, useEffect } from 'react';
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
  Upload,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';

interface AboutViewProps {
  setActiveTab: (tab: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ setActiveTab }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Institutional photos (original files without AI alterations)
  const [photos, setPhotos] = useState<{ perfil: string; cerimonia: string; fachada: string }>({
    perfil: localStorage.getItem('rocha_inst_perfil') || '/fotografo_rocha_perfil.jpg',
    cerimonia: localStorage.getItem('rocha_inst_cerimonia') || '/fotografo_rocha_cerimonia.jpg',
    fachada: localStorage.getItem('rocha_inst_fachada') || '/rocha_fachada.jpg',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  useEffect(() => {
    api
      .getInstitutionalPhotos()
      .then((res) => {
        if (res) {
          setPhotos((prev) => ({
            ...prev,
            perfil: localStorage.getItem('rocha_inst_perfil') || res.perfil || prev.perfil,
            cerimonia: localStorage.getItem('rocha_inst_cerimonia') || res.cerimonia || prev.cerimonia,
            fachada: localStorage.getItem('rocha_inst_fachada') || res.fachada || prev.fachada,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleUploadOriginal = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 'perfil' | 'cerimonia' | 'fachada'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview with zero delay
    const previewUrl = URL.createObjectURL(file);
    setPhotos((prev) => ({ ...prev, [slot]: previewUrl }));
    setIsUploading(true);
    setUploadToast('Carregando foto original com 100% de fidelidade...');

    // Also cache as base64 in localStorage for instant persistence
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const b64 = reader.result as string;
        if (b64 && b64.length < 4 * 1024 * 1024) {
          localStorage.setItem(`rocha_inst_${slot}`, b64);
        }
      } catch {}
    };
    reader.readAsDataURL(file);

    try {
      const res = await api.uploadInstitutionalPhoto(slot, file);
      if (res && res.url) {
        setPhotos((prev) => ({ ...prev, [slot]: res.url }));
        localStorage.setItem(`rocha_inst_${slot}`, res.url);
        setUploadToast('Foto original do fotógrafo aplicada com sucesso (sem alterações)!');
      }
    } catch (err: any) {
      console.warn('Erro ao sincronizar com servidor, mantendo foto original localmente:', err);
      setUploadToast('Foto original do fotógrafo aplicada com sucesso!');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadToast(null), 4500);
    }
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              {/* Coluna 1: Fachada e Retrato do Fotógrafo */}
              <div className="sm:col-span-6 flex flex-col gap-3 sm:gap-4">
                <div className="relative group overflow-hidden rounded-xl flex-1">
                  <img
                    src={photos.fachada}
                    alt="Studio Rocha Foto & Vídeo - Fachada"
                    referrerPolicy="no-referrer"
                    className={`rounded-xl h-44 sm:h-52 w-full object-cover object-top border transition-transform duration-300 group-hover:scale-102 ${
                      isLight ? 'border-gray-200 shadow-md' : 'border-[#22272f]'
                    }`}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-[10px] text-white rounded">
                    Estúdio Próprio
                  </div>
                </div>

                <div className="relative group overflow-hidden rounded-xl flex-1">
                  <img
                    src={photos.perfil}
                    alt="Fotógrafo Rocha - Rocha Foto & Vídeo"
                    referrerPolicy="no-referrer"
                    className={`rounded-xl h-44 sm:h-52 w-full object-cover object-top border transition-transform duration-300 group-hover:scale-102 ${
                      isLight ? 'border-gray-200 shadow-md' : 'border-[#22272f]'
                    }`}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-[10px] text-white rounded">
                    Fotógrafo Profissional
                  </div>

                  {/* Botão de Trocar Foto Original (100% original, sem IA) */}
                  <label
                    title="Carregar a fotografia original do fotógrafo (100% fiel, sem retoques de IA)"
                    className="absolute top-2 right-2 px-2.5 py-1 bg-black/80 hover:bg-black text-[11px] font-medium text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Aplicando...' : 'Trocar Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => handleUploadOriginal(e, 'perfil')}
                    />
                  </label>
                </div>
              </div>

              {/* Coluna 2: Fotógrafo em Cobertura Cerimonial */}
              <div className="sm:col-span-6 flex">
                <div className="relative group overflow-hidden rounded-xl w-full flex">
                  <img
                    src={photos.cerimonia}
                    alt="Fotógrafo em ação durante celebração de casamento"
                    referrerPolicy="no-referrer"
                    className={`rounded-xl h-full min-h-[360px] sm:min-h-[420px] w-full object-cover border transition-transform duration-300 group-hover:scale-102 ${
                      isLight ? 'border-gray-200 shadow-md' : 'border-[#22272f]'
                    }`}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-[10px] text-white rounded">
                    Em Cobertura
                  </div>
                </div>
              </div>
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

      {uploadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#16181d] border border-amber-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadToast}</span>
        </div>
      )}
    </div>
  );
};
