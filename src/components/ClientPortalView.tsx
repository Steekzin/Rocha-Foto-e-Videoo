import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  Key,
  BookmarkCheck,
  Check,
  Plus,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Shield,
  Search,
  Filter,
} from 'lucide-react';
import { Gallery, Photo, PhotoEvent, SelectedPhotoItem, User } from '../types.js';
import { api } from '../services/api.js';
import { MyAlbumDrawer } from './MyAlbumDrawer.js';
import { ReviewSelectionModal } from './ReviewSelectionModal.js';
import { useTheme } from '../context/ThemeContext.js';
import { RochaLogo } from './RochaLogo.js';

interface ClientPortalViewProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedPhotos: SelectedPhotoItem[];
  setSelectedPhotos: React.Dispatch<React.SetStateAction<SelectedPhotoItem[]>>;
  isAlbumDrawerOpen: boolean;
  setIsAlbumDrawerOpen: (open: boolean) => void;
  onGoToAdmin?: () => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  currentUser,
  setCurrentUser,
  selectedPhotos,
  setSelectedPhotos,
  isAlbumDrawerOpen,
  setIsAlbumDrawerOpen,
  onGoToAdmin,
}) => {
  const { theme } = useTheme();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Client data state
  const [clientEvents, setClientEvents] = useState<PhotoEvent[]>([]);
  const [clientGalleries, setClientGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<(Gallery & { photos: Photo[] }) | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Gallery view filter & search
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');
  const [searchNumber, setSearchNumber] = useState('');

  // Lightbox view state
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Review Modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Load client data when logged in
  useEffect(() => {
    if (currentUser && currentUser.role === 'client' && currentUser.clientId) {
      loadClientDashboard(currentUser.clientId);
    }
  }, [currentUser]);

  const loadClientDashboard = async (clientId: string) => {
    try {
      setLoadingData(true);
      const [events, galleries] = await Promise.all([
        api.getEvents(clientId),
        api.getGalleries(clientId),
      ]);
      setClientEvents(events);
      setClientGalleries(galleries);

      // Auto open first gallery if only one exists
      if (galleries.length === 1 && !selectedGallery) {
        openGallery(galleries[0].id);
      }
    } catch (err) {
      console.error('Error loading client dashboard:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await api.login(email, password);
      setCurrentUser(res.user);
      localStorage.setItem('rocha_user', JSON.stringify(res.user));
    } catch (err: any) {
      setLoginError(err.message || 'Credenciais inválidas.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    api.login(demoEmail, demoPass).then((res) => {
      setCurrentUser(res.user);
      localStorage.setItem('rocha_user', JSON.stringify(res.user));
    }).catch((err) => {
      setLoginError(err.message);
    });
  };

  const openGallery = async (galleryId: string) => {
    try {
      setLoadingData(true);
      const data = await api.getGallery(galleryId);
      setSelectedGallery(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Erro ao carregar fotos da galeria.');
    } finally {
      setLoadingData(false);
    }
  };

  const togglePhotoSelection = (photo: Photo) => {
    const isSelected = selectedPhotos.some((p) => p.photoId === photo.id);
    if (isSelected) {
      setSelectedPhotos(selectedPhotos.filter((p) => p.photoId !== photo.id));
    } else {
      setSelectedPhotos([
        ...selectedPhotos,
        {
          photoId: photo.id,
          number: photo.number,
          imageUrl: photo.imageUrl,
          price: photo.price,
          description: photo.description,
        },
      ]);
    }
  };

  const isPhotoSelected = (photoId: string) => {
    return selectedPhotos.some((p) => p.photoId === photoId);
  };

  // Filtered photos for gallery view
  const displayedPhotos = selectedGallery?.photos.filter((photo) => {
    const matchesFilter = filterMode === 'all' || isPhotoSelected(photo.id);
    const matchesSearch = searchNumber
      ? photo.number.includes(searchNumber.trim())
      : true;
    return matchesFilter && matchesSearch;
  }) || [];

  // ==========================================
  // VIEW A: LOGIN SCREEN IF NOT AUTHENTICATED
  // ==========================================
  if (!currentUser || currentUser.role !== 'client') {
    const isLight = theme === 'light';
    return (
      <div
        className={`w-full min-h-[85vh] flex items-center justify-center p-4 sm:p-8 transition-colors ${
          isLight ? 'bg-[#f8f9fa]' : 'bg-[#0c0d0e]'
        }`}
      >
        <div
          className={`max-w-md w-full rounded-3xl p-6 sm:p-9 shadow-2xl transition-all border ${
            isLight
              ? 'bg-white border-[#e5e7eb] shadow-xl text-gray-900'
              : 'bg-[#121418] border-[#232832] shadow-2xl text-white'
          }`}
        >
          {/* Studio Brand Logo Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="mb-4">
              <RochaLogo
                size="md"
                themeMode={theme}
                className="hover:scale-105 transition-transform"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c99e64]/10 border border-[#c99e64]/20 text-[#c99e64] text-[11px] font-semibold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Área Privada do Cliente</span>
            </div>
            <h1
              className={`font-serif-luxury text-2xl sm:text-3xl font-normal ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}
            >
              Acesse Sua Galeria
            </h1>
            <p className={`text-xs mt-1.5 max-w-xs ${isLight ? 'text-gray-500' : 'text-[#9ca3af]'}`}>
              Digite o e-mail e a senha fornecidos pela Rocha Foto & Vídeo para selecionar suas fotos.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-xs font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                  isLight ? 'text-gray-600' : 'text-[#9ca3af]'
                }`}
              >
                E-mail de Acesso
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="client-email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: cliente@email.com"
                  className={`w-full rounded-xl px-4 py-3 text-xs transition-colors focus:outline-none focus:border-[#c99e64] border ${
                    isLight
                      ? 'bg-[#f4f5f7] border-gray-200 text-gray-900 placeholder-gray-400'
                      : 'bg-[#0a0c0e] border-[#262b35] text-white placeholder-[#525a66]'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider ${
                    isLight ? 'text-gray-600' : 'text-[#9ca3af]'
                  }`}
                >
                  Senha de Acesso
                </label>
                <span className="text-[10px] text-[#c99e64]">Fornecida pelo estúdio</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  id="client-password-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full rounded-xl px-4 py-3 text-xs font-mono transition-colors focus:outline-none focus:border-[#c99e64] border ${
                    isLight
                      ? 'bg-[#f4f5f7] border-gray-200 text-gray-900 placeholder-gray-400'
                      : 'bg-[#0a0c0e] border-[#262b35] text-white placeholder-[#525a66]'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-client-login"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#c99e64]/20 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? 'Acessando galeria...' : 'Entrar na Galeria'}
            </button>
          </form>

          {/* Quick Support & Forgotten Password Notice */}
          <div
            className={`mt-6 p-3.5 rounded-xl border text-center text-xs space-y-1 ${
              isLight
                ? 'bg-amber-50/60 border-amber-200/70 text-amber-900'
                : 'bg-[#181a20] border-[#2a2f3b] text-gray-300'
            }`}
          >
            <p className="font-semibold text-[11px] text-[#c99e64]">Perdeu ou esqueceu sua senha?</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              O fotógrafo possui acesso instantâneo às suas credenciais no painel e pode visualizá-la ou gerar uma nova para você via WhatsApp.
            </p>
          </div>

          {/* Demonstration Quick Access Credentials */}
          <div
            className={`mt-6 pt-5 border-t ${
              isLight ? 'border-gray-200' : 'border-[#1e232b]'
            }`}
          >
            <p
              className={`text-[10px] uppercase tracking-wider font-semibold text-center mb-2.5 ${
                isLight ? 'text-gray-500' : 'text-[#828a95]'
              }`}
            >
              Acesso Rápido de Demonstração:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                id="btn-demo-client-1"
                onClick={() => handleQuickLogin('mariana@email.com', 'cliente123')}
                className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors flex items-center justify-between border ${
                  isLight
                    ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                    : 'bg-[#171a20] hover:bg-[#20252e] border-[#252a35] text-[#d1d5db]'
                }`}
              >
                <div>
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Mariana & Lucas
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-[#9ca3af]'}`}>
                    Casamento (Com Preços Definidos)
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#c99e64]" />
              </button>

              <button
                type="button"
                id="btn-demo-client-2"
                onClick={() => handleQuickLogin('beatriz@email.com', 'cliente123')}
                className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors flex items-center justify-between border ${
                  isLight
                    ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
                    : 'bg-[#171a20] hover:bg-[#20252e] border-[#252a35] text-[#d1d5db]'
                }`}
              >
                <div>
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Beatriz Vasconcelos
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-[#9ca3af]'}`}>
                    15 Anos Studio (Sem Preços / Sob Consulta)
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#c99e64]" />
              </button>
            </div>

            {onGoToAdmin && (
              <div
                className={`mt-4 pt-4 border-t text-center ${
                  isLight ? 'border-gray-200' : 'border-[#1e232b]'
                }`}
              >
                <button
                  type="button"
                  id="btn-switch-to-admin"
                  onClick={onGoToAdmin}
                  className="inline-flex items-center gap-1.5 text-xs text-[#c99e64] hover:underline font-medium cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Acesso do Fotógrafo / Administrador</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: AUTHENTICATED CLIENT DASHBOARD
  // ==========================================
  return (
    <div className="w-full bg-[#0c0d0e] text-[#f3f4f6] min-h-screen pb-24">
      {/* Top Banner with Client Greeting & Selection Bar */}
      <div className="bg-[#12151a] border-b border-[#20252e] py-6 px-4 sm:px-6 lg:px-8 sticky top-20 z-30 backdrop-blur-md bg-[#12151a]/95">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-[#c99e64] font-semibold">
                Área Privada
              </span>
              <span className="text-xs text-[#6b7280]">•</span>
              <span className="text-xs text-[#9ca3af]">{currentUser.name}</span>
            </div>
            <h1 className="font-serif-luxury text-xl sm:text-2xl text-white font-normal mt-0.5">
              {selectedGallery ? selectedGallery.title : 'Suas Galerias Fotográficas'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {selectedGallery && (
              <button
                onClick={() => setSelectedGallery(null)}
                className="px-3 py-1.5 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] rounded-lg text-xs text-[#d1d5db] transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trocar Galeria</span>
              </button>
            )}

            {/* Meu Álbum Trigger */}
            <button
              id="btn-open-album-banner"
              onClick={() => setIsAlbumDrawerOpen(true)}
              className="px-4 py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-md shadow-[#c99e64]/20 flex items-center gap-2 cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Meu Álbum ({selectedPhotos.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* If no gallery is currently selected, show list of client's galleries */}
        {!selectedGallery ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-serif-luxury text-white mb-1">
                Eventos e Galerias Liberados para Você
              </h2>
              <p className="text-xs text-[#9ca3af]">
                Clique para abrir a galeria correspondente e começar a escolher suas fotos.
              </p>
            </div>

            {loadingData ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-[#c99e64] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#9ca3af]">Carregando suas galerias...</p>
              </div>
            ) : clientGalleries.length === 0 ? (
              <div className="py-16 text-center bg-[#121418] rounded-2xl border border-[#232832] p-8 max-w-md mx-auto">
                <Layers className="w-12 h-12 text-[#c99e64] mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-serif-luxury text-white">Nenhuma galeria liberada no momento</h3>
                <p className="text-xs text-[#9ca3af] mt-2">
                  Suas fotografias estão em fase de edição e tratamento no estúdio. Assim que
                  liberadas pela Rocha Foto & Vídeo, aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientGalleries.map((gal) => (
                  <div
                    key={gal.id}
                    onClick={() => openGallery(gal.id)}
                    className="bg-[#13161c] border border-[#222731] hover:border-[#c99e64]/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-lg group"
                  >
                    <div className="h-52 overflow-hidden relative">
                      {gal.coverImage ? (
                        <img
                          src={gal.coverImage}
                          alt={gal.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1a1e26] flex items-center justify-center text-[#9ca3af]">
                          Sem capa
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#13161c] via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] uppercase tracking-wider text-[#c99e64] font-semibold border border-[#c99e64]/30">
                        {gal.photoCount} Fotos Disponíveis
                      </span>
                    </div>

                    <div className="p-5">
                      <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider block mb-1">
                        Evento: {gal.eventName}
                      </span>
                      <h3 className="text-base font-serif-luxury text-white group-hover:text-[#c99e64] transition-colors">
                        {gal.title}
                      </h3>

                      <div className="mt-3 pt-3 border-t border-[#20252e] flex items-center justify-between text-xs">
                        <span className="text-[#828a95]">
                          {gal.pricingType === 'fixed'
                            ? `R$ ${gal.defaultPrice?.toFixed(2).replace('.', ',')} por foto`
                            : 'Orçamento sob consulta'}
                        </span>
                        <span className="text-[#c99e64] font-semibold flex items-center gap-1">
                          Acessar <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SINGLE GALLERY PHOTOS BROWSER */
          <div>
            {/* Gallery Info & Filtering Controls */}
            <div className="bg-[#12151a] p-4 sm:p-5 rounded-2xl border border-[#20252e] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{selectedGallery.eventName}</span>
                  <span className="text-xs text-[#6b7280]">•</span>
                  <span className="text-xs text-[#9ca3af]">
                    {selectedGallery.pricingType === 'fixed'
                      ? `Preço padrão: R$ ${selectedGallery.defaultPrice?.toFixed(2).replace('.', ',')} / foto`
                      : 'Seleção sem preço (orçamento posterior)'}
                  </span>
                </div>
                <p className="text-xs text-[#828a95]">
                  Clique na fotografia para ampliá-la ou utilize o botão no canto de cada foto para
                  adicionar ao seu álbum.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Search by photo number */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar Nº (ex: 007)"
                    value={searchNumber}
                    onChange={(e) => setSearchNumber(e.target.value)}
                    className="bg-[#0c0e11] border border-[#242933] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#525a66] w-32 sm:w-36 focus:outline-none focus:border-[#c99e64]"
                  />
                </div>

                {/* Filter mode toggles */}
                <div className="inline-flex rounded-lg bg-[#0c0e11] p-1 border border-[#242933]">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filterMode === 'all'
                        ? 'bg-[#c99e64] text-[#0c0d0e] font-semibold'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    Todas ({selectedGallery.photos.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('selected')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filterMode === 'selected'
                        ? 'bg-[#c99e64] text-[#0c0d0e] font-semibold'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    Escolhidas ({selectedPhotos.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Photos Grid with numbers visible as requested in Section 12 */}
            {displayedPhotos.length === 0 ? (
              <div className="py-20 text-center bg-[#12151a] rounded-2xl border border-[#20252e] p-8 max-w-md mx-auto">
                <Info className="w-10 h-10 text-[#c99e64] mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-serif-luxury text-white">Nenhuma foto encontrada com este filtro</h4>
                <p className="text-xs text-[#9ca3af] mt-1 mb-4">
                  {filterMode === 'selected'
                    ? 'Você ainda não marcou nenhuma fotografia no seu álbum.'
                    : 'Verifique a numeração digitada na busca.'}
                </p>
                {filterMode === 'selected' && (
                  <button
                    onClick={() => setFilterMode('all')}
                    className="px-4 py-2 bg-[#c99e64] text-[#0c0d0e] text-xs font-bold uppercase tracking-wider rounded-full"
                  >
                    Ver Todas as Fotos
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {displayedPhotos.map((photo, index) => {
                  const isSelected = isPhotoSelected(photo.id);
                  return (
                    <div
                      key={photo.id}
                      id={`client-photo-card-${photo.number}`}
                      className={`relative bg-[#13161c] rounded-xl overflow-hidden border transition-all duration-300 group shadow-md ${
                        isSelected
                          ? 'border-[#c99e64] ring-2 ring-[#c99e64]/30'
                          : 'border-[#222731] hover:border-[#384050]'
                      }`}
                    >
                      {/* Photo Thumbnail */}
                      <div
                        onClick={() => setActivePhotoIndex(index)}
                        className="relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#0a0c0e]"
                      >
                        <img
                          src={photo.imageUrl}
                          alt={`Foto #${photo.number}`}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        {/* Top Visible Number badge (#001, #002...) as required */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/10 font-mono text-xs font-bold text-[#c99e64] shadow-sm">
                          #{photo.number}
                        </div>

                        {/* Expand prompt on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1">
                            <Maximize2 className="w-3 h-3 text-[#c99e64]" />
                            Ampliar
                          </span>
                        </div>
                      </div>

                      {/* Card Bottom Control */}
                      <div className="p-3 bg-[#13161c] border-t border-[#1e232c] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-white block">
                            Foto #{photo.number}
                          </span>
                          {typeof photo.price === 'number' && photo.price > 0 ? (
                            <span className="text-[11px] text-[#9ca3af]">
                              R$ {photo.price.toFixed(2).replace('.', ',')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#6b7280]">Incluso no pacote</span>
                          )}
                        </div>

                        {/* Quick Selection Button */}
                        <button
                          id={`btn-select-photo-${photo.number}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelection(photo);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-[#c99e64] text-[#0c0d0e] shadow-md shadow-[#c99e64]/20'
                              : 'bg-[#1e232b] text-[#d1d5db] hover:bg-[#2a303c] border border-[#2f3542]'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Escolhida</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Escolher</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX FOR CLIENT (With #Number, Description, Optional Price and Selection Action) */}
      {activePhotoIndex !== null && displayedPhotos[activePhotoIndex] && (
        <div
          id="client-lightbox-overlay"
          onClick={() => setActivePhotoIndex(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          {/* Close */}
          <button
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-6 right-6 z-10 p-2 text-[#9ca3af] hover:text-white bg-[#1a1e26]/80 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePhotoIndex((activePhotoIndex - 1 + displayedPhotos.length) % displayedPhotos.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white bg-[#1a1e26]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-colors hidden sm:flex cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePhotoIndex((activePhotoIndex + 1) % displayedPhotos.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white bg-[#1a1e26]/80 hover:bg-[#c99e64] hover:text-black rounded-full transition-colors hidden sm:flex cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Lightbox Content Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
          >
            <div className="relative max-h-[68vh] flex items-center justify-center">
              <img
                src={displayedPhotos[activePhotoIndex].imageUrl}
                alt={`Foto #${displayedPhotos[activePhotoIndex].number}`}
                className="max-h-[66vh] w-auto max-w-full object-contain rounded-lg border border-[#242933]"
              />
            </div>

            {/* Bottom details card as requested in Section 12 */}
            <div className="mt-4 bg-[#12151a] border border-[#242933] rounded-2xl p-4 sm:p-6 w-full max-w-xl text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-sm sm:text-base font-bold text-[#c99e64] px-3 py-1 bg-[#1a1e26] rounded-md border border-[#2a2f3a]">
                  Foto #{displayedPhotos[activePhotoIndex].number}
                </span>
                {typeof displayedPhotos[activePhotoIndex].price === 'number' &&
                  displayedPhotos[activePhotoIndex].price! > 0 && (
                    <span className="text-xs font-semibold text-white px-2.5 py-1 bg-[#1a1e26] rounded-md border border-[#2a2f3a]">
                      R$ {displayedPhotos[activePhotoIndex].price!.toFixed(2).replace('.', ',')}
                    </span>
                  )}
              </div>

              {displayedPhotos[activePhotoIndex].description ? (
                <p className="text-xs text-[#d1d5db]">
                  "{displayedPhotos[activePhotoIndex].description}"
                </p>
              ) : (
                <p className="text-xs text-[#828a95] italic">
                  Fotografia da cobertura oficial do evento.
                </p>
              )}

              {/* Toggle selection button inside lightbox */}
              <div className="pt-2">
                {isPhotoSelected(displayedPhotos[activePhotoIndex].id) ? (
                  <button
                    onClick={() => togglePhotoSelection(displayedPhotos[activePhotoIndex])}
                    className="px-6 py-2.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border border-[#ef4444]/40 font-semibold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer"
                  >
                    Remover do meu álbum
                  </button>
                ) : (
                  <button
                    onClick={() => togglePhotoSelection(displayedPhotos[activePhotoIndex])}
                    className="px-6 py-2.5 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-lg shadow-[#c99e64]/20 cursor-pointer"
                  >
                    Adicionar ao meu álbum
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY ALBUM DRAWER */}
      <MyAlbumDrawer
        isOpen={isAlbumDrawerOpen}
        onClose={() => setIsAlbumDrawerOpen(false)}
        selectedPhotos={selectedPhotos}
        onRemovePhoto={(photoId) => {
          setSelectedPhotos(selectedPhotos.filter((p) => p.photoId !== photoId));
        }}
        onClearAlbum={() => {
          if (window.confirm('Deseja realmente remover todas as fotos do seu álbum?')) {
            setSelectedPhotos([]);
          }
        }}
        onProceedToReview={() => {
          setIsReviewModalOpen(true);
        }}
      />

      {/* REVIEW SELECTION MODAL */}
      {selectedGallery && (
        <ReviewSelectionModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          selectedPhotos={selectedPhotos}
          currentGallery={selectedGallery}
          currentUser={currentUser}
          onSelectionSuccess={() => {
            // Optional callback
          }}
        />
      )}
    </div>
  );
};
