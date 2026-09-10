import React from 'react';
import { Mail, MapPin, Phone, Instagram, Facebook, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { RochaLogo } from './RochaLogo.js';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  const { theme } = useTheme();

  return (
    <footer
      className={`border-t transition-colors duration-300 pt-16 pb-12 ${
        theme === 'dark'
          ? 'bg-[#08090a] border-zinc-800 text-gray-400'
          : 'bg-[#f4f5f7] border-gray-200 text-gray-600'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Column 1: Brand & Philosophy */}
          <div className="space-y-4 md:col-span-1">
            <div
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer inline-block"
            >
              <RochaLogo theme={theme} size="md" />
            </div>
            <p className="text-xs leading-relaxed pt-2">
              Transformamos momentos singulares em recordações eternas. Especialistas em casamentos,
              festas de 15 anos, ensaios em estúdio e eventos inesquecíveis em Montes Claros e região.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-900 dark:text-gray-100">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    setActiveTab('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#2b5bb0] dark:hover:text-[#c99e64] transition-colors"
                >
                  Página Inicial
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('empresa');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#2b5bb0] dark:hover:text-[#c99e64] transition-colors"
                >
                  A Empresa & História
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('portfolio');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#2b5bb0] dark:hover:text-[#c99e64] transition-colors"
                >
                  Portfólio Completo
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('cliente');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#2b5bb0] dark:hover:text-[#c99e64] transition-colors"
                >
                  Área do Cliente (Meu Álbum)
                </button>
              </li>
              <li>
                <button
                  id="footer-nav-admin"
                  onClick={() => {
                    setActiveTab('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#2b5bb0] dark:hover:text-[#c99e64] transition-colors flex items-center gap-1.5"
                >
                  <span>Painel do Fotógrafo (Admin)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveTab('contato');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#2b5bb0] dark:hover:text-[#c99e64] transition-colors"
                >
                  Fale Conosco & Orçamentos
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Specialties */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-900 dark:text-gray-100">
              Especialidades
            </h4>
            <ul className="space-y-2 text-xs">
              <li>Casamento Religioso e Civil</li>
              <li>15 Anos & Missa Debutante</li>
              <li>Studio Fotográfico Climatizado</li>
              <li>Ensaio Gestante e Família</li>
              <li>Formaturas & Colações</li>
              <li>Produções em Vídeo e Drones</li>
            </ul>
          </div>

          {/* Column 4: Contact & Studio Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-900 dark:text-gray-100">
              Studio & Atendimento
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#2b5bb0] dark:text-[#c99e64] shrink-0 mt-0.5" />
                <span>Montes Claros — Minas Gerais (MG)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#2b5bb0] dark:text-[#c99e64] shrink-0" />
                <span>(38) 99999-0000 / WhatsApp</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#2b5bb0] dark:text-[#c99e64] shrink-0" />
                <span>contato@rochafotoevideo.com.br</span>
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-zinc-800 hover:text-white' : 'bg-white hover:text-[#2b5bb0] shadow-sm'
                }`}
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-zinc-800 hover:text-white' : 'bg-white hover:text-[#2b5bb0] shadow-sm'
                }`}
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div
          className={`pt-8 border-t text-[11px] flex flex-col sm:flex-row items-center justify-between gap-4 ${
            theme === 'dark' ? 'border-zinc-800 text-gray-500' : 'border-gray-200 text-gray-500'
          }`}
        >
          <p>© {new Date().getFullYear()} Rocha Foto & Vídeo. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2b5bb0] dark:text-[#c99e64]" />
            <span>Área Privada Segura com Proteção de Dados</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
