import {
  Client,
  PhotoEvent,
  Gallery,
  Photo,
  SelectionRecord,
  PortfolioItem,
  PortfolioCategory,
  PortfolioPhoto,
  User,
  SelectionStatus,
} from '../types.js';

export interface DashboardStats {
  totalCategories: number;
  activeCategories: number;
  totalPhotos: number;
  activePhotos: number;
  inactivePhotos: number;
  totalClients: number;
  totalGalleries: number;
  totalSelections: number;
  pendingSelections: number;
  totalEvents: number;
}

const API_BASE = '/api';

function getAdminHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('rocha_auth_token') || 'token-admin-session';
  return {
    'x-admin-token': token,
    ...extraHeaders,
  };
}

export const api = {
  // Auth
  async login(email: string, password?: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Falha ao autenticar.');
    }
    return data;
  },

  // Clients
  async getClients(): Promise<Client[]> {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) throw new Error('Erro ao carregar clientes');
    return res.json();
  },

  async createClient(client: Partial<Client>): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) throw new Error('Erro ao criar cliente');
    return res.json();
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) throw new Error('Erro ao atualizar cliente');
    return res.json();
  },

  async updateClientPassword(id: string, password: string): Promise<{ success: boolean; client: Client }> {
    const res = await fetch(`${API_BASE}/clients/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha do cliente');
    return data;
  },

  async deleteClient(id: string, cascade: boolean = false): Promise<{ success: boolean; deletedEventsCount?: number; deletedGalleriesCount?: number }> {
    const res = await fetch(`${API_BASE}/clients/${id}?cascade=${cascade}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir cliente');
    return data;
  },

  // Events
  async getEvents(clientId?: string): Promise<PhotoEvent[]> {
    const url = clientId ? `${API_BASE}/events?clientId=${clientId}` : `${API_BASE}/events`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar eventos');
    return res.json();
  },

  async createEvent(event: Partial<PhotoEvent>): Promise<PhotoEvent> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Erro ao criar evento');
    return res.json();
  },

  async updateEvent(id: string, event: Partial<PhotoEvent>): Promise<PhotoEvent> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Erro ao atualizar evento');
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir evento');
  },

  // Galleries
  async getGalleries(clientId?: string): Promise<Gallery[]> {
    const url = clientId ? `${API_BASE}/galleries?clientId=${clientId}` : `${API_BASE}/galleries`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar galerias');
    return res.json();
  },

  async getGallery(id: string): Promise<Gallery & { photos: Photo[] }> {
    const res = await fetch(`${API_BASE}/galleries/${id}`);
    if (!res.ok) throw new Error('Erro ao carregar galeria');
    return res.json();
  },

  async createGallery(gallery: Partial<Gallery>): Promise<Gallery> {
    const res = await fetch(`${API_BASE}/galleries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gallery),
    });
    if (!res.ok) throw new Error('Erro ao criar galeria');
    return res.json();
  },

  async updateGallery(id: string, gallery: Partial<Gallery>): Promise<Gallery> {
    const res = await fetch(`${API_BASE}/galleries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gallery),
    });
    if (!res.ok) throw new Error('Erro ao atualizar galeria');
    return res.json();
  },

  async deleteGallery(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/galleries/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir galeria');
  },

  // Photos
  async uploadPhotos(galleryId: string, photos: Partial<Photo>[]): Promise<{ success: boolean; photos: Photo[] }> {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photos),
    });
    if (!res.ok) throw new Error('Erro ao fazer upload das fotos');
    return res.json();
  },

  async updatePhoto(galleryId: string, photoId: string, photo: Partial<Photo>): Promise<Photo> {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/photos/${photoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo),
    });
    if (!res.ok) throw new Error('Erro ao atualizar foto');
    return res.json();
  },

  async deletePhoto(galleryId: string, photoId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/photos/${photoId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir foto');
  },

  async renumberPhotos(galleryId: string): Promise<{ success: boolean; photos: Photo[] }> {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/renumber`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Erro ao renumerar fotos');
    return res.json();
  },

  async reorderPhotos(galleryId: string, photoIds: string[]): Promise<{ success: boolean; photos: Photo[] }> {
    const res = await fetch(`${API_BASE}/galleries/${galleryId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds }),
    });
    if (!res.ok) throw new Error('Erro ao reordenar fotos');
    return res.json();
  },

  // Selections
  async getSelections(clientId?: string): Promise<SelectionRecord[]> {
    const url = clientId ? `${API_BASE}/selections?clientId=${clientId}` : `${API_BASE}/selections`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar seleções');
    return res.json();
  },

  async submitSelection(selectionData: {
    clientId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    eventId: string;
    eventName: string;
    galleryId: string;
    galleryTitle: string;
    selectedPhotos: Array<{ photoId: string; number: string; imageUrl: string; price?: number; description?: string }>;
    notes?: string;
  }): Promise<{ success: boolean; selection: SelectionRecord; whatsappMessage: string; whatsappUrl: string }> {
    const res = await fetch(`${API_BASE}/selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectionData),
    });
    if (!res.ok) throw new Error('Erro ao registrar seleção');
    return res.json();
  },

  async updateSelectionStatus(selectionId: string, status: SelectionStatus): Promise<SelectionRecord> {
    const res = await fetch(`${API_BASE}/selections/${selectionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar status da seleção');
    return res.json();
  },

  // Dashboard Metrics & Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/admin/dashboard-stats`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar métricas do painel');
    return res.json();
  },

  // Portfolio - Categories
  async getPortfolioCategories(includeInactive: boolean = false): Promise<PortfolioCategory[]> {
    const res = await fetch(`${API_BASE}/portfolio/categories?includeInactive=${includeInactive}`, {
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao carregar categorias');
    return res.json();
  },

  async createPortfolioCategory(category: {
    name: string;
    description?: string;
    active?: boolean;
    order?: number;
  }): Promise<PortfolioCategory> {
    const res = await fetch(`${API_BASE}/admin/portfolio/categories`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar categoria');
    return data;
  },

  async updatePortfolioCategory(
    id: string,
    updates: Partial<PortfolioCategory>
  ): Promise<PortfolioCategory> {
    const res = await fetch(`${API_BASE}/admin/portfolio/categories/${id}`, {
      method: 'PUT',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar categoria');
    return data;
  },

  async deletePortfolioCategory(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/portfolio/categories/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir categoria');
    return data;
  },

  async reorderPortfolioCategories(categoryIds: string[]): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/portfolio/categories/reorder`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ categoryIds }),
    });
    if (!res.ok) throw new Error('Erro ao reordenar categorias');
    return res.json();
  },

  async togglePortfolioCategoryActive(id: string): Promise<PortfolioCategory> {
    const cats = await this.getPortfolioCategories(true);
    const cat = cats.find((c) => c.id === id);
    if (!cat) throw new Error('Categoria não encontrada');
    return this.updatePortfolioCategory(id, { active: !cat.active });
  },

  // Portfolio - Photos (Admin & Public)
  async getPortfolioPhotos(params?: {
    categoryId?: string;
    category?: string;
    status?: 'all' | 'active' | 'inactive';
    activeOnly?: boolean;
    search?: string;
    isAdmin?: boolean;
  }): Promise<PortfolioPhoto[]> {
    const query = new URLSearchParams();
    if (params?.categoryId && params.categoryId !== 'Todos') {
      query.set('categoryId', params.categoryId);
    }
    if (params?.category && params.category !== 'Todos') {
      query.set('category', params.category);
    }
    if (params?.activeOnly) {
      query.set('status', 'active');
    } else if (params?.status && params.status !== 'all') {
      query.set('status', params.status);
    }
    if (params?.search) {
      query.set('search', params.search);
    }

    const isAdmin = params?.isAdmin !== false;
    const endpoint = isAdmin
      ? `${API_BASE}/admin/portfolio/photos?${query.toString()}`
      : `${API_BASE}/portfolio?${query.toString()}`;

    const res = await fetch(endpoint, {
      headers: isAdmin ? getAdminHeaders() : {},
    });
    if (!res.ok) throw new Error('Erro ao carregar fotografias do portfólio');
    return res.json();
  },

  async uploadPortfolioPhotos(
    filesOrFormData: File[] | FormData,
    categoryName?: string,
    extra?: { title?: string; caption?: string; active?: boolean }
  ): Promise<{
    success: boolean;
    count: number;
    photos: PortfolioPhoto[];
    category: string;
  }> {
    let formData: FormData;
    if (filesOrFormData instanceof FormData) {
      formData = filesOrFormData;
    } else {
      formData = new FormData();
      filesOrFormData.forEach((f) => formData.append('files', f));
      if (categoryName) formData.append('category', categoryName);
      if (extra?.title) formData.append('title', extra.title);
      if (extra?.caption) formData.append('description', extra.caption);
      if (extra?.active !== undefined) formData.append('active', String(extra.active));
    }

    const res = await fetch(`${API_BASE}/admin/portfolio/photos/upload`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar fotografias');
    return data;
  },

  async updatePortfolioPhoto(
    id: string,
    updates: Partial<PortfolioPhoto> & { category?: string; caption?: string }
  ): Promise<PortfolioPhoto> {
    const payload: any = { ...updates };
    if (updates.caption && !updates.description) {
      payload.description = updates.caption;
    }
    const res = await fetch(`${API_BASE}/admin/portfolio/photos/${id}`, {
      method: 'PUT',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar fotografia');
    return data;
  },

  async replacePortfolioPhoto(
    id: string,
    file: File
  ): Promise<{ success: boolean; photo: PortfolioPhoto; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/admin/portfolio/photos/${id}/replace`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao substituir arquivo da fotografia');
    return data;
  },

  async replacePortfolioPhotoFile(
    id: string,
    file: File
  ): Promise<{ success: boolean; photo: PortfolioPhoto; message: string }> {
    return this.replacePortfolioPhoto(id, file);
  },

  async deletePortfolioPhoto(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/portfolio/photos/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir fotografia');
    return data;
  },

  async reorderPortfolioPhotos(photoIds: string[]): Promise<{ success: boolean; photos: PortfolioPhoto[] }> {
    const res = await fetch(`${API_BASE}/admin/portfolio/photos/reorder`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ photoIds }),
    });
    if (!res.ok) throw new Error('Erro ao reordenar fotografias');
    const data = await res.json();
    const photos = await this.getPortfolioPhotos({ isAdmin: true });
    return { success: data.success, photos };
  },

  async renumberPortfolioPhotos(categoryOrId?: string): Promise<{
    success: boolean;
    count: number;
    renumberedCount: number;
    message: string;
    photos: PortfolioPhoto[];
  }> {
    let categoryId = categoryOrId;
    if (categoryOrId && categoryOrId !== 'Todos') {
      const cats = await this.getPortfolioCategories(true);
      const matched = cats.find((c) => c.name.toLowerCase() === categoryOrId.toLowerCase() || c.id === categoryOrId);
      if (matched) categoryId = matched.id;
    }

    const res = await fetch(`${API_BASE}/admin/portfolio/photos/renumber`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ categoryId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao renumerar fotografias');
    const photos = await this.getPortfolioPhotos({ isAdmin: true });
    return {
      success: data.success,
      count: data.count,
      renumberedCount: data.count,
      message: data.message,
      photos,
    };
  },

  // Legacy Portfolio compatibility
  async getPortfolio(category?: string): Promise<PortfolioItem[]> {
    const url = category && category !== 'Todos' ? `${API_BASE}/portfolio?category=${encodeURIComponent(category)}` : `${API_BASE}/portfolio`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar portfólio');
    return res.json();
  },

  async getPortfolioSummary(): Promise<{ total: number; categories: Record<string, number>; isUsingRealPhotos: boolean }> {
    const res = await fetch(`${API_BASE}/portfolio/summary`);
    if (!res.ok) throw new Error('Erro ao carregar resumo do portfólio');
    return res.json();
  },

  async importPortfolioZip(file: File, replaceDemo: boolean = true): Promise<{ success: boolean; message: string; count: number; categories: Record<string, number>; totalInPortfolio: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/portfolio/import-zip?replaceDemo=${replaceDemo}`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao importar arquivo ZIP.');
    return data;
  },

  async importPortfolioFiles(files: File[], paths: string[], defaultCategory: string = 'Geral', replaceDemo: boolean = false): Promise<{ success: boolean; count: number; categories: Record<string, number>; totalInPortfolio: number }> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
      if (paths[i]) {
        formData.append('paths', paths[i]);
      }
    }
    formData.append('category', defaultCategory);
    formData.append('replaceDemo', String(replaceDemo));

    const res = await fetch(`${API_BASE}/portfolio/import-files`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao importar arquivos.');
    return data;
  },

  async scanLocalPortfolio(replaceDemo: boolean = false): Promise<{ success: boolean; count: number; message: string; totalInPortfolio: number }> {
    const res = await fetch(`${API_BASE}/portfolio/scan-local`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ replaceDemo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao escanear fotos locais.');
    return data;
  },

  async createPortfolioItem(item: Partial<PortfolioItem>): Promise<PortfolioItem> {
    const res = await fetch(`${API_BASE}/portfolio`, {
      method: 'POST',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Erro ao adicionar foto ao portfólio');
    return res.json();
  },

  async updatePortfolioItem(id: string, item: Partial<PortfolioItem>): Promise<PortfolioItem> {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: 'PUT',
      headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Erro ao atualizar foto do portfólio');
    return res.json();
  },

  async deletePortfolioItem(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao excluir foto do portfólio');
  },

  async clearPortfolioCategory(category: string): Promise<{ success: boolean; removedCount: number }> {
    const res = await fetch(`${API_BASE}/portfolio/category/${encodeURIComponent(category)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao limpar categoria');
    return res.json();
  },

  async resetPortfolioDemo(): Promise<{ success: boolean; count: number; items: PortfolioItem[] }> {
    const res = await fetch(`${API_BASE}/portfolio/reset-demo`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Erro ao restaurar fotos demo');
    return res.json();
  },
};
