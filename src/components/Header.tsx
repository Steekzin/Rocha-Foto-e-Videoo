import React, { useState } from 'react';
import {
  Camera,
  Lock,
  LogOut,
  Menu,
  Shield,
  X,
  BookmarkCheck,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { User } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import { RochaLogo } from './RochaLogo.js';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  selectedPhotosCount: number;
  onOpenMyAlbum?: () => void;
  isInGalleryView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  selectedPhotosCount,
  onOpenMyAlbum,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { id: 'home', label: 'HOME' },
    { id: 'empresa', label: 'A EMPRESA' },
    { id: 'portfolio', label: 'PORTFOLIO' },
    { id: 'cliente', label: 'ÁREA DO CLIENTE' },
    { id: 'contato', label: 'CONTATO' },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('portfolio');
      setSearchOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 border-b ${
        theme === 'dark'
          ? 'bg-[#0c0d0e]/95 border-zinc-800 text-[#f3f4f6]'
          : 'bg-white/95 border-gray-200 text-[#111827] shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo matching the authentic brand image */}
          <div
            id="brand-logo"
            onClick={() => handleNavClick('home')}
            className="cursor-pointer py-1 flex items-center"
          >
            <RochaLogo theme={theme} size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              const isClientPortal = link.id === 'cliente';

              if (isClientPortal) {
                return (
                  <button
                    key={link.id}
                    id={`nav-${link.id}`}
                    onClick={() => handleNavClick(link.id)}
                    className={`ml-1 px-3.5 py-1.5 rounded-full text-[11px] lg:text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#2b5bb0] text-white shadow-md shadow-[#2b5bb0]/25'
                        : theme === 'dark'
                        ? 'bg-[#181a1f] text-gray-200 hover:bg-[#232730] hover:text-[#c99e64] border border-[#2e343d]'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-[#2b5bb0] border border-gray-200'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={link.id}
                  id={`nav-${link.id}`}
                  onClick={() => handleNavClick(link.id)}
                  className={`px-3 py-2 text-[11px] lg:text-xs tracking-wider uppercase transition-colors relative font-semibold cursor-pointer ${
                    isActive
                      ? theme === 'dark'
                        ? 'text-[#c99e64]'
                        : 'text-[#2b5bb0]'
                      : theme === 'dark'
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${
                        theme === 'dark' ? 'bg-[#c99e64]' : 'bg-[#2b5bb0]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Theme Toggle, Search, Album Badge, Admin Shortcut */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Search Button */}
            <div className="relative">
              <button
                id="btn-search-header"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-zinc-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Pesquisar fotos e categorias"
              >
                <Search className="w-4 h-4" />
              </button>

              {searchOpen && (
                <form
                  onSubmit={handleSearchSubmit}
                  className={`absolute right-0 top-12 w-64 p-2 rounded-xl border shadow-xl z-50 flex items-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-[#181a20] border-zinc-700 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="Buscar Casamento, 15 Anos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full text-xs bg-transparent px-2 py-1 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-[#2b5bb0] text-white text-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            {/* Dark/Light Mode Switcher */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'text-amber-400 hover:bg-zinc-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-gray-700" />
              )}
            </button>

            {/* "Meu Álbum" counter button if client selected photos */}
            {selectedPhotosCount > 0 && onOpenMyAlbum && (
              <button
                id="btn-open-my-album-header"
                onClick={onOpenMyAlbum}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b5bb0] text-white rounded-full text-xs font-semibold tracking-wider hover:bg-[#1f458a] transition-all shadow-md shadow-[#2b5bb0]/20 cursor-pointer animate-pulse"
                title="Ver fotos selecionadas no Meu Álbum"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Meu Álbum ({selectedPhotosCount})</span>
              </button>
            )}

            {/* Photographer / Admin Portal Shortcut */}
            <button
              id="btn-admin-shortcut"
              onClick={() => handleNavClick('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#2b5bb0] text-white font-semibold border-[#2b5bb0]'
                  : theme === 'dark'
                  ? 'bg-[#181a1f] border-[#2c313a] text-gray-300 hover:border-[#c99e64] hover:text-[#c99e64]'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-[#2b5bb0] hover:text-[#2b5bb0]'
              }`}
              title="Painel Administrativo do Fotógrafo"
            >
              <Shield className="w-3.5 h-3.5 text-[#2b5bb0] dark:text-[#c99e64]" />
              <span className="hidden sm:inline">Painel Admin</span>
              <span className="sm:hidden">Admin</span>
            </button>

            {/* Logged in User info */}
            {currentUser && (
              <div
                className={`hidden lg:flex items-center space-x-2 pl-2 border-l ${
                  theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
                }`}
              >
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 leading-tight">Olá,</p>
                  <p className="text-xs font-medium truncate max-w-[120px]">
                    {currentUser.name.split(' ')[0]}
                  </p>
                </div>
                <button
                  id="btn-logout-header"
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                  title="Sair da sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-zinc-800'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200 ${
            theme === 'dark' ? 'bg-[#101215] border-zinc-800' : 'bg-white border-gray-200'
          }`}
        >
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                id={`mobile-nav-${link.id}`}
                onClick={() => handleNavClick(link.id)}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs tracking-wider uppercase font-semibold transition-colors flex items-center justify-between ${
                  isActive
                    ? 'bg-[#2b5bb0]/10 text-[#2b5bb0] border-l-2 border-[#2b5bb0]'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:bg-zinc-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{link.label}</span>
              </button>
            );
          })}

          <button
            id="mobile-nav-admin"
            onClick={() => handleNavClick('admin')}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs tracking-wider uppercase font-semibold flex items-center justify-between transition-colors ${
              activeTab === 'admin'
                ? 'bg-[#2b5bb0] text-white'
                : theme === 'dark'
                ? 'bg-zinc-800 text-gray-300'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2b5bb0]" />
              Painel Administrativo
            </span>
          </button>

          {currentUser && (
            <div
              className={`pt-3 border-t flex items-center justify-between px-2 ${
                theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
              }`}
            >
              <span className="text-xs text-gray-400">
                Conectado: <strong className="text-gray-200">{currentUser.name}</strong>
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-red-400 hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
