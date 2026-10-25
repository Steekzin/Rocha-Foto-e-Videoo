import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Camera,
  Calendar,
  Layers,
  Eye,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Search,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { EventAlbum, EventAlbumPhoto, PortfolioPhoto } from '../types.js';
import { api } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';

export const AdminEventAlbumsTab: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [albums, setAlbums] = useState<EventAlbum[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<PortfolioPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAlbumForPhotos, setSelectedAlbumForPhotos] = useState<EventAlbum | null>(null);

  // Quick Photo Picker Modal
  const [photoPickerAlbum, setPhotoPickerAlbum] = useState<EventAlbum | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerCategory, setPickerCategory] = useState<string>('Todos');

  // Modal create/edit
  const [showAlbumModal, setShowAlbumModal] = useState<boolean>(false);
  const [editingAlbum, setEditingAlbum] = useState<EventAlbum | null>(null);
  const [albumForm, setAlbumForm] = useState({
    title: '',
    category: 'Casamentos',
    date: new Date().toISOString().split('T')[0],
    description: '',
    coverImage: '',
    portfolioPhotoId: '',
    active: true,
    featured: true,
  });

  // Photo upload states
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentUploadingFileName, setCurrentUploadingFileName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Deletion confirmation states
  const [albumToDelete, setAlbumToDelete] = useState<EventAlbum | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<EventAlbumPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const [albumsData, photosData] = await Promise.all([
        api.getEventAlbums(undefined, true),
        api.getPortfolioPhotos({ isAdmin: true }).catch(() => []),
      ]);
      setAlbums(albumsData || []);
      setPortfolioPhotos(photosData || []);
      if (selectedAlbumForPhotos) {
        const updated = (albumsData || []).find((a) => a.id === selectedAlbumForPhotos.id);
        if (updated) setSelectedAlbumForPhotos(updated);
      }
    } catch (err: any) {
      console.error('Error loading event albums:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAlbum(null);
    setAlbumForm({
      title: '',
      category: 'Casamentos',
      date: new Date().toISOString().split('T')[0],
      description: '',
      coverImage: '',
      portfolioPhotoId: '',
      active: true,
      featured: true,
    });
    setShowAlbumModal(true);
  };

  const handleOpenEditModal = (album: EventAlbum) => {
    setEditingAlbum(album);
    setAlbumForm({
      title: album.title,
      category: album.category,
      date: album.date || new Date().toISOString().split('T')[0],
      description: album.description || '',
      coverImage: album.coverImage || '',
      portfolioPhotoId: album.portfolioPhotoId || '',
      active: album.active !== false,
      featured: Boolean(album.featured),
    });
    setShowAlbumModal(true);
  };

  const handleLinkPortfolioPhoto = async (albumId: string, photoId?: string) => {
    try {
      setLoading(true);
      await api.updateEventAlbum(albumId, { portfolioPhotoId: photoId || undefined });
      setStatusMessage({
        type: 'success',
        text: photoId
          ? 'Foto do Portfólio vinculada com sucesso! O ícone de elo 🔗 aparecerá sobre ela no site.'
          : 'Vínculo com a foto do portfólio removido com sucesso.',
      });
      setPhotoPickerAlbum(null);
      await loadAlbums();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao vincular foto do portfólio.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.title.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe o título do evento (ex: Civil Bruna & Charles).' });
      return;
    }

    try {
      setLoading(true);
      if (editingAlbum) {
        await api.updateEventAlbum(editingAlbum.id, albumForm);
        setStatusMessage({ type: 'success', text: 'Álbum atualizado com sucesso!' });
      } else {
        await api.createEventAlbum(albumForm);
        setStatusMessage({ type: 'success', text: 'Novo álbum de evento criado com sucesso!' });
      }
      setShowAlbumModal(false);
      await loadAlbums();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao salvar álbum.' });
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteAlbum = async () => {
    if (!albumToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteEventAlbum(albumToDelete.id);
      if (selectedAlbumForPhotos?.id === albumToDelete.id) {
        setSelectedAlbumForPhotos(null);
      }
      setStatusMessage({ type: 'success', text: `Álbum "${albumToDelete.title}" excluído com sucesso.` });
      setAlbumToDelete(null);
      await loadAlbums();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao excluir álbum.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAlbumForPhotos = async (album: EventAlbum) => {
    try {
      setLoading(true);
      const fullAlbum = await api.getEventAlbum(album.id);
      setSelectedAlbumForPhotos(fullAlbum || album);
    } catch (err: any) {
      console.warn('Could not fetch full album:', err);
      setSelectedAlbumForPhotos(album);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbumForPhotos) return;
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList) as File[];

    setLoading(true);
    setUploadProgress({ current: 0, total: filesArray.length });

    try {
      const res = await api.uploadEventAlbumPhotos(
        selectedAlbumForPhotos.id,
        filesArray,
        (current, total, fileName) => {
          setUploadProgress({ current, total });
          if (fileName) setCurrentUploadingFileName(fileName);
        }
      );

      setStatusMessage({
        type: 'success',
        text: `✨ ${res.count || filesArray.length} fotos enviadas para o álbum "${selectedAlbumForPhotos.title}"!`,
      });

      // Reload album photos
      const updated = await api.getEventAlbum(selectedAlbumForPhotos.id);
      if (updated) setSelectedAlbumForPhotos(updated);
      await loadAlbums();
    } catch (err: any) {
      console.error('[Upload Album Photos Error]:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao fazer upload das fotos do álbum.' });
    } finally {
      setLoading(false);
      setUploadProgress(null);
      setCurrentUploadingFileName('');
      e.target.value = '';
    }
  };

  const executeDeletePhoto = async () => {
    if (!photoToDelete || !selectedAlbumForPhotos) return;
    try {
      setIsDeleting(true);
      await api.deleteEventAlbumPhoto(selectedAlbumForPhotos.id, photoToDelete.id);
      setStatusMessage({ type: 'success', text: 'Fotografia excluída do álbum com sucesso.' });
      setPhotoToDelete(null);
      const updated = await api.getEventAlbum(selectedAlbumForPhotos.id);
      if (updated) setSelectedAlbumForPhotos(updated);
      await loadAlbums();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao excluir foto do álbum.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSamplePhotos = async () => {
    if (!selectedAlbumForPhotos) return;
    try {
      setLoading(true);
      // Create sample photos from Unsplash
      const sampleUrls = [
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
      ];
      // Fetch each image as a Blob/File and upload
      const files: File[] = [];
      for (let i = 0; i < sampleUrls.length; i++) {
        const resp = await fetch(sampleUrls[i]);
        const blob = await resp.blob();
        files.push(new File([blob], `foto_amostra_${i + 1}.jpg`, { type: 'image/jpeg' }));
      }
      await api.uploadEventAlbumPhotos(selectedAlbumForPhotos.id, files);
      const updated = await api.getEventAlbum(selectedAlbumForPhotos.id);
      if (updated) setSelectedAlbumForPhotos(updated);
      await loadAlbums();
      setStatusMessage({ type: 'success', text: 'Fotos de exemplo adicionadas com sucesso!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Erro ao adicionar fotos de teste: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-[#12151a] border border-[#20252e] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-[#c99e64]/15 rounded-lg text-[#c99e64]">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase tracking-widest font-bold text-[#c99e64]">
              Gestão de Trabalhos & Álbuns
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif-luxury text-white">
            Álbuns de Eventos Completos
          </h2>
          <p className="text-xs text-[#9ca3af] mt-1 max-w-2xl leading-relaxed">
            Cadastre os álbuns de eventos (como <strong>Civil Bruna & Charles</strong>, casamentos e debutantes).
            Cada trabalho possui sua foto de capa e uma galeria completa de fotos que se abre ao clicar no ícone de elo (🔗).
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#c99e64]/20 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Álbum de Evento</span>
        </button>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            statusMessage.type === 'success'
              ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
              : statusMessage.type === 'error'
              ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
              : 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Albums List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Álbuns Cadastrados ({albums.length})
          </h3>
          <span className="text-xs text-[#828a95]">
            Clique em <strong>"Gerenciar Fotos"</strong> para subir ou organizar fotos do álbum.
          </span>
        </div>

        {loading && albums.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-[#c99e64] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#9ca3af]">Carregando álbuns...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="py-16 text-center bg-[#12151a] rounded-2xl border border-[#20252e] p-8 max-w-md mx-auto">
            <Camera className="w-10 h-10 text-[#c99e64] mx-auto mb-3 opacity-60" />
            <h4 className="text-base font-serif-luxury text-white">Nenhum álbum de evento cadastrado</h4>
            <p className="text-xs text-[#9ca3af] mt-1 mb-4">
              Crie o primeiro álbum (ex: "Civil Bruna & Charles") para exibir no site.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#c99e64] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg"
            >
              + Criar Primeiro Álbum
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map((album) => {
              const photoCount = Array.isArray(album.photos) ? album.photos.length : album.photoCount || 0;
              const isSelected = selectedAlbumForPhotos?.id === album.id;

              return (
                <div
                  key={album.id}
                  className={`bg-[#12151a] border rounded-2xl overflow-hidden transition-all duration-300 shadow-md group flex flex-col justify-between ${
                    isSelected ? 'border-[#c99e64] ring-2 ring-[#c99e64]/30' : 'border-[#20252e] hover:border-[#c99e64]/50'
                  }`}
                >
                  <div>
                    {/* Cover Photo */}
                    <div className="relative aspect-[4/3] bg-black overflow-hidden">
                      {album.coverImage ? (
                        <img
                          src={album.coverImage}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#525966] bg-[#14171d]">
                          <Camera className="w-8 h-8 opacity-40 mb-1" />
                          <span className="text-[10px] uppercase">Sem capa</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                      {/* Category Badge & Count */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                        <span className="px-2.5 py-0.5 bg-black/80 backdrop-blur-md rounded-full text-[10px] uppercase font-bold text-[#c99e64] border border-[#c99e64]/30">
                          {album.category}
                        </span>
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-full text-[10px] font-mono text-white border border-white/10">
                          {photoCount} fotos
                        </span>
                      </div>

                      {/* Link icon badge in corner showing it supports the 🔗 full album feature */}
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center text-[#c99e64] border border-[#c99e64]/30 z-10" title="Álbum completo vinculado com ícone de elo (🔗)">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="p-4">
                      <h4 className="text-base font-serif-luxury text-white font-medium group-hover:text-[#c99e64] transition-colors line-clamp-1">
                        {album.title}
                      </h4>
                      {album.date && (
                        <div className="flex items-center gap-1 text-[11px] text-[#828a95] mt-1">
                          <Calendar className="w-3 h-3 text-[#c99e64]" />
                          <span>{album.date}</span>
                        </div>
                      )}
                      {album.description && (
                        <p className="text-xs text-[#9ca3af] mt-2 line-clamp-2 leading-relaxed">
                          {album.description}
                        </p>
                      )}

                      {/* Linked Portfolio Photo Display */}
                      {(() => {
                        const linkedPhoto = portfolioPhotos.find(
                          (p) => String(p.id) === String(album.portfolioPhotoId) || p.albumId === album.id
                        );
                        return (
                          <div className="mt-3 pt-3 border-t border-[#1b2029]">
                            {linkedPhoto ? (
                              <div className="flex items-center justify-between gap-2 p-2 bg-[#0c0e12] rounded-lg border border-[#252a35]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded overflow-hidden bg-black shrink-0 border border-[#2d3340]">
                                    <img src={linkedPhoto.imageUrl} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] text-[#c99e64] font-semibold block uppercase">
                                      Foto no Portfólio 🔗
                                    </span>
                                    <p className="text-xs text-white truncate max-w-[140px]">
                                      {linkedPhoto.number ? `#${linkedPhoto.number} ` : ''}{linkedPhoto.title}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoPickerAlbum(album);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-[#1b1f28] hover:bg-[#252a37] text-gray-300 hover:text-white rounded border border-[#2b313d] transition-colors shrink-0 cursor-pointer"
                                  title="Trocar foto vinculada"
                                >
                                  Trocar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoPickerAlbum(album);
                                }}
                                className="w-full py-2 px-3 bg-[#181c24] hover:bg-[#202530] text-[#c99e64] border border-dashed border-[#c99e64]/40 hover:border-[#c99e64] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                title="Escolher qual foto do portfólio abrirá este álbum"
                              >
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span>Vincular a uma foto do Portfólio</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-0 border-t border-[#1b2029] mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleSelectAlbumForPhotos(album)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#c99e64] text-[#0c0d0e]'
                          : 'bg-[#1b1f28] hover:bg-[#252a37] text-white border border-[#2b313d]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-current" />
                      <span>Fotos ({photoCount})</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(album)}
                      className="p-2 bg-[#1b1f28] hover:bg-[#252a37] text-[#9ca3af] hover:text-white rounded-lg border border-[#2b313d] transition-colors"
                      title="Editar dados do álbum"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAlbumToDelete(album)}
                      className="p-2 bg-[#1b1f28] hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg border border-[#2b313d] transition-colors cursor-pointer"
                      title="Excluir álbum"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* PHOTO MANAGEMENT DRAWER / SECTION FOR SELECTED ALBUM */}
      {/* ========================================================= */}
      {selectedAlbumForPhotos && (
        <div className="bg-[#12151a] border-2 border-[#c99e64]/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#20252e]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-[#c99e64]/20 text-[#c99e64] rounded text-[10px] uppercase font-bold tracking-wider">
                  Gerenciando Fotos
                </span>
                <span className="text-xs text-[#828a95]">• {selectedAlbumForPhotos.category}</span>
              </div>
              <h3 className="text-xl font-serif-luxury text-white">
                {selectedAlbumForPhotos.title} ({(selectedAlbumForPhotos.photos || []).length} fotos no álbum)
              </h3>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                Todas as fotos abaixo serão exibidas na galeria quando o visitante clicar no ícone 🔗 na página de trabalhos.
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="album-photos-upload-input"
                className="px-4 py-2.5 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>+ Fazer Upload de Fotos</span>
                <input
                  id="album-photos-upload-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleBatchPhotoUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleAddSamplePhotos}
                className="px-3.5 py-2.5 bg-[#1b1f28] hover:bg-[#252a37] text-xs text-[#d1d5db] rounded-xl border border-[#2b313d] transition-colors"
              >
                + Adicionar Amostras
              </button>

              <button
                onClick={() => setSelectedAlbumForPhotos(null)}
                className="p-2.5 text-[#9ca3af] hover:text-white hover:bg-[#1b1f28] rounded-xl transition-colors"
                title="Fechar gerenciador de fotos"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress && (
            <div className="my-4 bg-[#1b1f28] border border-[#c99e64]/40 rounded-xl p-4 shadow-lg animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#c99e64] animate-spin" />
                  <span className="text-xs font-semibold text-white">
                    Enviando fotos para o álbum ({uploadProgress.current} de {uploadProgress.total})...
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#c99e64]">
                  {Math.round((uploadProgress.current / (uploadProgress.total || 1)) * 100)}%
                </span>
              </div>
              {currentUploadingFileName && (
                <p className="text-[11px] text-[#828a95] truncate mb-2">
                  Processando: {currentUploadingFileName}
                </p>
              )}
              <div className="w-full bg-[#0c0d0e] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#c99e64] to-[#e6ca65] h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round((uploadProgress.current / (uploadProgress.total || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Photos Grid */}
          <div className="pt-6">
            {(selectedAlbumForPhotos.photos || []).length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#2b313d] rounded-2xl p-8">
                <Camera className="w-8 h-8 text-[#c99e64] mx-auto mb-2 opacity-50" />
                <h5 className="text-sm font-serif-luxury text-white">Este álbum ainda não possui fotos</h5>
                <p className="text-xs text-[#9ca3af] mt-1 mb-4">
                  Clique no botão acima para carregar as fotos deste evento (casamento, ensaio, festa).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(selectedAlbumForPhotos.photos || []).map((photo, pIdx) => (
                  <div
                    key={photo.id}
                    className="group relative bg-[#0c0e11] border border-[#20252e] rounded-xl overflow-hidden aspect-square shadow-md"
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.title || `Foto #${pIdx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Order badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 font-mono text-[10px] text-[#c99e64] rounded border border-white/10">
                      #{pIdx + 1}
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPhotoToDelete(photo)}
                        className="p-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors cursor-pointer"
                        title="Excluir foto do álbum"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR OU EDITAR ÁLBUM DE EVENTO */}
      {/* ========================================================= */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151a] border border-[#2b313d] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAlbumModal(false)}
              className="absolute top-4 right-4 text-[#9ca3af] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#c99e64]/20 text-[#c99e64] flex items-center justify-center border border-[#c99e64]/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif-luxury text-white">
                  {editingAlbum ? 'Editar Álbum de Evento' : 'Novo Álbum de Evento'}
                </h3>
                <p className="text-xs text-[#9ca3af]">
                  Ex: "Civil Bruna & Charles", com capa e fotos do ensaio/casamento.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAlbum} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Civil Bruna & Charles"
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                  className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                    Categoria *
                  </label>
                  <select
                    value={albumForm.category}
                    onChange={(e) => setAlbumForm({ ...albumForm, category: e.target.value })}
                    className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                  >
                    <option value="Casamentos">Casamentos</option>
                    <option value="15 Anos">15 Anos</option>
                    <option value="Fotos Gestantes">Fotos Gestantes</option>
                    <option value="Pré Wedding">Pré Wedding</option>
                    <option value="Pós Casamento">Pós Casamento</option>
                    <option value="Book">Book</option>
                    <option value="Aniversário Infantil">Aniversário Infantil</option>
                    <option value="Formatura">Formatura</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                    Data do Evento
                  </label>
                  <input
                    type="date"
                    value={albumForm.date}
                    onChange={(e) => setAlbumForm({ ...albumForm, date: e.target.value })}
                    className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                  />
                </div>
              </div>

              {/* Vinculação Direta com Foto do Portfólio */}
              <div className="p-3.5 bg-[#0e1116] border border-[#262b35] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-[#c99e64] font-semibold uppercase tracking-wider">
                  <LinkIcon className="w-3.5 h-3.5 -rotate-45" />
                  <span>Foto do Portfólio Vinculada (onde o ícone 🔗 aparecerá)</span>
                </div>
                <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                  Selecione a fotografia do Portfólio público que terá o ícone de elo (🔗). Ao clicar nele, os visitantes abrirão este álbum.
                </p>
                <select
                  value={albumForm.portfolioPhotoId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setAlbumForm((prev) => {
                      const next = { ...prev, portfolioPhotoId: pid };
                      if (pid && !prev.coverImage) {
                        const matched = portfolioPhotos.find((p) => String(p.id) === String(pid));
                        if (matched) next.coverImage = matched.imageUrl;
                      }
                      return next;
                    });
                  }}
                  className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                >
                  <option value="">Nenhuma foto vinculada (selecionar depois)</option>
                  {portfolioPhotos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} — ` : ''}{p.title} ({p.categoryName || (p as any).category})
                    </option>
                  ))}
                </select>

                {albumForm.portfolioPhotoId && (() => {
                  const matched = portfolioPhotos.find((p) => String(p.id) === String(albumForm.portfolioPhotoId));
                  if (!matched) return null;
                  return (
                    <div className="mt-2 p-2.5 bg-[#141820] border border-[#2b3342] rounded-lg flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded overflow-hidden bg-black border border-[#3b4353] shrink-0">
                          <img src={matched.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium truncate">{matched.title}</p>
                          <p className="text-[10px] text-[#c99e64]">
                            {matched.number ? `#${matched.number} • ` : ''}{matched.categoryName || (matched as any).category}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAlbumForm((prev) => ({ ...prev, coverImage: matched.imageUrl }))}
                        className="text-[10px] px-2.5 py-1 bg-[#1e2430] hover:bg-[#283142] text-[#c99e64] rounded border border-[#3a4456] transition-colors shrink-0 cursor-pointer"
                        title="Copiar imagem desta foto como capa do álbum"
                      >
                        Usar como capa
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                  Foto de Capa do Álbum (URL ou upload)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cole a URL da imagem ou escolha um arquivo"
                    value={albumForm.coverImage}
                    onChange={(e) => setAlbumForm({ ...albumForm, coverImage: e.target.value })}
                    className="flex-1 bg-[#0a0c0e] border border-[#262b35] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                  />
                  <label className="px-3 py-2 bg-[#1b1f28] hover:bg-[#252a37] text-white text-xs rounded-xl border border-[#2b313d] flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setAlbumForm((prev) => ({ ...prev, coverImage: (ev.target?.result as string) || '' }));
                          };
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                </div>
                {albumForm.coverImage && (
                  <div className="mt-2 w-20 h-16 rounded-lg overflow-hidden border border-[#2b313d] bg-black">
                    <img src={albumForm.coverImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                  Descrição / História do Evento
                </label>
                <textarea
                  rows={3}
                  placeholder="Conte um pouco sobre este ensaio ou celebração..."
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                  className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAlbumModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#9ca3af] hover:text-white bg-[#1b1f28] border border-[#2b313d]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] transition-all cursor-pointer shadow-md"
                >
                  {loading ? 'Salvando...' : editingAlbum ? 'Atualizar Álbum' : 'Salvar Álbum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL RÁPIDO: ESCOLHER FOTO DO PORTFÓLIO PARA VINCULAR    */}
      {/* ========================================================= */}
      {photoPickerAlbum && (() => {
        const categories = Array.from(
          new Set(['Todos', ...portfolioPhotos.map((p) => p.categoryName || (p as any).category).filter(Boolean)])
        );
        const filteredPhotos = portfolioPhotos.filter((p) => {
          const matchCat =
            pickerCategory === 'Todos' ||
            (p.categoryName || (p as any).category)?.toLowerCase() === pickerCategory.toLowerCase();
          if (!matchCat) return false;
          if (!pickerSearch.trim()) return true;
          const q = pickerSearch.toLowerCase();
          return (
            (p.title && p.title.toLowerCase().includes(q)) ||
            (p.number && String(p.number).includes(q)) ||
            ((p.categoryName || (p as any).category) && (p.categoryName || (p as any).category).toLowerCase().includes(q))
          );
        });

        const currentBoundPhotoId = photoPickerAlbum.portfolioPhotoId;

        return (
          <div
            onClick={() => setPhotoPickerAlbum(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-start justify-between border-b border-[#20252e] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#c99e64]/20 rounded-lg text-[#c99e64]">
                      <LinkIcon className="w-4 h-4 -rotate-45" />
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#c99e64] tracking-wider">
                      Vincular Álbum de Evento
                    </span>
                  </div>
                  <h3 className="text-xl font-serif-luxury text-white mt-1">
                    Escolher Foto do Portfólio para "{photoPickerAlbum.title}"
                  </h3>
                  <p className="text-xs text-[#9ca3af] mt-0.5">
                    Clique na foto abaixo que receberá o ícone de elo (🔗). Ao ser clicado no site, abrirá as fotos deste evento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoPickerAlbum(null)}
                  className="text-[#9ca3af] hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPickerCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        pickerCategory === cat
                          ? 'bg-[#c99e64] text-[#0c0d0e]'
                          : 'bg-[#181c24] text-[#9ca3af] hover:text-white hover:bg-[#202530]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Buscar foto por nome ou número..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#0a0c0e] border border-[#262b35] rounded-xl text-xs text-white placeholder-[#525966] focus:outline-none focus:border-[#c99e64]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#525966] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Photos Grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredPhotos.length === 0 ? (
                  <div className="py-16 text-center text-xs text-neutral-400">
                    Nenhuma fotografia encontrada com os filtros atuais.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredPhotos.map((photo) => {
                      const isCurrentlyLinked =
                        String(photo.id) === String(currentBoundPhotoId) ||
                        photo.albumId === photoPickerAlbum.id;

                      return (
                        <div
                          key={photo.id}
                          onClick={() => handleLinkPortfolioPhoto(photoPickerAlbum.id, photo.id)}
                          className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-[4/5] bg-black ${
                            isCurrentlyLinked
                              ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-[#262b35] hover:border-[#c99e64] hover:shadow-lg'
                          }`}
                        >
                          <img
                            src={photo.imageUrl}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            {photo.number && (
                              <span className="px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[9px] font-mono text-white font-bold">
                                #{photo.number}
                              </span>
                            )}
                          </div>

                          {isCurrentlyLinked && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-bold rounded-full uppercase flex items-center gap-1 shadow-md">
                              <Check className="w-3 h-3" />
                              <span>Vinculada</span>
                            </div>
                          )}

                          {/* Bottom info */}
                          <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-xs font-medium text-white truncate group-hover:text-[#c99e64] transition-colors">
                              {photo.title}
                            </p>
                            <span className="text-[10px] text-[#9ca3af] block truncate">
                              {photo.categoryName || (photo as any).category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-[#20252e] flex items-center justify-between">
                <div>
                  {currentBoundPhotoId && (
                    <button
                      type="button"
                      onClick={() => handleLinkPortfolioPhoto(photoPickerAlbum.id, undefined)}
                      className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Desvincular Foto deste Álbum
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPhotoPickerAlbum(null)}
                  className="px-4 py-2 bg-[#1b1f28] hover:bg-[#252a37] text-white text-xs font-semibold rounded-xl border border-[#2b313d]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE ÁLBUM */}
      {/* ========================================================= */}
      {albumToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151a] border border-[#ef4444]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => !isDeleting && setAlbumToDelete(null)}
              className="absolute top-4 right-4 text-[#9ca3af] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif-luxury text-white">Excluir Álbum</h3>
                <p className="text-xs text-[#9ca3af]">Ação permanente no painel administrativo</p>
              </div>
            </div>

            <div className="p-3 bg-[#0c0e11] border border-[#20252e] rounded-xl mb-4">
              <p className="text-sm font-semibold text-white mb-1">"{albumToDelete.title}"</p>
              <div className="flex items-center gap-2 text-xs text-[#828a95]">
                <span>{albumToDelete.category}</span>
                <span>•</span>
                <span>{(albumToDelete.photos || []).length || albumToDelete.photoCount || 0} fotos</span>
                {albumToDelete.portfolioPhotoId && (
                  <>
                    <span>•</span>
                    <span className="text-[#c99e64]">Vinculado ao portfólio</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-[#9ca3af] leading-relaxed mb-6">
              Tem certeza que deseja excluir o álbum <strong>"{albumToDelete.title}"</strong>? Todas as fotos deste evento serão removidas. A foto do portfólio (se houver) permanecerá intacta no site público, apenas com o elo desvinculado.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAlbumToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1b1f28] hover:bg-[#252a37] text-white border border-[#2b313d] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteAlbum}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE FOTO DO ÁLBUM */}
      {/* ========================================================= */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151a] border border-[#ef4444]/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => !isDeleting && setPhotoToDelete(null)}
              className="absolute top-4 right-4 text-[#9ca3af] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif-luxury text-white">Remover Fotografia</h3>
                <p className="text-xs text-[#9ca3af]">Excluir foto deste álbum</p>
              </div>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-[#20252e] mb-4 bg-black">
              <img
                src={photoToDelete.imageUrl}
                alt={photoToDelete.title || 'Foto do álbum'}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-[#9ca3af] leading-relaxed mb-6">
              Deseja realmente remover esta fotografia do álbum "{selectedAlbumForPhotos?.title}"?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1b1f28] hover:bg-[#252a37] text-white border border-[#2b313d] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeletePhoto}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Foto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
