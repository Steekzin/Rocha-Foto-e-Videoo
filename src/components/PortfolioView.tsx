import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Search,
  MessageCircle,
  ExternalLink,
  Link as LinkIcon,
  ArrowLeft,
} from 'lucide-react';
import { PortfolioItem, PortfolioCategory, EventAlbum, EventAlbumPhoto } from '../types.js';
import { api } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';

/**
 * Higieniza e formata títulos para exibição profissional no portfólio.
 * Remove códigos brutos de câmeras e arquivos como "imgi 8 (33)", "DSC_0012", etc.
 */
export function formatDisplayTitle(rawTitle: string, category?: string, number?: string): string {
  if (!rawTitle) {
    return category ? (number ? `${category} #${number}` : category) : 'Fotografia';
  }

  const trimmed = rawTitle.trim();

  // Detect ugly camera/file names like "imgi 8 (33)", "imgi 10 P (68)", "DSC_0012", "IMG_4920", "foto (1)"
  const isCameraRaw =
    /^(imgi|img|dsc|_dsc|photo|foto|picture|p_)\s*[\d_\-\s]+(\([0-9]+\))?/i.test(trimmed) ||
    /^imgi\s+\d+/i.test(trimmed) ||
    /\([0-9]+\)$/.test(trimmed) ||
    /^[a-z0-9_\-\s]{1,15}\([0-9]+\)$/i.test(trimmed);

  if (isCameraRaw) {
    const num = number || trimmed.replace(/\D+/g, '').slice(0, 4) || '001';
    const formattedNum = String(num).padStart(3, '0');
    return category ? `${category} #${formattedNum}` : `Foto #${formattedNum}`;
  }

  return trimmed;
}

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
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Event Albums integration (as requested in user screenshots)
  const [eventAlbums, setEventAlbums] = useState<EventAlbum[]>([]);
  const [openedAlbum, setOpenedAlbum] = useState<EventAlbum | null>(null);
  const [albumLoading, setAlbumLoading] = useState<boolean>(false);
  const [albumLightboxIndex, setAlbumLightboxIndex] = useState<number | null>(null);

  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        const [catsData, photosData, albumsData] = await Promise.all([
          api.getPortfolioCategories(false),
          api.getPortfolio(),
          api.getEventAlbums(undefined, false).catch(() => []),
        ]);
        setCategories(catsData);
        setItems(photosData);
        setEventAlbums(albumsData || []);
      } catch (err) {
        console.error('Error loading portfolio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  const getAlbumForItem = (item: PortfolioItem): EventAlbum | undefined => {
    if (item.albumId) {
      const match = eventAlbums.find((a) => a.id === item.albumId);
      if (match) return match;
    }
    const byPhotoId = eventAlbums.find((a) => a.portfolioPhotoId && String(a.portfolioPhotoId) === String(item.id));
    if (byPhotoId) return byPhotoId;

    const cleanItemTitle = (item.title || '').trim().toLowerCase();
    const byTitle = eventAlbums.find(
      (a) => a.title.trim().toLowerCase() === cleanItemTitle || a.slug === item.id || a.id === item.id
    );
    if (byTitle) return byTitle;
    if (cleanItemTitle.includes('bruna') && cleanItemTitle.includes('charles')) {
      return eventAlbums.find((a) => a.id === 'album-civil-bruna-charles');
    }
    if (cleanItemTitle.includes('beatriz') || cleanItemTitle.includes('15 anos')) {
      return eventAlbums.find((a) => a.id === 'album-ensaio-15-anos-beatriz');
    }
    return undefined;
  };

  const handleOpenAlbum = async (album: EventAlbum) => {
    try {
      setAlbumLoading(true);
      const full = await api.getEventAlbum(album.id);
      setOpenedAlbum(full || album);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error loading album details:', err);
      setOpenedAlbum(album);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setAlbumLoading(false);
    }
  };

  // Keyboard navigation for album lightbox
  useEffect(() => {
    if (albumLightboxIndex === null || !openedAlbum?.photos) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlbumLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setAlbumLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % openedAlbum.photos!.length : null
        );
      }
      if (e.key === 'ArrowLeft') {
        setAlbumLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + openedAlbum.photos!.length) % openedAlbum.photos!.length : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [albumLightboxIndex, openedAlbum]);

  // Compute category counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { Todos: items.length };
    items.forEach((item) => {
      const cat = item.category || (item as any).categoryName;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Categories list ordered according to admin settings
  const allCategories = React.useMemo(() => {
    const catNames: string[] = ['Todos'];
    // Add active categories from admin in their defined order
    categories.forEach((c) => {
      if (c.active !== false && !catNames.includes(c.name)) {
        catNames.push(c.name);
      }
    });
    // Add any category that has items but might not be in categories table
    items.forEach((i) => {
      const cat = i.category || (i as any).categoryName;
      if (cat && !catNames.includes(cat)) {
        catNames.push(cat);
      }
    });
    return catNames;
  }, [categories, items]);

  const filteredItems = React.useMemo(() => {
    const toSlugSimple = (t: string) =>
      (t || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-');

    return items.filter((item) => {
      const itemCat = (item.category || (item as any).categoryName || '').trim();
      const matchesCategory =
        selectedCategory === 'Todos' ||
        itemCat.toLowerCase() === selectedCategory.toLowerCase() ||
        toSlugSimple(itemCat) === toSlugSimple(selectedCategory);
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        itemCat.toLowerCase().includes(q) ||
        (item.number && item.number.toLowerCase().includes(q)) ||
        (item.caption && item.caption.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [items, selectedCategory, searchQuery]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    // Smoothly ensure the photo section is in view
    if (galleryRef.current) {
      const rect = galleryRef.current.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight) {
        galleryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

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
      className={`w-full min-h-screen pt-12 pb-24 transition-colors ${
        isLight ? 'bg-white text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ========================================================= */}
        {/* VISTA 1: ÁLBUM DE EVENTO COMPLETO (CONFORME IMAGEM 2)    */}
        {/* ========================================================= */}
        {openedAlbum ? (
          <div>
            {/* Back Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setOpenedAlbum(null)}
                className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider py-2 px-3.5 rounded-lg border transition-all cursor-pointer ${
                  isLight
                    ? 'border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 bg-neutral-50'
                    : 'border-[#222730] text-neutral-400 hover:text-white hover:border-[#c99e64] bg-[#12151a]'
                }`}
              >
                <ChevronLeft className="w-4 h-4 text-[#c99e64]" />
                <span>Voltar ao Portfólio</span>
              </button>
            </div>

            {/* Album Header Centered (matching image_f77d7182.png) */}
            <header className="text-center max-w-4xl mx-auto mb-10">
              <h1
                className={`text-2xl sm:text-3xl md:text-4xl font-light tracking-wide transition-colors ${
                  isLight ? 'text-neutral-700' : 'text-neutral-200'
                }`}
              >
                {openedAlbum.title}
              </h1>
              {openedAlbum.description && (
                <p
                  className={`text-xs sm:text-sm font-light max-w-xl mx-auto mt-2 leading-relaxed ${
                    isLight ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  {openedAlbum.description}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-[#c99e64]">
                <span>{openedAlbum.category}</span>
                {openedAlbum.photos && (
                  <>
                    <span>•</span>
                    <span>{openedAlbum.photos.length} fotos registradas</span>
                  </>
                )}
              </div>
            </header>

            {/* Album Photos Grid */}
            {albumLoading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-[#c99e64] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-neutral-400 tracking-widest uppercase">Carregando álbum completo...</p>
              </div>
            ) : !openedAlbum.photos || openedAlbum.photos.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                Nenhuma fotografia cadastrada neste álbum ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {openedAlbum.photos.map((photo, pIdx) => (
                  <div
                    key={photo.id}
                    onClick={() => setAlbumLightboxIndex(pIdx)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl ${
                      isLight
                        ? 'bg-neutral-50 border-neutral-200 hover:border-[#c99e64]/60'
                        : 'bg-[#12151a] border-[#20252e] hover:border-[#c99e64]/60'
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#181b22]">
                      <img
                        src={photo.imageUrl}
                        alt={photo.title || `Foto ${pIdx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      {/* Hover overlay with center magnifying glass matching image_f77d7182.png */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Search className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* VISTA 2: GRADE DO PORTFÓLIO PRINCIPAL                    */
          /* ========================================================= */
          <div>
            {/* ========================================================= */}
            {/* HEADER DO PORTFÓLIO (ESTILO CONFORME REFERÊNCIA DO CLIENTE) */}
            {/* ========================================================= */}
            <header className="text-center max-w-4xl mx-auto mb-8 sm:mb-10">
              {/* Cursive / Script Title */}
              <h1
                className={`font-script text-5xl sm:text-6xl md:text-7xl font-normal tracking-wide transition-colors ${
                  isLight ? 'text-neutral-900' : 'text-white'
                }`}
              >
                Portfólio
              </h1>

          {/* Thin subtle centered divider */}
          <div
            className={`w-20 sm:w-24 h-[1.5px] mx-auto my-3 sm:my-4 transition-colors ${
              isLight ? 'bg-neutral-300' : 'bg-neutral-700'
            }`}
          />

          {/* Subtitle */}
          <p
            className={`text-sm sm:text-base md:text-lg font-light max-w-2xl mx-auto leading-relaxed transition-colors ${
              isLight ? 'text-neutral-600' : 'text-neutral-300'
            }`}
          >
            Veja aqui nossas fotos de eventos mais recentes. Em Montes Claros e Minas Gerais
          </p>

          {/* Search Toggle (Optional discreet search) */}
          <div className="mt-4 flex items-center justify-center">
            {!showSearch ? (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className={`inline-flex items-center gap-1.5 text-xs transition-colors py-1 px-3 rounded-full border ${
                  isLight
                    ? 'border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 bg-neutral-50'
                    : 'border-[#222730] text-neutral-400 hover:text-white hover:border-neutral-600 bg-[#12151a]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar por nome ou momento</span>
              </button>
            ) : (
              <div className="relative w-full max-w-sm mx-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar fotografias..."
                  autoFocus
                  className={`w-full pl-4 pr-10 py-1.5 text-xs rounded-full border transition-colors ${
                    isLight
                      ? 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-[#c99e64]'
                      : 'bg-[#14171d] border-[#2a2f3b] text-white placeholder-neutral-500 focus:border-[#c99e64]'
                  } focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* CATEGORIAS EM LINHA (INLINE WRAP LINKS CONFORME REFERÊNCIA) */}
        {/* ========================================================= */}
        <nav
          aria-label="Categorias do Portfólio"
          className="flex flex-wrap justify-center items-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-2.5 max-w-5xl mx-auto px-2 sm:px-4 mb-10 sm:mb-12 text-center"
        >
          {allCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            const displayName = cat === 'Todos' ? 'Mostrar Todos' : cat;

            return (
              <button
                key={cat}
                type="button"
                id={`cat-btn-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                onClick={() => handleSelectCategory(cat)}
                className={`text-xs sm:text-[13.5px] transition-all duration-200 cursor-pointer relative py-1 px-1 whitespace-nowrap ${
                  isActive
                    ? isLight
                      ? 'text-neutral-950 font-semibold underline underline-offset-8 decoration-[#c99e64] decoration-2'
                      : 'text-white font-semibold underline underline-offset-8 decoration-[#c99e64] decoration-2'
                    : isLight
                    ? 'text-neutral-600 hover:text-neutral-950 hover:underline hover:underline-offset-8 hover:decoration-neutral-300'
                    : 'text-neutral-400 hover:text-white hover:underline hover:underline-offset-8 hover:decoration-neutral-600'
                }`}
              >
                <span>{displayName}</span>
              </button>
            );
          })}
        </nav>

        {/* Anchor for smooth scroll on category selection */}
        <div ref={galleryRef} />

        {/* ========================================================= */}
        {/* GRADE DE FOTOGRAFIAS COM TRANSIÇÃO ANIMADA PUXADA */}
        {/* ========================================================= */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#c99e64] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-400 tracking-widest uppercase">Carregando portfólio...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            className={`py-16 text-center rounded-2xl border p-8 max-w-md mx-auto ${
              isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-[#111317] border-[#20242c]'
            }`}
          >
            <Camera className="w-10 h-10 text-[#c99e64] mx-auto mb-3 opacity-60" />
            <h3 className={`text-base font-serif-luxury ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              Nenhuma fotografia encontrada
            </h3>
            <p className={`text-xs mt-1 mb-4 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              {searchQuery
                ? `Não encontramos fotos para "${searchQuery}".`
                : `Nenhuma fotografia catalogada em "${selectedCategory}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Todos');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-[#c99e64] text-neutral-950 rounded-full text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Mostrar Todos ({items.length})
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory + (searchQuery ? `-${searchQuery}` : '')}
              initial={{ opacity: 0, y: 36, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredItems.map((item, index) => {
                const album = getAlbumForItem(item);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.35) }}
                    onClick={() => openLightbox(index)}
                    className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl ${
                      isLight
                        ? 'bg-neutral-50 border-neutral-200/80 hover:border-[#c99e64]/60'
                        : 'bg-[#12151a] border-[#20252e] hover:border-[#c99e64]/60'
                    }`}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#181b22]">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="%2312151a"/><circle cx="400" cy="460" r="44" fill="none" stroke="%23c99e64" stroke-width="2" opacity="0.6"/><circle cx="400" cy="460" r="18" fill="%23c99e64" opacity="0.6"/><text x="50%" y="550" dominant-baseline="middle" text-anchor="middle" fill="%23c99e64" font-family="sans-serif" font-size="16" letter-spacing="3" opacity="0.8">ROCHA FOTO &amp; VÍDEO</text></svg>';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-70 group-hover:opacity-95 transition-opacity" />

                      {/* Category pill & Visual Number */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                        <span className="px-2.5 py-0.5 bg-black/70 backdrop-blur-md rounded-full text-[10px] uppercase tracking-wider text-[#c99e64] font-medium border border-[#c99e64]/30">
                          {item.category}
                        </span>
                        {item.number && (
                          <span className="px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-full text-[10px] font-mono font-bold text-white/90 border border-white/15">
                            #{item.number}
                          </span>
                        )}
                      </div>

                      {/* Featured badge if marked */}
                      {item.featured && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#c99e64] text-black rounded-full text-[9px] uppercase font-bold tracking-wider z-10">
                          Destaque
                        </span>
                      )}

                      {/* ========================================================= */}
                      {/* OVERLAY CENTRAL EXATAMENTE CONFORME IMAGEM 1 DO USUÁRIO   */}
                      {/* Título centralizado + Ícone de Elo (🔗) + Lupa (🔍)       */}
                      {/* ========================================================= */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center z-20">
                        <h3 className="text-base sm:text-lg md:text-xl font-normal text-white drop-shadow leading-snug max-w-[90%] mb-3">
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-center gap-5">
                          {album && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAlbum(album);
                              }}
                              className="p-2 rounded-full text-white hover:text-[#c99e64] hover:scale-125 transition-all cursor-pointer"
                              title="Abrir álbum de fotos deste evento"
                            >
                              <LinkIcon className="w-5 h-5 -rotate-45" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLightbox(index);
                            }}
                            className="p-2 rounded-full text-white hover:text-[#c99e64] hover:scale-125 transition-all cursor-pointer"
                            title="Ampliar fotografia"
                          >
                            <Search className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Title & Caption (Visible when not hovered) */}
                      <div className="absolute bottom-3 left-3 right-3 text-left z-10 group-hover:opacity-0 transition-opacity">
                        <h3 className="text-sm font-serif-luxury text-white leading-snug line-clamp-1">
                          {formatDisplayTitle(item.title, item.category, item.number)}
                        </h3>
                        {item.caption && (
                          <p className="text-[11px] text-[#9ca3af] mt-0.5 line-clamp-1">
                            {item.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    )}
  </div>

      {/* ========================================================= */}
      {/* LIGHTBOX MODAL DE VISUALIZAÇÃO AMPLIADA */}
      {/* ========================================================= */}
      {currentLightboxItem && (
        <div
          id="lightbox-overlay"
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-5 right-5 z-20 p-2.5 text-gray-300 hover:text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer shadow-lg"
            aria-label="Fechar ampliação"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev button */}
          <button
            type="button"
            onClick={prevPhoto}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next button */}
          <button
            type="button"
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
                  Foto {(lightboxIndex ?? 0) + 1} de {filteredItems.length}
                </span>
                {currentLightboxItem.number && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-[11px] font-mono text-[#c99e64] font-bold">
                      #{currentLightboxItem.number}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-serif-luxury text-white">
                {formatDisplayTitle(currentLightboxItem.title, currentLightboxItem.category, currentLightboxItem.number)}
              </h2>
              {currentLightboxItem.caption && (
                <p className="text-xs text-[#9ca3af] mt-1 max-w-lg mx-auto">
                  {currentLightboxItem.caption}
                </p>
              )}

              {/* Action Buttons in Lightbox */}
              <div className="mt-3 flex items-center justify-center gap-3">
                <a
                  href={`https://wa.me/5538991065054?text=${encodeURIComponent(
                    `Olá, Rocha Foto & Vídeo! Adorei a foto "${formatDisplayTitle(currentLightboxItem.title, currentLightboxItem.category, currentLightboxItem.number)}" da categoria ${currentLightboxItem.category} (Ref: #${currentLightboxItem.number || '001'}). Gostaria de solicitar um orçamento para meu evento!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#25D366] text-black text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Consultar no WhatsApp</span>
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

      {/* ========================================================= */}
      {/* LIGHTBOX MODAL PARA AS FOTOS DO ÁLBUM DE EVENTO           */}
      {/* ========================================================= */}
      {albumLightboxIndex !== null && openedAlbum?.photos && (
        <div
          onClick={() => setAlbumLightboxIndex(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setAlbumLightboxIndex(null)}
            className="absolute top-5 right-5 z-20 p-2.5 text-gray-300 hover:text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer shadow-lg"
            aria-label="Fechar ampliação"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation buttons */}
          {openedAlbum.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumLightboxIndex(
                    (albumLightboxIndex - 1 + openedAlbum.photos!.length) % openedAlbum.photos!.length
                  );
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer shadow-lg"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumLightboxIndex((albumLightboxIndex + 1) % openedAlbum.photos!.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white bg-[#1a1d24]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-all cursor-pointer shadow-lg"
                aria-label="Próxima foto"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image & Caption */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full max-h-[92vh] flex flex-col items-center"
          >
            <div className="relative max-h-[75vh] flex items-center justify-center">
              <img
                src={openedAlbum.photos[albumLightboxIndex].imageUrl}
                alt={openedAlbum.photos[albumLightboxIndex].title || openedAlbum.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-2xl border border-[#262a32]"
              />
            </div>
            <div className="mt-4 text-center max-w-2xl w-full px-4 text-white">
              <p className="text-[11px] text-[#c99e64] uppercase tracking-widest font-semibold">
                {openedAlbum.title} • Foto {albumLightboxIndex + 1} de {openedAlbum.photos.length}
              </p>
              {openedAlbum.photos[albumLightboxIndex].title && (
                <h3 className="text-base font-serif-luxury mt-1">
                  {openedAlbum.photos[albumLightboxIndex].title}
                </h3>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
