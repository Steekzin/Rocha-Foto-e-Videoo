import React from 'react';
import { BookmarkCheck, Trash2, X, ArrowRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { SelectedPhotoItem } from '../types.js';

interface MyAlbumDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: SelectedPhotoItem[];
  onRemovePhoto: (photoId: string) => void;
  onClearAlbum: () => void;
  onProceedToReview: () => void;
}

export const MyAlbumDrawer: React.FC<MyAlbumDrawerProps> = ({
  isOpen,
  onClose,
  selectedPhotos,
  onRemovePhoto,
  onClearAlbum,
  onProceedToReview,
}) => {
  if (!isOpen) return null;

  const hasPrices = selectedPhotos.some((p) => typeof p.price === 'number' && p.price > 0);
  const totalPrice = hasPrices
    ? selectedPhotos.reduce((sum, p) => sum + (p.price || 0), 0)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#101317] border-l border-[#242933] shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#20252e] flex items-center justify-between bg-[#14171d]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#c99e64]/20 text-[#c99e64] flex items-center justify-center">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-luxury text-lg text-white font-normal">
                  Meu Álbum
                </h3>
                <p className="text-xs text-[#9ca3af]">
                  {selectedPhotos.length} {selectedPhotos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#1f242c] transition-colors cursor-pointer"
              aria-label="Fechar gaveta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Photos List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedPhotos.length === 0 ? (
              <div className="py-20 text-center px-4">
                <ImageIcon className="w-12 h-12 text-[#9ca3af] mx-auto mb-3 opacity-40" />
                <h4 className="text-sm font-medium text-white mb-1">Seu álbum está vazio</h4>
                <p className="text-xs text-[#9ca3af] max-w-xs mx-auto leading-relaxed">
                  Navegue pela galeria e clique no botão <strong>"Adicionar ao meu álbum"</strong> para
                  marcar as fotos que deseja.
                </p>
              </div>
            ) : (
              selectedPhotos.map((photo) => (
                <div
                  key={photo.photoId}
                  className="flex items-center gap-3 bg-[#161920] p-2.5 rounded-xl border border-[#232832] group hover:border-[#c99e64]/40 transition-colors"
                >
                  <img
                    src={photo.imageUrl}
                    alt={`Foto #${photo.number}`}
                    className="w-16 h-16 object-cover rounded-lg shrink-0 border border-[#272d38]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#c99e64] block">
                      #{photo.number}
                    </span>
                    {photo.description ? (
                      <p className="text-xs text-[#9ca3af] truncate mt-0.5">{photo.description}</p>
                    ) : (
                      <p className="text-[11px] text-[#6b7280] italic">Foto da galeria oficial</p>
                    )}
                    {typeof photo.price === 'number' && photo.price > 0 && (
                      <span className="text-[11px] font-semibold text-white mt-1 block">
                        R$ {photo.price.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemovePhoto(photo.photoId)}
                    className="p-2 text-[#9ca3af] hover:text-[#ef4444] rounded-lg hover:bg-[#20252e] transition-colors shrink-0 cursor-pointer"
                    title="Remover do meu álbum"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Calculation and Proceed Button */}
          {selectedPhotos.length > 0 && (
            <div className="p-5 bg-[#14171d] border-t border-[#20252e] space-y-4">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#9ca3af]">{selectedPhotos.length} fotos selecionadas</span>
                  {hasPrices ? (
                    <span className="text-base font-bold text-white">
                      Total: R$ {totalPrice?.toFixed(2).replace('.', ',')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#c99e64] italic">
                      Orçamento sob consulta
                    </span>
                  )}
                </div>
                {!hasPrices && (
                  <p className="text-[10px] text-[#828a95] leading-tight">
                    Orçamento será definido posteriormente pela Rocha Foto & Vídeo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  id="btn-drawer-proceed-review"
                  onClick={() => {
                    onClose();
                    onProceedToReview();
                  }}
                  className="w-full py-3.5 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c99e64]/20"
                >
                  <span>Revisar Minha Seleção</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onClearAlbum}
                  className="w-full py-2 text-center text-xs text-[#9ca3af] hover:text-[#ef4444] transition-colors"
                >
                  Limpar todo o álbum
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
