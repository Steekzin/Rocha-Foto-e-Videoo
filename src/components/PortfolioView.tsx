import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Filter,
  Maximize2,
  X,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { PortfolioItem, PortfolioCategory } from '../types.js';
import { api } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';

interface PortfolioViewProps {
  onContactClick?: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onContactClick }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRealPhotos, setIsRealPhotos] = useState<boolean>(false);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        const [catsData, photosData] = await Promise.all([
          api.getPortfolioCategories(false),
          api.getPortfolio(),
        ]);
        setCategories(catsData);
        setItems(photosData);
        setIsRealPhotos(photosData.some((p) => p.imageUrl.startsWith('/portfolio/')));
      } catch (err) {
        console.error('Error loading portfolio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  // Compute category counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { Todos: items.length };
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Merge database active categories with categories present in items
  const allCategories = React.useMemo(() => {
    const catNames: string[] = ['Todos'];
    categories.forEach((c) => {
      if (!catNames.includes(c.name)) {
        catNames.push(c.name);
      }
    });
    // Add any photo category not in categories list
    items.forEach((i) => {
      if (!catNames.includes(i.category)) {
        catNames.push(i.category);
      }
    });
    return catNames;
  }, [categories, items]);

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.number && item.number.toLowerCase().includes(q)) ||
        (item.caption && item.caption.toLowerCase().includes(q))
      );
    });
  }, [items, selectedCategory, searchQuery]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredItems.length]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && filteredItems.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
    }
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && filteredItems.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const currentLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div
      className={`w-full min-h-screen py-16 transition-colors ${
        isLight ? 'bg-[#fcfcfc] text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 text-[#c99e64] text-xs font-semibold uppercase tracking-[0.25em] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Galeria Artística Autoral</span>
          </div>
          <h1
            className={`font-serif-luxury text-4xl sm:text-5xl font-normal ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}
          >
            Nosso Portfólio
          </h1>
          <p
            className={`text-xs sm:text-sm mt-3 ${
              isLight ? 'text-gray-600' : 'text-[#9ca3af]'
            }`}
          >
            Explore trabalhos fotográficos autorais selecionados em diferentes formatos, celebrações e histórias reais.
          </p>

          {isRealPhotos && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c99e64]/10 border border-[#c99e64]/30 text-[#c99e64] text-xs font-medium">
              <Camera className="w-3.5 h-3.5" />
              <span>Fotografias reais da Rocha Foto & Vídeo</span>
            </div>
          )}
        </div>

        {/* Search and Quick Filters Bar */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por estilo, momento ou ensaio..."
              className={`w-full pl-4 pr-10 py-2.5 rounded-full text-xs transition-colors border ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#c99e64]'
                  : 'bg-[#14171d] border-[#252a34] text-white placeholder-gray-500 focus:border-[#c99e64]'
              } focus:outline-none`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar: Horizontal scroll on mobile, wrap on desktop */}
        <div className="mb-10">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-4 pt-1 no-scrollbar md:flex-wrap md:justify-center">
            {allCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;
              // If not "Todos" and has 0 photos, skip unless it's the active one
              if (cat !== 'Todos' && count === 0 && !isActive) return null;

              return (
                <button
                  key={cat}
                  id={`cat-btn-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => {
                    setSelectedCategory(cat);
                  }}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#c99e64] text-[#0c0d0e] shadow-md shadow-[#c99e64]/20 font-semibold'
                      : isLight
                      ? 'bg-white text-gray-700 hover:text-black hover:bg-gray-100 border border-gray-200'
                      : 'bg-[#14171d] text-[#9ca3af] hover:text-white hover:bg-[#1f232c] border border-[#222730]'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-black/20 text-black font-bold' : 'bg-gray-800/40 text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Grid with Smooth Motion Reorganization */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#c99e64] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#9ca3af] tracking-widest uppercase">Carregando portfólio autoral...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center bg-[#111317] rounded-xl border border-[#20242c] p-8 max-w-md mx-auto">
            <Camera className="w-10 h-10 text-[#c99e64] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-serif-luxury text-white">Nenhuma fotografia encontrada</h3>
            <p className="text-xs text-[#9ca3af] mt-1 mb-4">
              {searchQuery
                ? `Não encontramos resultados para "${searchQuery}".`
                : 'Estamos catalogando novas fotografias para esta categoria.'}
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-[#c99e64] text-[#0c0d0e] rounded-full text-xs font-semibold uppercase tracking-wider"
            >
              Ver Todas as Fotos ({items.length})
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => openLightbox(index)}
                  className="group relative bg-[#12151a] rounded-xl overflow-hidden border border-[#20252e] cursor-pointer hover:border-[#c99e64]/60 transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#181b22]">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        // If local image fails, show subtle fallback
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-75 group-hover:opacity-95 transition-opacity" />

                    {/* Category pill & Visual Number */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] uppercase tracking-wider text-[#c99e64] font-medium border border-[#c99e64]/30">
                        {item.category}
                      </span>
                      {item.number && (
                        <span className="px-2 py-1 bg-black/80 backdrop-blur-md rounded-full text-[10px] font-mono font-bold text-white/90 border border-white/15">
                          #{item.number}
                        </span>
                      )}
                    </div>

                    {/* Featured badge if marked */}
                    {item.featured && (
                      <span className="absolute top-3 right-12 px-2 py-0.5 bg-[#c99e64] text-black rounded-full text-[9px] uppercase font-bold tracking-wider">
                        Destaque
                      </span>
                    )}

                    {/* Hover expand icon */}
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>

                    {/* Bottom Caption */}
                    <div className="absolute bottom-3 left-3 right-3 text-left">
                      <h3 className="text-sm font-serif-luxury text-white leading-snug group-hover:text-[#c99e64] transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      {item.caption && (
                        <p className="text-[11px] text-[#9ca3af] mt-0.5 line-clamp-1">
                          {item.caption}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* LIGHTBOX MODAL WITH KEYBOARD AND MOBILE GESTURE SUPPORT */}
      {currentLightboxItem && (
        <div
          id="lightbox-overlay"
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 z-20 p-2.5 text-gray-300 hover:text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer shadow-lg"
            aria-label="Fechar ampliação"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev button */}
          <button
            onClick={prevPhoto}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next button */}
          <button
            onClick={nextPhoto}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg"
            aria-label="Próxima foto"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image & Details Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full max-h-[92vh] flex flex-col items-center"
          >
            <div className="relative max-h-[72vh] flex items-center justify-center">
              <img
                src={currentLightboxItem.imageUrl}
                alt={currentLightboxItem.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-[#262a32]"
              />
            </div>

            {/* Information Footer */}
            <div className="mt-4 text-center max-w-2xl w-full px-4">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-[11px] text-[#c99e64] uppercase tracking-widest font-semibold">
                  {currentLightboxItem.category}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-[11px] text-gray-400">
                  Foto {((lightboxIndex ?? 0) + 1)} de {filteredItems.length}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-serif-luxury text-white">
                {currentLightboxItem.title}
              </h2>
              {currentLightboxItem.caption && (
                <p className="text-xs text-[#9ca3af] mt-1 max-w-lg mx-auto">
                  {currentLightboxItem.caption}
                </p>
              )}

              {/* Action Buttons in Lightbox */}
              <div className="mt-3 flex items-center justify-center gap-3">
                <a
                  href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                    `Olá, Rocha Foto & Vídeo! Adorei a foto "${currentLightboxItem.title}" da categoria ${currentLightboxItem.category} do portfólio. Gostaria de saber mais sobre este estilo!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#25D366] text-black text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Consultar estilo no WhatsApp</span>
                </a>
                <a
                  href={currentLightboxItem.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1a1d24] text-white text-xs font-medium hover:text-[#c99e64] border border-[#2c323e] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver original</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
