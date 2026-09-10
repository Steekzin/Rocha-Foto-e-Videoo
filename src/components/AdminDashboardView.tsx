import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Calendar,
  Layers,
  Camera,
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Upload,
  ArrowUpDown,
  DollarSign,
  Tag,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileText,
  X,
  Lock,
  Key,
  Copy,
  Check,
  AlertTriangle,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import {
  Client,
  Gallery,
  Photo,
  PhotoEvent,
  PricingType,
  SelectionRecord,
  SelectionStatus,
  User,
} from '../types.js';
import { api, DashboardStats } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';
import { AdminPortfolioTab } from './AdminPortfolioTab.js';

interface AdminDashboardViewProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  setCurrentUser,
}) => {
  // Admin authentication check
  const [adminEmail, setAdminEmail] = useState('admin@rochafotoevideo.com.br');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tabs: 'overview' | 'clients' | 'events' | 'galleries' | 'photos' | 'selections' | 'portfolio'
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'events' | 'galleries' | 'photos' | 'selections' | 'portfolio'>('overview');

  // Master Data
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<PhotoEvent[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selections, setSelections] = useState<SelectionRecord[]>([]);
  const [selectedGalleryForPhotos, setSelectedGalleryForPhotos] = useState<Gallery | null>(null);
  const [currentGalleryPhotos, setCurrentGalleryPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Theme context
  const { theme } = useTheme();

  // Modals & Form States
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'cliente123',
    notes: '',
  });

  // Client Search
  const [clientSearch, setClientSearch] = useState('');

  // Password inspection / editing modal
  const [clientPasswordModal, setClientPasswordModal] = useState<{
    client: Client;
    newPassword: string;
    showCurrent: boolean;
    copied: boolean;
  } | null>(null);

  // Organized Client Deletion Modal
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteCascade, setDeleteCascade] = useState(true);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    clientId: '',
    name: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Casamentos',
    description: '',
    status: 'fotos_prontas' as const,
  });

  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    eventId: '',
    title: '',
    pricingType: 'fixed' as PricingType,
    defaultPrice: 15,
  });

  // Photo Inspection / Edit Modal
  const [inspectedSelection, setInspectedSelection] = useState<SelectionRecord | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  // Fetch all admin data
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadAllAdminData();
    }
  }, [currentUser]);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [cList, eList, gList, sList, stats] = await Promise.all([
        api.getClients(),
        api.getEvents(),
        api.getGalleries(),
        api.getSelections(),
        api.getDashboardStats().catch(() => null),
      ]);
      setClients(cList);
      setEvents(eList);
      setGalleries(gList);
      setSelections(sList);
      if (stats) {
        setDashboardStats(stats);
      }

      if (gList.length > 0 && !selectedGalleryForPhotos) {
        selectGalleryForPhotoManagement(gList[0]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectGalleryForPhotoManagement = async (gallery: Gallery) => {
    try {
      setSelectedGalleryForPhotos(gallery);
      const data = await api.getGallery(gallery.id);
      setCurrentGalleryPhotos(data.photos || []);
    } catch (err) {
      alert('Erro ao carregar fotos da galeria');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const res = await api.login(adminEmail, adminPassword);
      if (res.user.role !== 'admin') {
        throw new Error('Usuário sem privilégios administrativos.');
      }
      setCurrentUser(res.user);
      localStorage.setItem('rocha_user', JSON.stringify(res.user));
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao autenticar administrador.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Client actions
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClient = await api.createClient(clientForm);
      setClients([newClient, ...clients]);
      setShowClientModal(false);
      setClientForm({ name: '', email: '', phone: '', password: 'cliente123', notes: '' });
      alert('Cliente criado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveClientPassword = async () => {
    if (!clientPasswordModal) return;
    const pass = clientPasswordModal.newPassword.trim();
    if (!pass || pass.length < 3) {
      alert('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }
    try {
      const res = await api.updateClientPassword(clientPasswordModal.client.id, pass);
      setClients((prev) =>
        prev.map((c) => (c.id === clientPasswordModal.client.id ? { ...c, password: pass } : c))
      );
      alert(`Senha do cliente "${clientPasswordModal.client.name}" atualizada com sucesso!`);
      setClientPasswordModal(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar senha.');
    }
  };

  const handleCopyClientAccess = (client: Client) => {
    const password = client.password || 'cliente123';
    const text = `📸 *Acesso à Galeria Privada — Rocha Foto & Vídeo*\n\nOlá ${client.name}!\nSeu acesso exclusivo já está liberado:\n\n🔗 *Link de Acesso:* ${window.location.origin}\n📧 *E-mail:* ${client.email}\n🔑 *Senha:* ${password}\n\nQualquer dúvida, estamos à disposição no estúdio!`;
    navigator.clipboard.writeText(text);
    if (clientPasswordModal && clientPasswordModal.client.id === client.id) {
      setClientPasswordModal({ ...clientPasswordModal, copied: true });
      setTimeout(() => {
        setClientPasswordModal((prev) => (prev ? { ...prev, copied: false } : null));
      }, 3000);
    } else {
      alert('Dados de login copiados para a área de transferência! Pode colar diretamente no WhatsApp do cliente.');
    }
  };

  const handleExecuteDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    try {
      const res = await api.deleteClient(clientToDelete.id, deleteCascade);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      if (deleteCascade) {
        setEvents((prev) => prev.filter((e) => e.clientId !== clientToDelete.id));
        const clientEventIds = new Set(
          events.filter((e) => e.clientId === clientToDelete.id).map((e) => e.id)
        );
        setGalleries((prev) =>
          prev.filter((g) => g.clientId !== clientToDelete.id && !clientEventIds.has(g.eventId))
        );
      }
      setDeleteSuccessMessage(
        `Cliente "${clientToDelete.name}" excluído com sucesso.` +
          (deleteCascade
            ? ` (${res.deletedEventsCount || 0} eventos e ${res.deletedGalleriesCount || 0} galerias vinculadas foram removidos)`
            : '')
      );
      setClientToDelete(null);
      setTimeout(() => setDeleteSuccessMessage(''), 6000);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cliente.');
    } finally {
      setIsDeletingClient(false);
    }
  };

  // Event actions
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newEvent = await api.createEvent(eventForm);
      setEvents([newEvent, ...events]);
      setShowEventModal(false);
      alert('Evento criado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await api.deleteEvent(id);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Gallery actions
  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newGal = await api.createGallery(galleryForm);
      setGalleries([newGal, ...galleries]);
      setShowGalleryModal(false);
      alert('Galeria criada com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!window.confirm('Excluir esta galeria e todas as fotos associadas?')) return;
    try {
      await api.deleteGallery(id);
      setGalleries(galleries.filter((g) => g.id !== id));
      if (selectedGalleryForPhotos?.id === id) {
        setSelectedGalleryForPhotos(null);
        setCurrentGalleryPhotos([]);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Photo Upload Actions
  const handleBatchPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedGalleryForPhotos) {
      alert('Selecione uma galeria primeiro.');
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const photosToUpload: Partial<Photo>[] = [];

    // Read files as base64 or object URLs
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          photosToUpload.push({
            imageUrl: base64,
            description: file.name.replace(/\.[^/.]+$/, ''),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    try {
      const res = await api.uploadPhotos(selectedGalleryForPhotos.id, photosToUpload);
      setCurrentGalleryPhotos([...currentGalleryPhotos, ...res.photos]);
      loadAllAdminData();
      alert(`${photosToUpload.length} fotografias enviadas com numeração automática gerada!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar fotos.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Quick Demo Photos Upload for Testing
  const handleAddSamplePhotos = async () => {
    if (!selectedGalleryForPhotos) return;
    setLoading(true);
    const sampleBatch = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
        description: 'Retrato de estúdio com iluminação profissional.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
        description: 'Detalhes decorativos e iluminação suave.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
        description: 'Momento espontâneo da celebração.',
      },
    ];

    try {
      const res = await api.uploadPhotos(selectedGalleryForPhotos.id, sampleBatch);
      setCurrentGalleryPhotos([...currentGalleryPhotos, ...res.photos]);
      loadAllAdminData();
      alert('3 Fotografias de demonstração adicionadas com numeração sequencial!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenumberGallery = async () => {
    if (!selectedGalleryForPhotos) return;
    if (!window.confirm('Deseja renumerar sequencialmente todas as fotos desta galeria (001, 002, 003...)?')) return;
    try {
      setLoading(true);
      const res = await api.renumberPhotos(selectedGalleryForPhotos.id);
      setCurrentGalleryPhotos(res.photos);
      alert('Fotos renumeradas com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedGalleryForPhotos) return;
    if (!window.confirm('Excluir esta fotografia?')) return;
    try {
      await api.deletePhoto(selectedGalleryForPhotos.id, photoId);
      setCurrentGalleryPhotos(currentGalleryPhotos.filter((p) => p.id !== photoId));
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto || !selectedGalleryForPhotos) return;
    try {
      const updated = await api.updatePhoto(selectedGalleryForPhotos.id, editingPhoto.id, {
        number: editingPhoto.number,
        description: editingPhoto.description,
        price: editingPhoto.price,
      });
      setCurrentGalleryPhotos(currentGalleryPhotos.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPhoto(null);
      alert('Fotografia atualizada!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateSelectionStatus = async (selectionId: string, newStatus: SelectionStatus) => {
    try {
      const updated = await api.updateSelectionStatus(selectionId, newStatus);
      setSelections(selections.map((s) => (s.id === updated.id ? updated : s)));
      if (inspectedSelection?.id === selectionId) {
        setInspectedSelection(updated);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ==========================================
  // VIEW: ADMIN LOGIN IF NOT LOGGED IN AS ADMIN
  // ==========================================
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="w-full min-h-[85vh] bg-[#0c0d0e] flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full bg-[#121418] border border-[#232832] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-[#c99e64]/15 border border-[#c99e64]/30 text-[#c99e64] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="font-serif-luxury text-2xl sm:text-3xl text-white font-normal">
              Painel Administrativo
            </h1>
            <p className="text-xs text-[#9ca3af] mt-1">
              Acesso exclusivo para fotógrafo e equipe Rocha Foto & Vídeo.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-xs">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                E-mail do Administrador
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#c99e64]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af] mb-1.5">
                Senha Administrativa
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-[#0a0c0e] border border-[#262b35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#c99e64]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#c99e64]/20 cursor-pointer"
            >
              {isLoggingIn ? 'Autenticando...' : 'Acessar Painel do Estúdio'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1e232b] text-center space-y-2">
            <button
              type="button"
              id="btn-quick-admin-login"
              onClick={() => {
                setAdminEmail('admin@rochafotoevideo.com.br');
                setAdminPassword('admin123');
                api.login('admin@rochafotoevideo.com.br', 'admin123').then((res) => {
                  setCurrentUser(res.user);
                  localStorage.setItem('rocha_user', JSON.stringify(res.user));
                }).catch((err) => {
                  setAuthError(err.message);
                });
              }}
              className="w-full py-2 bg-[#1a1e26] hover:bg-[#232833] border border-[#2b313d] text-xs text-[#c99e64] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Entrar Automaticamente como Admin
            </button>
            <p className="text-[11px] text-[#828a95]">
              Credenciais: <code className="text-[#c99e64]">admin@rochafotoevideo.com.br</code> /{' '}
              <code className="text-[#c99e64]">admin123</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: FULL ADMIN DASHBOARD
  // ==========================================
  const totalPhotosCount = galleries.reduce((sum, g) => sum + (g.photoCount || 0), 0);
  const pendingSelections = selections.filter((s) => s.status === 'Nova');

  return (
    <div className="w-full bg-[#0c0d0e] text-[#f3f4f6] min-h-screen pb-24">
      {/* Admin Top Bar */}
      <div className="bg-[#12151a] border-b border-[#20252e] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c99e64]/20 text-[#c99e64] flex items-center justify-center border border-[#c99e64]/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif-luxury text-xl sm:text-2xl text-white font-normal">
                Painel do Fotógrafo — Rocha Foto & Vídeo
              </h1>
              <p className="text-xs text-[#9ca3af]">
                Gestão central de clientes, eventos, galerias, fotos e solicitações de álbum.
              </p>
            </div>
          </div>

          {/* Quick Action Shortcuts as required in Section 22 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowClientModal(true)}
              className="px-3 py-1.5 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#c99e64]" />
              <span>Novo Cliente</span>
            </button>
            <button
              onClick={() => setShowEventModal(true)}
              className="px-3 py-1.5 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#c99e64]" />
              <span>Novo Evento</span>
            </button>
            <button
              onClick={() => setShowGalleryModal(true)}
              className="px-3 py-1.5 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#c99e64]" />
              <span>Nova Galeria</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#20252e] pb-4 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === 'clients'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === 'events'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Eventos ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('galleries')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === 'galleries'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Galerias ({galleries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === 'photos'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Upload & Fotos</span>
          </button>

          <button
            onClick={() => setActiveTab('selections')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 relative ${
              activeTab === 'selections'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Seleções ({selections.length})</span>
            {pendingSelections.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
              activeTab === 'portfolio'
                ? 'bg-[#c99e64] text-[#0c0d0e]'
                : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Portfólio Público</span>
          </button>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metric Cards as requested in Item 4: Dashboard com Visão Geral */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Total Categorias
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-white block mt-1">
                  {dashboardStats?.portfolioCategoriesCount ?? 0}
                </span>
                <span className="text-[10px] text-[#c99e64] mt-0.5 block">Portfólio</span>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Total de Fotos
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-[#c99e64] block mt-1">
                  {dashboardStats?.portfolioPhotosTotal ?? 0}
                </span>
                <span className="text-[10px] text-[#9ca3af] mt-0.5 block">Cadastradas</span>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Fotos Ativas
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-[#22c55e] block mt-1">
                  {dashboardStats?.portfolioPhotosActive ?? 0}
                </span>
                <span className="text-[10px] text-emerald-400/80 mt-0.5 block">No ar</span>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Total Clientes
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-white block mt-1">
                  {clients.length}
                </span>
                <span className="text-[10px] text-[#9ca3af] mt-0.5 block">Cadastrados</span>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Total Galerias
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-white block mt-1">
                  {galleries.length}
                </span>
                <span className="text-[10px] text-[#9ca3af] mt-0.5 block">Privadas</span>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Total Seleções
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-white block mt-1">
                  {selections.length}
                </span>
                <span className="text-[10px] text-[#9ca3af] mt-0.5 block">Recebidas</span>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] p-4 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium block truncate">
                  Seleções Pendentes
                </span>
                <span className="font-serif-luxury text-2xl sm:text-3xl text-[#eab308] block mt-1">
                  {pendingSelections.length}
                </span>
                <span className="text-[10px] text-[#eab308]/80 mt-0.5 block">Aguardando álbum</span>
              </div>
            </div>

            {/* Recent Selections Highlight */}
            <div className="bg-[#12151a] border border-[#20252e] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-serif-luxury text-lg text-white">
                    Últimas Seleções Recebidas dos Clientes
                  </h3>
                  <p className="text-xs text-[#9ca3af]">
                    Listagem de envios para conferência de números e fechamento de álbuns.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('selections')}
                  className="text-xs text-[#c99e64] hover:underline"
                >
                  Ver todas
                </button>
              </div>

              {selections.length === 0 ? (
                <p className="text-xs text-[#9ca3af] py-6 text-center">Nenhuma seleção recebida ainda.</p>
              ) : (
                <div className="space-y-3">
                  {selections.slice(0, 3).map((sel) => (
                    <div
                      key={sel.id}
                      onClick={() => setInspectedSelection(sel)}
                      className="p-4 bg-[#181b22] hover:bg-[#20242e] border border-[#262b35] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{sel.clientName}</span>
                          <span className="text-xs text-[#6b7280]">•</span>
                          <span className="text-xs text-[#c99e64] font-medium">{sel.eventName}</span>
                        </div>
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                          {sel.photoCount} fotos selecionadas • {new Date(sel.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white">
                          {sel.totalPrice !== null ? `R$ ${sel.totalPrice.toFixed(2).replace('.', ',')}` : 'Sob consulta'}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            sel.status === 'Nova'
                              ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                              : sel.status === 'Em análise'
                              ? 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30'
                              : sel.status === 'Orçamento enviado'
                              ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30'
                              : 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                          }`}
                        >
                          {sel.status}
                        </span>
                        <Eye className="w-4 h-4 text-[#9ca3af]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. CLIENTS TAB */}
        {activeTab === 'clients' && (() => {
          const filteredClients = clients.filter(
            (c) =>
              c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
              c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
              (c.phone && c.phone.includes(clientSearch))
          );

          return (
            <div className="space-y-6">
              {/* Success Alert Banner */}
              {deleteSuccessMessage && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{deleteSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setDeleteSuccessMessage('')}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-serif-luxury text-xl text-white">Gerenciamento de Clientes</h3>
                  <p className="text-xs text-[#9ca3af]">
                    Defina senhas, visualize credenciais atuais e organize exclusões com segurança.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Search filter input */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou e-mail..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full bg-[#12151a] border border-[#262b35] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setClientForm({
                        name: '',
                        email: '',
                        phone: '',
                        password: 'rfv' + Math.floor(1000 + Math.random() * 9000),
                        notes: '',
                      });
                      setShowClientModal(true);
                    }}
                    className="px-4 py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-[#c99e64]/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Cliente</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#12151a] border border-[#20252e] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#171a21] text-[#9ca3af] uppercase tracking-wider text-[10px] border-b border-[#20252e]">
                      <tr>
                        <th className="py-3.5 px-4">Nome do Cliente</th>
                        <th className="py-3.5 px-4">E-mail (Login)</th>
                        <th className="py-3.5 px-4">Telefone / WhatsApp</th>
                        <th className="py-3.5 px-4">Senha de Acesso</th>
                        <th className="py-3.5 px-4">Eventos</th>
                        <th className="py-3.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2229]">
                      {filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            Nenhum cliente encontrado com os critérios de busca.
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((c) => {
                          const clientEventsCount = events.filter((e) => e.clientId === c.id).length;
                          const currentPass = c.password || 'cliente123';

                          return (
                            <tr key={c.id} className="hover:bg-[#161920] transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">{c.name}</div>
                                {c.notes && (
                                  <span className="text-[10px] text-gray-500 line-clamp-1">
                                    {c.notes}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-[#9ca3af] font-mono">{c.email}</td>
                              <td className="py-3.5 px-4 text-[#9ca3af]">
                                {c.phone ? (
                                  <a
                                    href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-green-400 hover:underline flex items-center gap-1"
                                    title="Chamar no WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                                    <span>{c.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </td>

                              {/* Password column with View/Edit and Copy buttons */}
                              <td className="py-3.5 px-4">
                                <div className="inline-flex items-center gap-1.5 bg-[#0b0d10] border border-[#222731] px-2.5 py-1 rounded-lg">
                                  <Key className="w-3.5 h-3.5 text-[#c99e64]" />
                                  <span className="font-mono text-xs text-gray-300 font-medium">
                                    {currentPass}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setClientPasswordModal({
                                        client: c,
                                        newPassword: '',
                                        showCurrent: true,
                                        copied: false,
                                      })
                                    }
                                    className="p-1 text-gray-400 hover:text-[#c99e64] transition-colors ml-1"
                                    title="Visualizar ou alterar senha"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyClientAccess(c)}
                                    className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                                    title="Copiar dados de login para enviar no WhatsApp"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-gray-300 border border-zinc-700">
                                  {clientEventsCount} evento(s)
                                </span>
                              </td>

                              {/* Actions column */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Manage Password Button */}
                                  <button
                                    onClick={() =>
                                      setClientPasswordModal({
                                        client: c,
                                        newPassword: '',
                                        showCurrent: true,
                                        copied: false,
                                      })
                                    }
                                    className="p-1.5 text-gray-400 hover:text-[#c99e64] hover:bg-[#20252e] rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                                    title="Gerenciar senha do cliente"
                                  >
                                    <Key className="w-3.5 h-3.5 text-[#c99e64]" />
                                    <span className="hidden sm:inline">Senha</span>
                                  </button>

                                  {/* Send Credentials Button */}
                                  <button
                                    onClick={() => handleCopyClientAccess(c)}
                                    className="p-1.5 text-gray-400 hover:text-[#25d366] hover:bg-[#20252e] rounded-lg transition-colors"
                                    title="Copiar acesso para WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Organized Delete Button */}
                                  <button
                                    onClick={() => {
                                      setClientToDelete(c);
                                      setDeleteCascade(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Excluir cliente com organização"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif-luxury text-xl text-white">Eventos Cadastrados</h3>
                <p className="text-xs text-[#9ca3af]">Vincule cada evento ao cliente correspondente.</p>
              </div>
              <button
                onClick={() => setShowEventModal(true)}
                className="px-4 py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Evento</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-[#12151a] border border-[#20252e] rounded-xl p-5 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1e232c] text-[#c99e64] uppercase tracking-wider font-semibold border border-[#2b323e]">
                      {evt.category}
                    </span>
                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="text-[#9ca3af] hover:text-[#ef4444]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-base font-serif-luxury text-white">{evt.name}</h4>
                    <p className="text-xs text-[#9ca3af] mt-0.5">Cliente: {evt.clientName}</p>
                  </div>

                  {evt.description && (
                    <p className="text-xs text-[#828a95] line-clamp-2">{evt.description}</p>
                  )}

                  <div className="pt-3 border-t border-[#1d212a] flex justify-between items-center text-xs text-[#9ca3af]">
                    <span>Data: {evt.date}</span>
                    <span className="text-[#c99e64] font-medium capitalize">
                      {evt.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. GALLERIES TAB */}
        {activeTab === 'galleries' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif-luxury text-xl text-white">Galerias Privadas</h3>
                <p className="text-xs text-[#9ca3af]">
                  Configure regras de preços (Opção A sem preço ou Opção B com preço padrão).
                </p>
              </div>
              <button
                onClick={() => setShowGalleryModal(true)}
                className="px-4 py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Galeria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleries.map((gal) => (
                <div
                  key={gal.id}
                  className="bg-[#12151a] border border-[#20252e] rounded-xl overflow-hidden shadow-lg"
                >
                  <div className="h-40 bg-[#161920] relative">
                    {gal.coverImage ? (
                      <img
                        src={gal.coverImage}
                        alt={gal.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9ca3af] text-xs">
                        Sem fotos ainda
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => handleDeleteGallery(gal.id)}
                        className="p-1.5 bg-black/70 hover:bg-[#ef4444] text-white rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider">
                      Cliente: {gal.clientName}
                    </span>
                    <h4 className="text-base font-serif-luxury text-white">{gal.title}</h4>
                    <p className="text-xs text-[#828a95]">Evento: {gal.eventName}</p>

                    <div className="pt-2 border-t border-[#1d212a] flex justify-between items-center text-xs">
                      <span className="text-white font-semibold">{gal.photoCount} fotos</span>
                      <span className="text-[#c99e64]">
                        {gal.pricingType === 'fixed'
                          ? `R$ ${gal.defaultPrice?.toFixed(2).replace('.', ',')} / foto`
                          : 'Sem preços definidos'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        selectGalleryForPhotoManagement(gal);
                        setActiveTab('photos');
                      }}
                      className="w-full mt-2 py-2 bg-[#1b1f28] hover:bg-[#252b38] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-[#2a303e]"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#c99e64]" />
                      <span>Gerenciar Fotos Desta Galeria</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PHOTOS & UPLOAD TAB (SECTIONS 10 & 11) */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Gallery Selector Bar */}
            <div className="bg-[#12151a] p-4 rounded-xl border border-[#20252e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-[#9ca3af] uppercase tracking-wider font-semibold">
                  Galeria Selecionada:
                </label>
                <select
                  value={selectedGalleryForPhotos?.id || ''}
                  onChange={(e) => {
                    const gal = galleries.find((g) => g.id === e.target.value);
                    if (gal) selectGalleryForPhotoManagement(gal);
                  }}
                  className="bg-[#0c0e11] border border-[#252a35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                >
                  {galleries.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.clientName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons: Batch Upload, Demo Photos, Renumber */}
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="multi-photo-file-upload"
                  className="px-3.5 py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload de Fotos</span>
                  <input
                    id="multi-photo-file-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleBatchPhotoUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleAddSamplePhotos}
                  className="px-3 py-2 bg-[#1b1f28] hover:bg-[#252a37] border border-[#2b313d] text-xs text-[#d1d5db] rounded-lg transition-colors"
                >
                  + Adicionar Fotos Exemplo
                </button>

                <button
                  onClick={handleRenumberGallery}
                  className="px-3 py-2 bg-[#1b1f28] hover:bg-[#252a37] border border-[#2b313d] text-xs text-[#c99e64] rounded-lg transition-colors flex items-center gap-1"
                  title="Gera numeração sequencial 001, 002, 003..."
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renumerar Sequencial</span>
                </button>
              </div>
            </div>

            {/* Photos Grid with Automatic Numbering Display (001, 002, 003...) */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-white">
                  Fotos da Galeria ({currentGalleryPhotos.length})
                </h4>
                <p className="text-xs text-[#828a95]">
                  Numeração gerada automaticamente. Clique no ícone de lápis para editar preço individual ou descrição.
                </p>
              </div>

              {currentGalleryPhotos.length === 0 ? (
                <div className="py-20 text-center bg-[#12151a] rounded-2xl border border-[#20252e] p-8 max-w-md mx-auto">
                  <Camera className="w-10 h-10 text-[#c99e64] mx-auto mb-2 opacity-60" />
                  <h4 className="text-sm font-serif-luxury text-white">Nenhuma foto enviada para esta galeria</h4>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Faça upload de fotos do seu computador ou adicione fotos de exemplo para testar.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {currentGalleryPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-[#12151a] border border-[#20252e] rounded-xl overflow-hidden group shadow-md"
                    >
                      <div className="relative aspect-square overflow-hidden bg-black">
                        <img
                          src={photo.imageUrl}
                          alt={`Foto #${photo.number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Visible number badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 font-mono text-xs font-bold text-[#c99e64] rounded border border-white/10">
                          #{photo.number}
                        </div>

                        {/* Actions overlay */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingPhoto(photo)}
                            className="p-1 bg-black/75 hover:bg-[#c99e64] hover:text-black text-white rounded transition-colors"
                            title="Editar foto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="p-1 bg-black/75 hover:bg-[#ef4444] text-white rounded transition-colors"
                            title="Excluir foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-white">#{photo.number}</span>
                          <span className="text-[11px] text-[#c99e64]">
                            {typeof photo.price === 'number' && photo.price > 0
                              ? `R$ ${photo.price.toFixed(2).replace('.', ',')}`
                              : 'Padrão'}
                          </span>
                        </div>
                        {photo.description && (
                          <p className="text-[10px] text-[#828a95] truncate mt-0.5">
                            {photo.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. SELECTIONS TAB (SECTION 16) */}
        {activeTab === 'selections' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif-luxury text-xl text-white">Controle de Seleções de Fotos</h3>
              <p className="text-xs text-[#9ca3af]">
                Visualize as escolhas exatas dos clientes, altere status e emita orçamentos.
              </p>
            </div>

            {selections.length === 0 ? (
              <div className="py-20 text-center bg-[#12151a] rounded-2xl border border-[#20252e] p-8 max-w-md mx-auto">
                <CheckSquare className="w-10 h-10 text-[#c99e64] mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-serif-luxury text-white">Nenhuma seleção enviada</h4>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Assim que os clientes concluírem suas seleções pela Área do Cliente, elas
                  aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selections.map((sel) => (
                  <div
                    key={sel.id}
                    className="bg-[#12151a] border border-[#20252e] rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1d212a] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">{sel.clientName}</span>
                          <span className="text-xs text-[#6b7280]">•</span>
                          <span className="text-xs font-semibold text-[#c99e64]">{sel.eventName}</span>
                        </div>
                        <p className="text-xs text-[#9ca3af]">
                          Solicitado em {new Date(sel.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#9ca3af]">Status:</span>
                        <select
                          value={sel.status}
                          onChange={(e) =>
                            handleUpdateSelectionStatus(sel.id, e.target.value as SelectionStatus)
                          }
                          className="bg-[#1a1e26] border border-[#2b313d] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                        >
                          <option value="Nova">Nova</option>
                          <option value="Em análise">Em análise</option>
                          <option value="Orçamento enviado">Orçamento enviado</option>
                          <option value="Finalizada">Finalizada</option>
                        </select>
                      </div>
                    </div>

                    {/* Numbers List & Total */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 bg-[#0c0e11] p-3 rounded-lg border border-[#1e2229]">
                        <span className="text-[#9ca3af] block font-semibold mb-1">
                          Fotos Selecionadas ({sel.photoCount}):
                        </span>
                        <p className="font-mono text-[#e5e7eb] leading-relaxed break-words">
                          {sel.selectedPhotos.map((p) => p.number).join(', ')}
                        </p>
                        {sel.notes && (
                          <div className="mt-2 pt-2 border-t border-[#1a1d24] text-[#d1d5db]">
                            <span className="text-[#c99e64] font-semibold">Obs do cliente: </span>
                            "{sel.notes}"
                          </div>
                        )}
                      </div>

                      <div className="bg-[#0c0e11] p-3 rounded-lg border border-[#1e2229] flex flex-col justify-between">
                        <div>
                          <span className="text-[#9ca3af] block font-semibold">Valor Total:</span>
                          <span className="text-base font-bold text-white block mt-1">
                            {sel.totalPrice !== null
                              ? `R$ ${sel.totalPrice.toFixed(2).replace('.', ',')}`
                              : 'Sob Consulta'}
                          </span>
                        </div>

                        <button
                          onClick={() => setInspectedSelection(sel)}
                          className="mt-3 w-full py-2 bg-[#c99e64] hover:bg-[#d4af37] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Fotos Escolhidas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <AdminPortfolioTab />
        )}
      </div>

      {/* MODAL: INSPECT SELECTED PHOTOS IN DETAIL (SECTION 16) */}
      {inspectedSelection && (
        <div
          onClick={() => setInspectedSelection(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#20252e]">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-[#c99e64] font-semibold">
                  Visualização de Fotos Escolhidas
                </span>
                <h3 className="font-serif-luxury text-xl text-white">
                  Seleção de {inspectedSelection.clientName}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSelection(null)}
                className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#1e2229]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {inspectedSelection.selectedPhotos.map((p) => (
                  <div
                    key={p.photoId}
                    className="bg-[#0c0e11] border border-[#20252e] rounded-xl overflow-hidden"
                  >
                    <div className="relative aspect-square">
                      <img
                        src={p.imageUrl}
                        alt={`Foto #${p.number}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 font-mono text-xs font-bold text-[#c99e64] rounded border border-white/10">
                        #{p.number}
                      </div>
                    </div>
                    <div className="p-2 text-xs">
                      {p.price ? (
                        <span className="text-[#e5e7eb] font-semibold">
                          R$ {p.price.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-[#828a95]">Incluso</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#20252e] flex justify-between items-center text-xs">
              <span className="text-[#9ca3af]">
                Total de {inspectedSelection.photoCount} fotos
              </span>
              <button
                onClick={() => setInspectedSelection(null)}
                className="px-5 py-2 bg-[#1b1f28] hover:bg-[#262c3a] text-white rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PHOTO (NUMBER, PRICE, DESCRIPTION) */}
      {editingPhoto && (
        <div
          onClick={() => setEditingPhoto(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif-luxury text-lg text-white">Editar Fotografia</h3>
              <button onClick={() => setEditingPhoto(null)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhotoEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Número da Foto
                </label>
                <input
                  type="text"
                  required
                  value={editingPhoto.number}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, number: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Preço Individual (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={editingPhoto.price || ''}
                  onChange={(e) =>
                    setEditingPhoto({
                      ...editingPhoto,
                      price: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Deixar vazio para usar preço padrão da galeria"
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Descrição / Legenda Opcional
                </label>
                <textarea
                  rows={2}
                  value={editingPhoto.description || ''}
                  onChange={(e) =>
                    setEditingPhoto({ ...editingPhoto, description: e.target.value })
                  }
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 bg-[#1a1e26] text-white rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c99e64] text-black font-bold rounded-lg"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CLIENT WITH PASSWORD DEFINITION */}
      {showClientModal && (
        <div
          onClick={() => setShowClientModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 sm:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Novo Cadastro</span>
                <h3 className="font-serif-luxury text-xl text-white">Criar Novo Cliente</h3>
              </div>
              <button onClick={() => setShowClientModal(false)} className="text-[#9ca3af] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="ex: João & Maria Silva"
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  E-mail (Login do Cliente)
                </label>
                <input
                  type="email"
                  required
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  placeholder="ex: cliente@email.com"
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Senha Inicial de Acesso
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={clientForm.password}
                    onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                    placeholder="Defina a senha (ex: cliente123)"
                    className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 pr-20 text-white font-mono focus:border-[#c99e64] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setClientForm({
                        ...clientForm,
                        password: 'rfv' + Math.floor(1000 + Math.random() * 9000),
                      })
                    }
                    className="absolute right-2 top-2 text-[10px] px-2 py-1 bg-[#1e232d] hover:bg-[#2c3444] text-[#c99e64] rounded border border-[#373f4e]"
                  >
                    Gerar
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 block">
                  O cliente usará este e-mail e senha para entrar na Área Privada.
                </span>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  placeholder="(38) 99999-9999"
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Observações Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  placeholder="Pacote contratado, data prevista, noivos, etc."
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#c99e64] hover:bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors mt-2 cursor-pointer shadow-lg shadow-[#c99e64]/20"
              >
                Cadastrar Cliente & Salvar Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW & MODIFY CLIENT PASSWORD */}
      {clientPasswordModal && (
        <div
          onClick={() => setClientPasswordModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 sm:p-8"
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#c99e64]/10 text-[#c99e64]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#c99e64] font-semibold tracking-wider">
                    Credenciais do Cliente
                  </span>
                  <h3 className="font-serif-luxury text-lg text-white">
                    Senha de {clientPasswordModal.client.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setClientPasswordModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Current Password Card */}
              <div className="bg-[#0b0d10] border border-[#222730] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[#9ca3af]">
                  <span className="font-medium">Senha Atual Cadastrada:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setClientPasswordModal({
                        ...clientPasswordModal,
                        showCurrent: !clientPasswordModal.showCurrent,
                      })
                    }
                    className="flex items-center gap-1 text-[11px] text-[#c99e64] hover:underline cursor-pointer"
                  >
                    {clientPasswordModal.showCurrent ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar Senha</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-[#15181f] px-3 py-2.5 rounded-lg border border-[#272d38]">
                  <span className="font-mono text-base font-semibold text-white tracking-wider">
                    {clientPasswordModal.showCurrent
                      ? clientPasswordModal.client.password || 'cliente123'
                      : '••••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyClientAccess(clientPasswordModal.client)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#20252f] hover:bg-[#2b3240] text-gray-200 text-[11px] transition-colors cursor-pointer"
                    title="Copiar dados para enviar ao cliente"
                  >
                    {clientPasswordModal.copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#c99e64]" />
                        <span>Copiar Acesso</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  Caso o cliente tenha esquecido, você pode informar a senha acima ou definir uma nova abaixo.
                </p>
              </div>

              {/* Set New Password Form */}
              <div className="space-y-3 pt-2">
                <label className="block text-gray-300 font-semibold uppercase tracking-wider text-[10px]">
                  Definir Nova Senha para o Cliente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientPasswordModal.newPassword}
                    onChange={(e) =>
                      setClientPasswordModal({
                        ...clientPasswordModal,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Digite a nova senha..."
                    className="flex-1 bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white font-mono focus:border-[#c99e64] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setClientPasswordModal({
                        ...clientPasswordModal,
                        newPassword: 'rocha' + Math.floor(100 + Math.random() * 900),
                      })
                    }
                    className="px-3 py-2 bg-[#1b1f28] hover:bg-[#252a36] text-gray-300 rounded-lg border border-[#2d3442] text-[11px]"
                  >
                    Sugerir
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveClientPassword}
                    className="flex-1 py-2.5 bg-[#c99e64] hover:bg-[#d4af37] text-black font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Salvar Nova Senha
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientPasswordModal(null)}
                    className="px-4 py-2.5 bg-[#1b1f28] hover:bg-[#252a36] text-gray-300 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* Send by WhatsApp Quick Button */}
              <div className="pt-2 border-t border-[#20252e]">
                <button
                  type="button"
                  onClick={() => handleCopyClientAccess(clientPasswordModal.client)}
                  className="w-full py-2.5 bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#25d366] border border-[#25d366]/30 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Copiar Mensagem Pronta para WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORGANIZED CLIENT DELETION CONFIRMATION */}
      {clientToDelete && (() => {
        const clientEvents = events.filter((e) => e.clientId === clientToDelete.id);
        const clientEventIds = new Set(clientEvents.map((e) => e.id));
        const clientGalleries = galleries.filter(
          (g) => g.clientId === clientToDelete.id || clientEventIds.has(g.eventId)
        );

        return (
          <div
            onClick={() => setClientToDelete(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12151a] border border-[#ef4444]/40 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 shrink-0 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-red-400 font-bold tracking-wider">
                    Exclusão Organizada de Cliente
                  </span>
                  <h3 className="font-serif-luxury text-xl text-white">
                    Excluir {clientToDelete.name}?
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {clientToDelete.email} • {clientToDelete.phone || 'Sem telefone'}
                  </p>
                </div>
              </div>

              {/* Linked Items Summary */}
              <div className="bg-[#0c0d10] border border-[#20252e] rounded-xl p-4 space-y-2 text-xs">
                <span className="font-semibold text-gray-300 block">
                  Itens vinculados a este cliente no sistema:
                </span>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#15181f] p-2.5 rounded-lg border border-[#232935]">
                    <span className="text-gray-400 block text-[10px] uppercase">Eventos</span>
                    <span className="text-white font-bold text-base">
                      {clientEvents.length} cadastrado(s)
                    </span>
                  </div>
                  <div className="bg-[#15181f] p-2.5 rounded-lg border border-[#232935]">
                    <span className="text-gray-400 block text-[10px] uppercase">Galerias Privadas</span>
                    <span className="text-white font-bold text-base">
                      {clientGalleries.length} vinculada(s)
                    </span>
                  </div>
                </div>

                {clientEvents.length > 0 && (
                  <div className="text-[11px] text-gray-400 pt-2 border-t border-[#1e232c]">
                    <p className="font-medium text-gray-300 mb-1">Eventos encontrados:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                      {clientEvents.map((ev) => (
                        <li key={ev.id}>
                          {ev.name} ({new Date(ev.date).toLocaleDateString('pt-BR')})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Cascade Deletion Option */}
              <div className="bg-[#161a22] border border-[#293140] rounded-xl p-3.5 text-xs space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteCascade}
                    onChange={(e) => setDeleteCascade(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#ef4444] focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-white block">
                      Exclusão Completa em Cascata (Recomendado para limpeza)
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Remove o cliente e automaticamente todos os seus eventos, galerias, fotos e
                      seleções vinculadas, mantendo o banco de dados 100% organizado.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  disabled={isDeletingClient}
                  className="flex-1 py-3 bg-[#1b1f28] hover:bg-[#252a36] text-gray-300 font-semibold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteClient}
                  disabled={isDeletingClient}
                  className="flex-1 py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingClient ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: CREATE EVENT (SECTION 9) */}
      {showEventModal && (
        <div
          onClick={() => setShowEventModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 sm:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Agendamento</span>
                <h3 className="font-serif-luxury text-xl text-white">Criar Novo Evento</h3>
              </div>
              <button onClick={() => setShowEventModal(false)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Cliente Vinculado
                </label>
                <select
                  required
                  value={eventForm.clientId}
                  onChange={(e) => setEventForm({ ...eventForm, clientId: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Nome do Evento
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  placeholder="ex: Casamento Mariana e Lucas"
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Data do Evento
                </label>
                <input
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Categoria do Evento
                </label>
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as any })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                >
                  <option value="Casamentos">Casamentos</option>
                  <option value="15 Anos">15 Anos</option>
                  <option value="Fotos Gestantes">Fotos Gestantes</option>
                  <option value="Studio Fotográfico">Studio Fotográfico</option>
                  <option value="Book">Book</option>
                  <option value="Formatura">Formatura</option>
                  <option value="Aniversário Infantil">Aniversário Infantil</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#c99e64] hover:bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors mt-2"
              >
                Cadastrar Evento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GALLERY & SET PRICING (SECTION 9 & 11) */}
      {showGalleryModal && (
        <div
          onClick={() => setShowGalleryModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 sm:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Entrega</span>
                <h3 className="font-serif-luxury text-xl text-white">Criar Nova Galeria</h3>
              </div>
              <button onClick={() => setShowGalleryModal(false)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGallery} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Evento Correspondente
                </label>
                <select
                  required
                  value={galleryForm.eventId}
                  onChange={(e) => setGalleryForm({ ...galleryForm, eventId: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                >
                  <option value="">Selecione um evento</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} ({evt.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Título da Galeria
                </label>
                <input
                  type="text"
                  required
                  value={galleryForm.title}
                  onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                  placeholder="ex: Galeria Oficial — Seleção dos Noivos"
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              {/* Pricing System Option A vs Option B as required in Section 11 */}
              <div className="p-3 bg-[#181b22] rounded-xl border border-[#252a35] space-y-2">
                <span className="block text-white font-semibold uppercase text-[11px]">
                  Sistema de Preços:
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[#d1d5db] cursor-pointer">
                    <input
                      type="radio"
                      name="pricingType"
                      checked={galleryForm.pricingType === 'none'}
                      onChange={() => setGalleryForm({ ...galleryForm, pricingType: 'none' })}
                      className="accent-[#c99e64]"
                    />
                    <span>
                      <strong>OPÇÃO A:</strong> Não definir preços (orçamento posterior)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-[#d1d5db] cursor-pointer">
                    <input
                      type="radio"
                      name="pricingType"
                      checked={galleryForm.pricingType === 'fixed'}
                      onChange={() => setGalleryForm({ ...galleryForm, pricingType: 'fixed' })}
                      className="accent-[#c99e64]"
                    />
                    <span>
                      <strong>OPÇÃO B:</strong> Definir preço padrão por foto
                    </span>
                  </label>
                </div>

                {galleryForm.pricingType === 'fixed' && (
                  <div className="pt-2">
                    <label className="block text-[#9ca3af] mb-1">Preço padrão (R$ / foto):</label>
                    <input
                      type="number"
                      step="1.00"
                      value={galleryForm.defaultPrice}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, defaultPrice: Number(e.target.value) })
                      }
                      className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2 text-white"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#c99e64] hover:bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors mt-2"
              >
                Criar Galeria
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
