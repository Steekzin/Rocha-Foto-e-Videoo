export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  userId?: string;
  notes?: string;
  createdAt: string;
}

export type EventCategory = 
  | 'Casamentos'
  | '15 Anos'
  | 'Fotos Gestantes'
  | 'Book'
  | 'Pré Wedding'
  | 'Pós Casamento'
  | 'Aniversário Infantil'
  | 'Casamento Cristã do Brasil'
  | 'Missa 15 Anos'
  | 'Aniversário 50 Anos'
  | 'Cerimônia de Casamento Cristã'
  | 'Cerimônia de Casamento Católico'
  | 'Pré Casamento'
  | 'Casamento Cartório Civil'
  | 'Making Off'
  | 'Batizado'
  | 'Aniversário 90 Anos'
  | 'Fotos Para Redes Sociais'
  | 'Formatura'
  | 'Aniversário 30 Anos'
  | 'Bodas de Prata'
  | 'Aniversário 70 Anos'
  | 'Studio Fotográfico'
  | 'Outros';

export type EventStatus = 'planejado' | 'em_andamento' | 'fotos_prontas' | 'concluido';

export interface PhotoEvent {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  date: string;
  location?: string;
  category: EventCategory;
  description?: string;
  status: EventStatus;
  createdAt: string;
}

export type PricingType = 'none' | 'fixed';

export interface Gallery {
  id: string;
  eventId: string;
  eventName: string;
  clientId: string;
  clientName: string;
  title: string;
  slug: string;
  status: 'ativa' | 'oculta' | 'arquivada';
  pricingType: PricingType;
  defaultPrice?: number; // em Reais (ex: 15.00)
  photoCount: number;
  createdAt: string;
  coverImage?: string;
}

export interface Photo {
  id: string;
  galleryId: string;
  number: string; // Ex: '001', '002', '027'
  imageUrl: string;
  thumbnailUrl?: string;
  description?: string;
  price?: number; // Se houver preço individual
  order: number;
  createdAt: string;
}

export type SelectionStatus = 'Nova' | 'Em análise' | 'Orçamento enviado' | 'Finalizada';

export interface SelectedPhotoItem {
  photoId: string;
  number: string;
  imageUrl: string;
  price?: number;
  description?: string;
}

export interface SelectionRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventId: string;
  eventName: string;
  galleryId: string;
  galleryTitle: string;
  selectedPhotos: SelectedPhotoItem[];
  photoCount: number;
  totalPrice: number | null; // null se pricingType == 'none'
  notes?: string;
  status: SelectionStatus;
  createdAt: string;
}

export interface PortfolioCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  description?: string;
  photoCount?: number;
  createdAt: string;
}

export interface PortfolioPhoto {
  id: string;
  categoryId: string;
  categoryName: string;
  category?: string; // Compatibility alias with categoryName
  caption?: string; // Compatibility alias with description
  number: string; // Ex: '001', '002', '025' - sequential visual numbering
  order: number;
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  aspect?: 'portrait' | 'landscape' | 'square';
  active: boolean;
  featured?: boolean;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  categoryId?: string;
  categoryName?: string;
  number?: string;
  order?: number;
  active?: boolean;
  imageUrl: string;
  thumbnailUrl?: string;
  aspect?: 'portrait' | 'landscape' | 'square';
  caption?: string;
  description?: string;
  featured?: boolean;
  createdAt?: string;
}
