import React, { useState } from 'react';
import { Check, ChevronLeft, MessageSquare, Send, X, AlertCircle } from 'lucide-react';
import { Gallery, PhotoEvent, SelectedPhotoItem, User } from '../types.js';
import { api } from '../services/api.js';

interface ReviewSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotos: SelectedPhotoItem[];
  currentGallery: Gallery;
  currentEvent?: PhotoEvent;
  currentUser: User;
  onSelectionSuccess: () => void;
}

export const ReviewSelectionModal: React.FC<ReviewSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedPhotos,
  currentGallery,
  currentEvent,
  currentUser,
  onSelectionSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    whatsappUrl: string;
    whatsappMessage: string;
  } | null>(null);

  if (!isOpen) return null;

  // Calculate pricing
  const hasPrices = selectedPhotos.some((p) => typeof p.price === 'number' && p.price > 0);
  const totalPrice = hasPrices
    ? selectedPhotos.reduce((sum, p) => sum + (p.price || 0), 0)
    : null;

  // Formatted string of photo numbers (001, 007, 014...)
  const photoNumbersFormatted = selectedPhotos.map((p) => p.number).join(', ');

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await api.submitSelection({
        clientId: currentUser.clientId || currentUser.id,
        clientName: currentUser.name,
        clientEmail: currentUser.email,
        eventId: currentGallery.eventId,
        eventName: currentGallery.eventName,
        galleryId: currentGallery.id,
        galleryTitle: currentGallery.title,
        selectedPhotos: selectedPhotos,
        notes: notes.trim(),
      });

      setSubmittedData({
        whatsappUrl: res.whatsappUrl,
        whatsappMessage: res.whatsappMessage,
      });

      // Automatically trigger WhatsApp opening
      window.open(res.whatsappUrl, '_blank');
      onSelectionSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar seleção. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121418] border border-[#2a2f38] rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#20252e]">
          <div>
            <span className="text-[11px] font-semibold text-[#c99e64] uppercase tracking-widest">
              Confirmação
            </span>
            <h3 className="font-serif-luxury text-xl sm:text-2xl text-white">
              REVISAR MINHA SELEÇÃO
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#1a1e26] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submittedData ? (
          <div className="space-y-6 pt-6">
            {/* Event & Client Details */}
            <div className="bg-[#181b21] p-4 rounded-xl border border-[#232832] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Evento:</span>
                <span className="font-semibold text-white">{currentGallery.eventName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Cliente:</span>
                <span className="font-semibold text-white">{currentUser.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Galeria:</span>
                <span className="text-[#e5e7eb]">{currentGallery.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9ca3af]">Quantidade:</span>
                <span className="font-bold text-[#c99e64]">{selectedPhotos.length} fotos escolhidas</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#232832]">
                <span className="text-[#9ca3af]">Valor Total:</span>
                <span className="text-sm font-bold text-white">
                  {totalPrice !== null ? `R$ ${totalPrice.toFixed(2).replace('.', ',')}` : 'Orçamento sob consulta'}
                </span>
              </div>
            </div>

            {/* Selected Photo Numbers */}
            <div>
              <label className="text-xs text-[#9ca3af] uppercase tracking-wider block mb-2 font-medium">
                Fotos Selecionadas ({selectedPhotos.length}):
              </label>
              <div className="bg-[#0c0e11] p-3.5 rounded-xl border border-[#20252e] max-h-32 overflow-y-auto text-xs text-[#e5e7eb] font-mono leading-relaxed break-words">
                {photoNumbersFormatted || 'Nenhuma foto selecionada'}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="text-xs text-[#9ca3af] uppercase tracking-wider block mb-2 font-medium">
                Observações para a Rocha Foto & Vídeo (Opcional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Exemplo: Gostaria de tratamento especial de iluminação na foto 003 e 014. Foto 001 para a capa do álbum."
                rows={3}
                className="w-full bg-[#0c0e11] border border-[#262b35] rounded-xl p-3 text-xs text-white placeholder-[#525964] focus:outline-none focus:border-[#c99e64] resize-none"
              />
            </div>

            {/* WhatsApp final notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#142016] border border-[#234228] text-xs text-[#86efac]">
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-[#4ade80]" />
              <p>
                Ao clicar em <strong>Enviar minha seleção</strong>, o sistema registrará seu pedido e
                abrirá automaticamente o WhatsApp com todos os números organizados para o fotógrafo!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#20252e]">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-[#9ca3af] hover:text-white hover:bg-[#1c2027] transition-colors flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar e editar</span>
              </button>

              <button
                type="button"
                id="btn-confirm-send-selection"
                disabled={isSubmitting || selectedPhotos.length === 0}
                onClick={handleSubmit}
                className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#22c55e] hover:bg-[#16a34a] text-black shadow-lg shadow-[#22c55e]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Registrando seleção...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar minha seleção</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation Success State */
          <div className="pt-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#1b3d22] text-[#4ade80] flex items-center justify-center mx-auto mb-2 border border-[#2d6a3b]">
              <Check className="w-8 h-8" />
            </div>

            <h4 className="text-xl font-serif-luxury text-white">
              Seleção Enviada com Sucesso!
            </h4>

            <p className="text-xs text-[#9ca3af] leading-relaxed max-w-md mx-auto">
              Sua lista com <strong>{selectedPhotos.length} fotografias</strong> foi registrada com
              sucesso no sistema da Rocha Foto & Vídeo. Caso o WhatsApp não tenha aberto
              automaticamente, clique no botão abaixo para conversar com a equipe.
            </p>

            <div className="pt-4">
              <a
                href={submittedData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs uppercase tracking-wider rounded-full shadow-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Abrir Conversa no WhatsApp</span>
              </a>
            </div>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="text-xs text-[#9ca3af] hover:text-white underline cursor-pointer"
              >
                Fechar janela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
