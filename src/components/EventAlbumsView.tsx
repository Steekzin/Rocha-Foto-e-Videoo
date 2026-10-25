import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Link as LinkIcon,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Camera,
  Calendar,
  Layers,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { EventAlbum, EventAlbumPhoto } from '../types.js';
import { api } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';

interface EventAlbumsViewProps {
  onContactClick?: () => void;
}

export const EventAlbumsView: React.FC<EventAlbumsViewProps> = ({ onContactClick }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [albums, setAlbums] = useState<EventAlbum[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [openedAlbum, setOpenedAlbum] = useState<EventAlbum | null>(null);

  // Lightbox for cover or album photos
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const data = await api.getEventAlbums();
      setAlbums(data || []);
    } catch (err: any) {
      console.error('Error fetching event albums:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAlbum = async (album: EventAlbum) => {
    try {
      setLoading(true);
      const full = await api.getEventAlbum(album.id);
      setOpenedAlbum(full || album);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.warn('Could not fetch full album, using local album data:', err);
      setOpenedAlbum(album);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCoverZoom = (album: EventAlbum, e: React.MouseEvent) => {
    e.stopPropagation();
    const cover = album.coverImage || (album.photos && album.photos[0]?.imageUrl);
    if (cover) {
      setLightboxImages([cover]);
      setLightboxIndex(0);
      setLightboxTitle(album.title);
    }
  };

  const handleOpenPhotoZoom = (index: number) => {
    if (!openedAlbum || !openedAlbum.photos || openedAlbum.photos.length === 0) return;
    const images = openedAlbum.photos.map((p) => p.imageUrl);
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxTitle(openedAlbum.photos[index]?.title || openedAlbum.title);
  };

  const handleCloseLightbox = () => {
    setLightboxIndex(null);
    setLightboxImages([]);
  };

  const handlePrevImage = () => {
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length);
    }
  };

  const handleNextImage = () => {
    if (lightboxIndex !== null && lightboxImages.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % lightboxImages.length);
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') handleCloseLightbox();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, lightboxImages]);

  // Categories list
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    albums.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [albums]);

  const filteredAlbums = React.useMemo(() => {
    if (selectedCategory === 'Todos') return albums;
    return albums.filter((a) => a.category?.toLowerCase() === selectedCategory.toLowerCase());
  }, [albums, selectedCategory]);

  // =========================================================
  // VIEW: SINGLE EVENT ALBUM PAGE (MATCHING IMAGE 2 EXACTLY)
  // =========================================================
  if (openedAlbum) {
    const photos = openedAlbum.photos || [];

    return (
      <div
        className={`w-full min-h-screen pt-8 pb-24 transition-colors ${
          isLight ? 'bg-white text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Navigation Button */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setOpenedAlbum(null)}
              className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider py-2 px-4 rounded-full border transition-all cursor-pointer ${
                isLight
                  ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-300 text-neutral-800'
                  : 'bg-[#14171d] hover:bg-[#1f242d] border-[#2b313d] text-neutral-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#c99e64]" />
              <span>Voltar para Todos os Álbuns</span>
            </button>

            <span className="text-xs text-[#828a95] font-mono">
              {photos.length} fotografias neste evento
            </span>
          </div>

          {/* Centered Event Title Matching Image 2 */}
          <header className="text-center max-w-4xl mx-auto mb-10">
            <h1
              className={`font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-normal tracking-wide transition-colors ${
                isLight ? 'text-neutral-900' : 'text-white'
              }`}
            >
              {openedAlbum.title}
            </h1>

            {/* Subtle Divider */}
            <div
              className={`w-16 h-[1.5px] mx-auto my-3 transition-colors ${
                isLight ? 'bg-neutral-300' : 'bg-[#c99e64]/60'
              }`}
            />

            {openedAlbum.date && (
              <p className="text-xs text-[#828a95] uppercase tracking-widest font-mono">
                {openedAlbum.category} • {openedAlbum.date}
              </p>
            )}

            {openedAlbum.description && (
              <p className="text-xs sm:text-sm text-[#9ca3af] mt-2 max-w-2xl mx-auto leading-relaxed">
                {openedAlbum.description}
              </p>
            )}
          </header>

          {/* Event Photos Masonry / Grid Matching Image 2 */}
          {photos.length === 0 ? (
            <div className="py-20 text-center bg-[#12151a] rounded-2xl border border-[#20252e] max-w-md mx-auto p-8">
              <Camera className="w-8 h-8 text-[#c99e64] mx-auto mb-2 opacity-60" />
              <h4 className="text-sm font-serif-luxury text-white">Nenhuma foto adicionada neste álbum ainda</h4>
              <p className="text-xs text-[#9ca3af] mt-1">
                Adicione fotos a este evento pelo Painel Administrativo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => handleOpenPhotoZoom(index)}
                  className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all duration-300 shadow-sm hover:shadow-2xl ${
                    isLight
                      ? 'bg-neutral-50 border-neutral-200/80 hover:border-[#c99e64]/60'
                      : 'bg-[#12151a] border-[#20252e] hover:border-[#c99e64]/60'
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-black">
                    <img
                      src={photo.imageUrl}
                      alt={photo.title || `Foto #${index + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Dark overlay on hover matching image 2 with center magnifying glass 🔍 */}
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Back Button & Call to Action */}
          <div className="mt-16 text-center pt-8 border-t border-[#20252e]">
            <button
              onClick={() => setOpenedAlbum(null)}
              className="px-6 py-3 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#c99e64]/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Outros Trabalhos & Álbuns</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LIGHTBOX MODAL */}
        {/* ========================================================= */}
        <AnimatePresence>
          {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
              onClick={handleCloseLightbox}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Navigation Arrows */}
              {lightboxImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-[#c99e64] text-white hover:text-black transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-[#c99e64] text-white hover:text-black transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Main Image in Lightbox */}
              <div
                className="relative max-w-5xl max-h-[85vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={lightboxImages[lightboxIndex]}
                  alt={lightboxTitle}
                  className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
                />

                <div className="mt-3 text-center">
                  <p className="text-sm font-serif-luxury text-white">
                    {lightboxTitle} ({lightboxIndex + 1} de {lightboxImages.length})
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================
  // VIEW: MAIN GRID OF ALBUMS (MATCHING IMAGE 1 EXACTLY)
  // =========================================================
  return (
    <div
      className={`w-full min-h-screen pt-12 pb-24 transition-colors ${
        isLight ? 'bg-white text-[#111827]' : 'bg-[#0c0d0e] text-[#f3f4f6]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center max-w-4xl mx-auto mb-10">
          <h1
            className={`font-script text-5xl sm:text-6xl md:text-7xl font-normal tracking-wide transition-colors ${
              isLight ? 'text-neutral-900' : 'text-white'
            }`}
          >
            Álbuns de Eventos
          </h1>

          <div
            className={`w-20 sm:w-24 h-[1.5px] mx-auto my-3 sm:my-4 transition-colors ${
              isLight ? 'bg-neutral-300' : 'bg-neutral-700'
            }`}
          />

          <p
            className={`text-sm sm:text-base font-light max-w-2xl mx-auto leading-relaxed transition-colors ${
              isLight ? 'text-neutral-600' : 'text-neutral-300'
            }`}
          >
            Explore a cobertura fotográfica completa dos nossos casamentos, debutantes e celebrações especiais.
            Clique no ícone de elo (🔗) para abrir o álbum completo com todas as fotos tiradas.
          </p>
        </header>

        {/* Category Filter Pills */}
        {categories.length > 1 && (
          <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#c99e64] text-[#0c0d0e] shadow-md shadow-[#c99e64]/20'
                    : isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    : 'bg-[#14171d] hover:bg-[#1f242d] text-neutral-300 border border-[#2b313d]'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        )}

        {/* Grid of Event Albums Matching Image 1 */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#c99e64] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-400 tracking-widest uppercase">Carregando trabalhos...</p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <Camera className="w-10 h-10 text-[#c99e64] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-serif-luxury text-white">Nenhum álbum nesta categoria</h3>
            <p className="text-xs text-neutral-400 mt-1">Selecione outra categoria ou veja todos os álbuns.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAlbums.map((album) => {
              const photoCount = Array.isArray(album.photos) ? album.photos.length : album.photoCount || 0;

              return (
                <div
                  key={album.id}
                  onClick={() => handleOpenAlbum(album)}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 aspect-[3/4] bg-[#12151a]"
                >
                  {/* Cover Image */}
                  <img
                    src={album.coverImage || (album.photos && album.photos[0]?.imageUrl) || ''}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

                  {/* Centered Content Matching Image 1: Title & Two Icons (🔗 and 🔍) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                    {/* Title with exact luxury typography as in image 1 */}
                    <h2 className="font-serif-luxury text-2xl sm:text-3xl text-white font-medium tracking-wide drop-shadow-md mb-4 group-hover:text-[#c99e64] transition-colors">
                      {album.title}
                    </h2>

                    {/* Centered Floating Icons: Link/Corrente (🔗) and Lupa (🔍) */}
                    <div className="flex items-center gap-4">
                      {/* 1. Link / Pareamento Icon (🔗) -> Opens the Full Album with all photos */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAlbum(album);
                        }}
                        className="w-11 h-11 rounded-full bg-white/15 hover:bg-[#c99e64] backdrop-blur-md flex items-center justify-center text-white hover:text-black transition-all duration-300 border border-white/20 hover:border-[#c99e64] hover:scale-110 shadow-lg"
                        title="Abrir álbum completo com todas as fotos (🔗)"
                      >
                        <LinkIcon className="w-5 h-5" />
                      </button>

                      {/* 2. Magnifier Icon (🔍) -> Opens zoom preview of cover in lightbox */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenCoverZoom(album, e)}
                        className="w-11 h-11 rounded-full bg-white/15 hover:bg-[#c99e64] backdrop-blur-md flex items-center justify-center text-white hover:text-black transition-all duration-300 border border-white/20 hover:border-[#c99e64] hover:scale-110 shadow-lg"
                        title="Ampliar foto de capa (🔍)"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Subtitle / Category at bottom */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] text-[#c99e64] font-medium tracking-wider uppercase">
                      <span>{album.category}</span>
                      <span className="font-mono text-white/80">{photoCount} fotos no álbum</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* LIGHTBOX MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={handleCloseLightbox}
          >
            <button
              type="button"
              onClick={handleCloseLightbox}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              className="relative max-w-5xl max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImages[lightboxIndex]}
                alt={lightboxTitle}
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />

              <div className="mt-3 text-center">
                <p className="text-sm font-serif-luxury text-white">
                  {lightboxTitle}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
