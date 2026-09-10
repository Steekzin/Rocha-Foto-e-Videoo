import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import AdmZip from 'adm-zip';
import {
  INITIAL_CLIENTS,
  INITIAL_EVENTS,
  INITIAL_GALLERIES,
  INITIAL_PHOTOS,
  INITIAL_SELECTIONS,
  INITIAL_PORTFOLIO,
  INITIAL_PORTFOLIO_CATEGORIES,
  INITIAL_PORTFOLIO_PHOTOS,
} from './server/seedData.js';
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
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'rocha_db.json');
const PORTFOLIO_DIR = path.join(__dirname, 'public', 'portfolio');

if (!fs.existsSync(PORTFOLIO_DIR)) {
  fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });
}

// Multer memory storage with 500MB limit for high-res photo packages
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

interface DatabaseSchema {
  clients: Client[];
  events: PhotoEvent[];
  galleries: Gallery[];
  photos: Photo[];
  selections: SelectionRecord[];
  portfolioCategories: PortfolioCategory[];
  portfolioPhotos: PortfolioPhoto[];
  portfolio: PortfolioItem[];
}

// In-memory Database with file persistence
let db: DatabaseSchema = {
  clients: [...INITIAL_CLIENTS],
  events: [...INITIAL_EVENTS],
  galleries: [...INITIAL_GALLERIES],
  photos: [...INITIAL_PHOTOS],
  selections: [...INITIAL_SELECTIONS],
  portfolioCategories: [...INITIAL_PORTFOLIO_CATEGORIES],
  portfolioPhotos: [...INITIAL_PORTFOLIO_PHOTOS],
  portfolio: [...INITIAL_PORTFOLIO],
};

function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatPhotoNumber(n: number): string {
  return String(n).padStart(3, '0');
}

function syncPortfolioLegacy() {
  if (!db.portfolioPhotos) return;
  db.portfolio = db.portfolioPhotos.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.categoryName,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    number: p.number,
    order: p.order,
    active: p.active,
    imageUrl: p.imageUrl,
    thumbnailUrl: p.thumbnailUrl,
    aspect: p.aspect,
    caption: p.description,
    description: p.description,
    featured: p.featured,
    createdAt: p.createdAt,
  }));
}

function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.clients && parsed.galleries) {
        db = parsed;
        let updated = false;
        // Ensure all clients have a password defined
        db.clients.forEach((c) => {
          if (!c.password) {
            c.password = 'cliente123';
            updated = true;
          }
        });

        // Ensure portfolioCategories exist
        if (!db.portfolioCategories || db.portfolioCategories.length === 0) {
          db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
          updated = true;
        }

        // Ensure portfolioPhotos exist
        if (!db.portfolioPhotos || db.portfolioPhotos.length === 0) {
          if (db.portfolio && db.portfolio.length > 0) {
            db.portfolioPhotos = db.portfolio.map((item, idx) => {
              let cat = db.portfolioCategories.find(
                (c) => c.name.toLowerCase() === item.category.toLowerCase()
              );
              if (!cat) {
                cat = {
                  id: `cat-${toSlug(item.category)}`,
                  name: item.category,
                  slug: toSlug(item.category),
                  order: db.portfolioCategories.length + 1,
                  active: true,
                  createdAt: new Date().toISOString(),
                };
                db.portfolioCategories.push(cat);
              }
              return {
                id: item.id || `port-${idx + 1}`,
                categoryId: cat.id,
                categoryName: cat.name,
                number: item.number || formatPhotoNumber(idx + 1),
                order: item.order || idx + 1,
                imageUrl: item.imageUrl,
                title: item.title,
                description: item.caption || item.description || '',
                aspect: item.aspect || 'portrait',
                active: item.active !== false,
                featured: Boolean(item.featured),
                createdAt: item.createdAt || new Date().toISOString(),
              };
            });
          } else {
            db.portfolioPhotos = [...INITIAL_PORTFOLIO_PHOTOS];
          }
          updated = true;
        }

        syncPortfolioLegacy();

        if (updated) saveDatabase();
        console.log('Database loaded from persistent storage.');
        return;
      }
    }
    syncPortfolioLegacy();
    saveDatabase();
  } catch (err) {
    console.error('Error loading database, using default seed data:', err);
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

loadDatabase();

async function startServer() {
  const app = express();

  // Express parser with generous limit for photo data / base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper auth simulation: client password matches client email or default demo passwords
  // Admin credentials: admin@rochafotoevideo.com.br / admin123
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (
      cleanEmail === 'admin@rochafotoevideo.com.br' ||
      cleanEmail === 'admin@rocha.com.br' ||
      cleanEmail === 'admin'
    ) {
      if (cleanPass === 'admin123' || cleanPass === 'admin' || cleanPass === '123456') {
        const adminUser: User = {
          id: 'usr-admin',
          name: 'Rocha Foto & Vídeo (Admin)',
          email: 'admin@rochafotoevideo.com.br',
          role: 'admin',
        };
        return res.json({ success: true, user: adminUser, token: 'token-admin-session' });
      } else {
        return res.status(401).json({ success: false, message: 'Senha incorreta para Administrador.' });
      }
    }

    // Check registered clients
    const client = db.clients.find((c) => c.email.toLowerCase() === cleanEmail);
    if (client) {
      const clientPassword = client.password || 'cliente123';
      const validPass =
        cleanPass === clientPassword ||
        cleanPass === 'cliente123' ||
        cleanPass === '123456' ||
        cleanPass === client.name.toLowerCase().split(' ')[0] + '123';

      if (validPass) {
        const clientUser: User = {
          id: `usr-${client.id}`,
          name: client.name,
          email: client.email,
          role: 'client',
          clientId: client.id,
        };
        return res.json({ success: true, user: clientUser, token: `token-client-${client.id}` });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta para este cliente. Caso tenha esquecido, contate o estúdio Rocha Foto & Vídeo.',
        });
      }
    }

    // If client not found
    return res.status(401).json({
      success: false,
      message: 'E-mail não cadastrado. Entre em contato com a Rocha Foto & Vídeo para liberar seu acesso.',
    });
  });

  // Client Management (Admin)
  app.get('/api/clients', (req: Request, res: Response) => {
    res.json(db.clients);
  });

  app.post('/api/clients', (req: Request, res: Response) => {
    const { name, email, phone, notes, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e E-mail são obrigatórios.' });
    }

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      password: (password || '').trim() || 'cliente123',
      notes: (notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    db.clients.unshift(newClient);
    saveDatabase();
    res.status(201).json(newClient);
  });

  app.put('/api/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const clientIndex = db.clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    db.clients[clientIndex] = {
      ...db.clients[clientIndex],
      ...req.body,
    };
    saveDatabase();
    res.json(db.clients[clientIndex]);
  });

  // Dedicated endpoint to view/update client password
  app.put('/api/clients/:id/password', (req: Request, res: Response) => {
    const { id } = req.params;
    const { password } = req.body;
    const clientIndex = db.clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!password || password.trim().length < 3) {
      return res.status(400).json({ error: 'A nova senha deve conter pelo menos 3 caracteres.' });
    }

    db.clients[clientIndex].password = password.trim();
    saveDatabase();
    res.json({ success: true, client: db.clients[clientIndex] });
  });

  app.delete('/api/clients/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const cascade = String(req.query.cascade) === 'true';

    const client = db.clients.find((c) => c.id === id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    let deletedEventsCount = 0;
    let deletedGalleriesCount = 0;

    if (cascade) {
      const clientEvents = db.events.filter((e) => e.clientId === id);
      deletedEventsCount = clientEvents.length;
      const clientEventIds = new Set(clientEvents.map((e) => e.id));

      const clientGalleries = db.galleries.filter(
        (g) => clientEventIds.has(g.eventId) || g.clientId === id
      );
      deletedGalleriesCount = clientGalleries.length;
      const clientGalleryIds = new Set(clientGalleries.map((g) => g.id));

      // Remove photos for these galleries
      db.photos = db.photos.filter((p) => !clientGalleryIds.has(p.galleryId));
      // Remove selections for these galleries or client
      db.selections = db.selections.filter(
        (s) => !clientGalleryIds.has(s.galleryId) && s.clientId !== id
      );
      // Remove galleries
      db.galleries = db.galleries.filter((g) => !clientGalleryIds.has(g.id));
      // Remove events
      db.events = db.events.filter((e) => !clientEventIds.has(e.id));
    }

    db.clients = db.clients.filter((c) => c.id !== id);
    saveDatabase();
    res.json({ success: true, deletedEventsCount, deletedGalleriesCount });
  });

  // Events Management
  app.get('/api/events', (req: Request, res: Response) => {
    const { clientId } = req.query;
    if (clientId) {
      return res.json(db.events.filter((e) => e.clientId === clientId));
    }
    res.json(db.events);
  });

  app.post('/api/events', (req: Request, res: Response) => {
    const { clientId, name, date, category, description, status } = req.body;
    const client = db.clients.find((c) => c.id === clientId);

    const newEvent: PhotoEvent = {
      id: `evt-${Date.now()}`,
      clientId,
      clientName: client ? client.name : 'Cliente Rocha',
      name: name.trim(),
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Casamentos',
      description: description || '',
      status: status || 'planejado',
      createdAt: new Date().toISOString(),
    };

    db.events.unshift(newEvent);
    saveDatabase();
    res.status(201).json(newEvent);
  });

  app.put('/api/events/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Evento não encontrado' });

    db.events[idx] = { ...db.events[idx], ...req.body };
    saveDatabase();
    res.json(db.events[idx]);
  });

  app.delete('/api/events/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.events = db.events.filter((e) => e.id !== id);
    saveDatabase();
    res.json({ success: true });
  });

  // Galleries Management
  app.get('/api/galleries', (req: Request, res: Response) => {
    const { clientId } = req.query;
    let list = db.galleries;
    if (clientId) {
      list = list.filter((g) => g.clientId === clientId);
    }
    // calculate photo count
    const enriched = list.map((g) => {
      const photos = db.photos.filter((p) => p.galleryId === g.id);
      return {
        ...g,
        photoCount: photos.length,
        coverImage: g.coverImage || (photos[0]?.imageUrl ?? undefined),
      };
    });
    res.json(enriched);
  });

  app.get('/api/galleries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const gallery = db.galleries.find((g) => g.id === id || g.slug === id);
    if (!gallery) {
      return res.status(404).json({ error: 'Galeria não encontrada' });
    }

    const photos = db.photos
      .filter((p) => p.galleryId === gallery.id)
      .sort((a, b) => a.order - b.order);

    res.json({
      ...gallery,
      photoCount: photos.length,
      photos,
    });
  });

  app.post('/api/galleries', (req: Request, res: Response) => {
    const { eventId, title, pricingType, defaultPrice, status } = req.body;
    const event = db.events.find((e) => e.id === eventId);
    if (!event) return res.status(400).json({ error: 'Evento obrigatório' });

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newGallery: Gallery = {
      id: `gal-${Date.now()}`,
      eventId,
      eventName: event.name,
      clientId: event.clientId,
      clientName: event.clientName,
      title: title.trim(),
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      status: status || 'ativa',
      pricingType: pricingType || 'none',
      defaultPrice: pricingType === 'fixed' ? Number(defaultPrice || 15) : undefined,
      photoCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.galleries.unshift(newGallery);
    saveDatabase();
    res.status(201).json(newGallery);
  });

  app.put('/api/galleries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = db.galleries.findIndex((g) => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Galeria não encontrada' });

    db.galleries[idx] = { ...db.galleries[idx], ...req.body };
    saveDatabase();
    res.json(db.galleries[idx]);
  });

  app.delete('/api/galleries/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.galleries = db.galleries.filter((g) => g.id !== id);
    db.photos = db.photos.filter((p) => p.galleryId !== id);
    saveDatabase();
    res.json({ success: true });
  });

  // Photos Management & Upload within a Gallery
  app.post('/api/galleries/:id/photos', (req: Request, res: Response) => {
    const { id: galleryId } = req.params;
    const gallery = db.galleries.find((g) => g.id === galleryId);
    if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

    const existingPhotos = db.photos
      .filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.order - b.order);

    let nextOrder = existingPhotos.length > 0 ? Math.max(...existingPhotos.map((p) => p.order)) + 1 : 1;

    // Body can receive an array of photos or single photo
    const incoming = Array.isArray(req.body) ? req.body : [req.body];
    const addedPhotos: Photo[] = [];

    for (const item of incoming) {
      const photoOrder = nextOrder++;
      const numFormatted = String(photoOrder).padStart(3, '0');
      const photoPrice = item.price !== undefined ? Number(item.price) : gallery.defaultPrice;

      const newPhoto: Photo = {
        id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        galleryId,
        number: item.number || numFormatted,
        imageUrl: item.imageUrl || item.url,
        description: item.description || '',
        price: photoPrice,
        order: photoOrder,
        createdAt: new Date().toISOString(),
      };

      db.photos.push(newPhoto);
      addedPhotos.push(newPhoto);
    }

    // update gallery cover if not present
    if (!gallery.coverImage && addedPhotos[0]?.imageUrl) {
      gallery.coverImage = addedPhotos[0].imageUrl;
    }
    gallery.photoCount = db.photos.filter((p) => p.galleryId === galleryId).length;

    saveDatabase();
    res.status(201).json({ success: true, count: addedPhotos.length, photos: addedPhotos });
  });

  // Update single photo
  app.put('/api/galleries/:galleryId/photos/:photoId', (req: Request, res: Response) => {
    const { photoId } = req.params;
    const idx = db.photos.findIndex((p) => p.id === photoId);
    if (idx === -1) return res.status(404).json({ error: 'Foto não encontrada' });

    db.photos[idx] = {
      ...db.photos[idx],
      ...req.body,
    };
    saveDatabase();
    res.json(db.photos[idx]);
  });

  // Delete single photo
  app.delete('/api/galleries/:galleryId/photos/:photoId', (req: Request, res: Response) => {
    const { galleryId, photoId } = req.params;
    db.photos = db.photos.filter((p) => p.id !== photoId);

    const gallery = db.galleries.find((g) => g.id === galleryId);
    if (gallery) {
      gallery.photoCount = db.photos.filter((p) => p.galleryId === galleryId).length;
    }

    saveDatabase();
    res.json({ success: true });
  });

  // Renumber photos sequentially (001, 002, 003...)
  app.post('/api/galleries/:galleryId/renumber', (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const galleryPhotos = db.photos
      .filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.order - b.order);

    galleryPhotos.forEach((photo, index) => {
      photo.order = index + 1;
      photo.number = String(index + 1).padStart(3, '0');
    });

    saveDatabase();
    res.json({ success: true, count: galleryPhotos.length, photos: galleryPhotos });
  });

  // Reorder photos
  app.post('/api/galleries/:galleryId/reorder', (req: Request, res: Response) => {
    const { galleryId } = req.params;
    const { photoIds } = req.body; // array of photo IDs in new order

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds deve ser um array' });
    }

    photoIds.forEach((id: string, index: number) => {
      const photo = db.photos.find((p) => p.id === id && p.galleryId === galleryId);
      if (photo) {
        photo.order = index + 1;
      }
    });

    saveDatabase();
    const updated = db.photos
      .filter((p) => p.galleryId === galleryId)
      .sort((a, b) => a.order - b.order);

    res.json({ success: true, photos: updated });
  });

  // Selections Management (Clients submitting selections & Admin reviewing)
  app.get('/api/selections', (req: Request, res: Response) => {
    const { clientId } = req.query;
    if (clientId) {
      return res.json(db.selections.filter((s) => s.clientId === clientId));
    }
    // Admin gets all sorted descending by date
    res.json(
      [...db.selections].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  });

  app.post('/api/selections', (req: Request, res: Response) => {
    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      eventId,
      eventName,
      galleryId,
      galleryTitle,
      selectedPhotos,
      notes,
    } = req.body;

    if (!selectedPhotos || !selectedPhotos.length) {
      return res.status(400).json({ error: 'Nenhuma foto selecionada.' });
    }

    // Calculate total price if applicable
    let totalPrice: number | null = null;
    const hasAnyPrice = selectedPhotos.some(
      (p: { price?: number }) => typeof p.price === 'number' && p.price > 0
    );

    if (hasAnyPrice) {
      totalPrice = selectedPhotos.reduce(
        (sum: number, p: { price?: number }) => sum + (p.price || 0),
        0
      );
    }

    const newSelection: SelectionRecord = {
      id: `sel-${Date.now()}`,
      clientId,
      clientName: clientName || 'Cliente Rocha',
      clientEmail,
      clientPhone,
      eventId,
      eventName: eventName || 'Evento Fotográfico',
      galleryId,
      galleryTitle: galleryTitle || 'Galeria Rocha',
      selectedPhotos,
      photoCount: selectedPhotos.length,
      totalPrice,
      notes: notes || '',
      status: 'Nova',
      createdAt: new Date().toISOString(),
    };

    db.selections.unshift(newSelection);
    saveDatabase();

    // Prepare organized WhatsApp message format as required by Prompt Section 15
    const photoNumbersStr = selectedPhotos.map((p: { number: string }) => p.number).join(', ');
    const formattedPrice =
      totalPrice !== null
        ? `R$ ${totalPrice.toFixed(2).replace('.', ',')}`
        : 'A definir pela Rocha Foto & Vídeo';

    const whatsappMessage = [
      'Olá, Rocha Foto & Vídeo!',
      '',
      `Cliente: ${newSelection.clientName}`,
      `Evento: ${newSelection.eventName}`,
      '',
      'Fotos selecionadas:',
      photoNumbersStr,
      '',
      `Quantidade: ${newSelection.photoCount} fotos`,
      `Valor total: ${formattedPrice}`,
      '',
      `Observação: ${newSelection.notes || 'Nenhuma'}`,
      '',
      'Gostaria de receber o orçamento/retorno referente à minha seleção.',
    ].join('\n');

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const studioWhatsApp = '5511999999999'; // número padrão Rocha Foto & Vídeo
    const whatsappUrl = `https://wa.me/${studioWhatsApp}?text=${encodedMessage}`;

    res.status(201).json({
      success: true,
      selection: newSelection,
      whatsappMessage,
      whatsappUrl,
    });
  });

  app.patch('/api/selections/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const selection = db.selections.find((s) => s.id === id);
    if (!selection) return res.status(404).json({ error: 'Seleção não encontrada' });

    selection.status = status;
    saveDatabase();
    res.json(selection);
  });

  // Serve portfolio static files with fast caching
  app.use('/portfolio', express.static(PORTFOLIO_DIR, { maxAge: '7d' }));

  // Helper: Normalize folder names to Rocha portfolio categories
  function normalizePortfolioCategory(folder: string): string {
    if (!folder) return 'Geral';
    const raw = folder.trim();
    const n = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[-_]/g, ' ');

    if (n.includes('gestant')) return 'Fotos Gestantes';
    if (n.includes('ccb') || n.includes('crista do brasil')) return 'Casamento Cristã do Brasil';
    if (n.includes('catolic')) return 'Cerimônia de Casamento Católico';
    if (n.includes('cerimonia') && n.includes('crist')) return 'Cerimônia de Casamento Cristã';
    if (n.includes('cartorio') || n.includes('civil')) return 'Casamento Cartório Civil';
    if (n.includes('making')) return 'Making Off';
    if (n.includes('missa')) return 'Missa 15 Anos';
    if (n.includes('15') || n.includes('debutant')) return '15 Anos';
    if (n.includes('pre wedding')) return 'Pré Wedding';
    if (n.includes('pos wedding') || n.includes('pos casamento') || n.includes('trash')) return 'Pós Casamento';
    if (n.includes('pre casamento')) return 'Pré Casamento';
    if (n.includes('casamento')) return 'Casamentos';
    if (n.includes('infantil')) return 'Aniversário Infantil';
    if (n.includes('50 ano')) return 'Aniversário 50 Anos';
    if (n.includes('30 ano')) return 'Aniversário 30 Anos';
    if (n.includes('70 ano')) return 'Aniversário 70 Anos';
    if (n.includes('90 ano')) return 'Aniversário 90 Anos';
    if (n.includes('boda') || n.includes('prata')) return 'Bodas de Prata';
    if (n.includes('batiz') || n.includes('batism')) return 'Batizado';
    if (n.includes('formatura') || n.includes('formando')) return 'Formatura';
    if (n.includes('rede') || n.includes('social') || n.includes('corporativ') || n.includes('perfil')) return 'Fotos Para Redes Sociais';
    if (n.includes('book') || n.includes('ensaio') || n.includes('editorial')) return 'Book';
    if (n.includes('video') || n.includes('teaser') || n.includes('film')) return 'Vídeos';

    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function cleanTitle(fileName: string): string {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');
    return withoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractAndProcessZip(buffer: Buffer, replaceDemo: boolean = true): { count: number; categories: Record<string, number>; items: PortfolioItem[] } {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const validExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.mp4', '.mov', '.m4v']);
    const newItems: PortfolioItem[] = [];
    const categoryStats: Record<string, number> = {};

    entries.forEach((entry, idx) => {
      if (entry.isDirectory) return;
      const normalizedPath = entry.entryName.replace(/\\/g, '/');
      if (normalizedPath.includes('__MACOSX') || path.basename(normalizedPath).startsWith('.')) return;

      const ext = path.extname(normalizedPath).toLowerCase();
      if (!validExts.has(ext)) return;

      const parts = normalizedPath.split('/').filter(Boolean);
      let rawCategory = 'Geral';
      if (parts.length > 1) {
        // If first part is a generic wrapper folder (like "Portfolio" or "Rocha Foto"), check next level
        if (parts.length > 2 && (parts[0].toLowerCase().includes('rocha') || parts[0].toLowerCase().includes('port'))) {
          rawCategory = parts[1];
        } else {
          rawCategory = parts[parts.length - 2];
        }
      }

      const category = normalizePortfolioCategory(rawCategory);
      const safeCategoryFolder = category.replace(/[/\\?%*:|"<>]/g, '-').trim();
      const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const rawFileName = path.basename(normalizedPath);
      const safeFileName = `${Date.now()}_${idx}_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const targetFilePath = path.join(targetDir, safeFileName);

      // Write original file with zero quality loss / no compression
      fs.writeFileSync(targetFilePath, entry.getData());

      const itemTitle = cleanTitle(rawFileName) || `${category} ${idx + 1}`;
      const imageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;

      categoryStats[category] = (categoryStats[category] || 0) + 1;

      newItems.push({
        id: `port-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: itemTitle,
        category,
        imageUrl,
        aspect: 'portrait',
        caption: `${category} — Fotografia original Rocha Foto & Vídeo`,
        featured: (categoryStats[category] || 0) <= 2,
      });
    });

    if (newItems.length > 0) {
      if (replaceDemo) {
        // Replace existing demo photos with real photographs
        db.portfolio = [...newItems];
      } else {
        // Append
        db.portfolio = [...newItems, ...db.portfolio];
      }
      saveDatabase();
    }

    return {
      count: newItems.length,
      categories: categoryStats,
      items: db.portfolio,
    };
  }

  // Scan local directory for any zip file or manually placed photos in public/portfolio
  function scanLocalPortfolioFiles(replaceDemo: boolean = false): { count: number; message: string } {
    let importedFromZip = 0;
    // Check root and public for any .zip files
    const searchDirs = [process.cwd(), path.join(process.cwd(), 'public'), DATA_DIR];
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.zip') && !file.includes('node_modules')) {
          try {
            const zipPath = path.join(dir, file);
            const buf = fs.readFileSync(zipPath);
            const result = extractAndProcessZip(buf, replaceDemo);
            importedFromZip += result.count;
            console.log(`Auto-imported ${result.count} portfolio photos from ${file}`);
          } catch (e) {
            console.error(`Error auto-importing zip ${file}:`, e);
          }
        }
      }
    }

    // Also scan existing files in public/portfolio
    let indexedLocal = 0;
    if (fs.existsSync(PORTFOLIO_DIR)) {
      const catDirs = fs.readdirSync(PORTFOLIO_DIR, { withFileTypes: true });
      for (const dirent of catDirs) {
        if (!dirent.isDirectory()) continue;
        const categoryName = normalizePortfolioCategory(dirent.name);
        const catPath = path.join(PORTFOLIO_DIR, dirent.name);
        const photoFiles = fs.readdirSync(catPath);
        for (const pFile of photoFiles) {
          if (pFile.startsWith('.')) continue;
          const ext = path.extname(pFile).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.mp4'].includes(ext)) continue;

          const relUrl = `/portfolio/${encodeURIComponent(dirent.name)}/${encodeURIComponent(pFile)}`;
          const exists = db.portfolio.some((item) => item.imageUrl === relUrl);
          if (!exists) {
            db.portfolio.push({
              id: `port-local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: cleanTitle(pFile),
              category: categoryName,
              imageUrl: relUrl,
              aspect: 'portrait',
              caption: `${categoryName} — Fotografia original Rocha Foto & Vídeo`,
              featured: false,
            });
            indexedLocal++;
          }
        }
      }
      if (indexedLocal > 0) saveDatabase();
    }

    return {
      count: importedFromZip + indexedLocal,
      message: `Encontradas e catalogadas ${importedFromZip + indexedLocal} fotografias locais.`,
    };
  }

  // Initial local scan on startup
  try {
    scanLocalPortfolioFiles(false);
  } catch (err) {
    console.error('Error during initial portfolio scan:', err);
  }

  // Admin Role Authorization Middleware
  function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
    const adminHeader = (req.headers['x-admin-token'] as string) || '';
    const authHeader = (req.headers['authorization'] as string) || '';
    const token = adminHeader || authHeader.replace(/^Bearer\s+/i, '');

    if (
      token === 'token-admin-session' ||
      token.startsWith('token-admin') ||
      req.query.adminKey === 'admin123'
    ) {
      return next();
    }

    return res.status(403).json({
      error: 'Acesso negado: Somente administradores autenticados podem realizar esta ação.',
    });
  }

  // Dashboard Metrics & Statistics
  app.get('/api/admin/dashboard-stats', requireAdmin, (req: Request, res: Response) => {
    const totalCategories = db.portfolioCategories.length;
    const activeCategories = db.portfolioCategories.filter((c) => c.active).length;
    const totalPhotos = db.portfolioPhotos.length;
    const activePhotos = db.portfolioPhotos.filter((p) => p.active).length;
    const inactivePhotos = totalPhotos - activePhotos;
    const totalClients = db.clients.length;
    const totalGalleries = db.galleries.length;
    const totalSelections = db.selections.length;
    const pendingSelections = db.selections.filter((s) => s.status === 'Nova').length;
    const totalEvents = db.events.length;

    res.json({
      totalCategories,
      activeCategories,
      totalPhotos,
      activePhotos,
      inactivePhotos,
      totalClients,
      totalGalleries,
      totalSelections,
      pendingSelections,
      totalEvents,
    });
  });

  // ==========================================
  // CATEGORIES MANAGEMENT API
  // ==========================================

  // Get Categories (Public: active only, Admin: all with includeInactive=true)
  app.get('/api/portfolio/categories', (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';

    let categories = includeInactive
      ? [...db.portfolioCategories]
      : db.portfolioCategories.filter((c) => c.active);

    // Sort by order ascending
    categories.sort((a, b) => a.order - b.order);

    // Attach real-time photoCount for each category
    const categoriesWithCount = categories.map((cat) => {
      const count = db.portfolioPhotos.filter(
        (p) => p.categoryId === cat.id && (includeInactive || p.active)
      ).length;
      return {
        ...cat,
        photoCount: count,
      };
    });

    res.json(categoriesWithCount);
  });

  // Create Category (Admin Only)
  app.post('/api/admin/portfolio/categories', requireAdmin, (req: Request, res: Response) => {
    const { name, description, active, order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }

    const trimmedName = name.trim();
    const existing = db.portfolioCategories.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome.' });
    }

    const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
    const newCategory: PortfolioCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      slug: toSlug(trimmedName),
      order: typeof order === 'number' ? order : maxOrder + 1,
      active: active !== false,
      description: description ? description.trim() : '',
      createdAt: new Date().toISOString(),
    };

    db.portfolioCategories.push(newCategory);
    saveDatabase();

    res.status(201).json(newCategory);
  });

  // Update Category (Admin Only) - Cascades rename to all associated photos
  app.put('/api/admin/portfolio/categories/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const catIndex = db.portfolioCategories.findIndex((c) => c.id === id);
    if (catIndex === -1) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    const currentCat = db.portfolioCategories[catIndex];
    const { name, description, active, order } = req.body;

    let newName = currentCat.name;
    let newSlug = currentCat.slug;

    if (name && name.trim()) {
      const trimmedName = name.trim();
      // Check if duplicate with another category
      const duplicate = db.portfolioCategories.find(
        (c) => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({ error: 'Já existe outra categoria com este nome.' });
      }
      newName = trimmedName;
      newSlug = toSlug(trimmedName);

      // Cascade update to all photos belonging to this category
      db.portfolioPhotos.forEach((photo) => {
        if (photo.categoryId === id) {
          photo.categoryName = newName;
        }
      });
    }

    db.portfolioCategories[catIndex] = {
      ...currentCat,
      name: newName,
      slug: newSlug,
      description: description !== undefined ? (description || '').trim() : currentCat.description,
      active: active !== undefined ? Boolean(active) : currentCat.active,
      order: typeof order === 'number' ? order : currentCat.order,
    };

    syncPortfolioLegacy();
    saveDatabase();

    res.json(db.portfolioCategories[catIndex]);
  });

  // Delete Category (Admin Only)
  app.delete('/api/admin/portfolio/categories/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const cat = db.portfolioCategories.find((c) => c.id === id);
    if (!cat) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    // Delete photos belonging to this category and clean physical files
    const photosToDelete = db.portfolioPhotos.filter((p) => p.categoryId === id);
    photosToDelete.forEach((photo) => {
      if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
        try {
          const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
          const physicalPath = path.join(PORTFOLIO_DIR, decoded);
          if (fs.existsSync(physicalPath)) {
            fs.unlinkSync(physicalPath);
          }
        } catch (err) {
          console.error('Error removing photo file during category deletion:', err);
        }
      }
    });

    db.portfolioPhotos = db.portfolioPhotos.filter((p) => p.categoryId !== id);
    db.portfolioCategories = db.portfolioCategories.filter((c) => c.id !== id);

    syncPortfolioLegacy();
    saveDatabase();

    res.json({
      success: true,
      message: `Categoria "${cat.name}" e suas ${photosToDelete.length} fotos foram excluídas com sucesso.`,
    });
  });

  // Reorder Categories (Admin Only)
  app.post('/api/admin/portfolio/categories/reorder', requireAdmin, (req: Request, res: Response) => {
    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ error: 'categoryIds deve ser uma lista de IDs.' });
    }

    categoryIds.forEach((catId, index) => {
      const cat = db.portfolioCategories.find((c) => c.id === catId);
      if (cat) {
        cat.order = index + 1;
      }
    });

    db.portfolioCategories.sort((a, b) => a.order - b.order);
    saveDatabase();

    res.json({ success: true, categories: db.portfolioCategories });
  });

  // ==========================================
  // PHOTOS MANAGEMENT API
  // ==========================================

  // Helper to calculate next sequential photo number for a category
  function getNextCategoryPhotoNumber(catId: string): string {
    const photosInCat = db.portfolioPhotos.filter((p) => p.categoryId === catId);
    let maxNum = 0;
    photosInCat.forEach((p) => {
      const n = parseInt(p.number, 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    });
    return formatPhotoNumber(maxNum + 1);
  }

  // Public & General Portfolio API (Only active photos from active categories)
  app.get('/api/portfolio', (req: Request, res: Response) => {
    const { category, categoryId } = req.query;

    // Get active category IDs
    const activeCategoryIds = new Set(
      db.portfolioCategories.filter((c) => c.active).map((c) => c.id)
    );

    let photos = db.portfolioPhotos.filter(
      (p) => p.active && activeCategoryIds.has(p.categoryId)
    );

    if (categoryId && categoryId !== 'Todos') {
      photos = photos.filter((p) => p.categoryId === categoryId);
    } else if (category && category !== 'Todos') {
      const catLower = String(category).toLowerCase();
      photos = photos.filter(
        (p) =>
          p.categoryName.toLowerCase() === catLower ||
          toSlug(p.categoryName) === catLower
      );
    }

    // Sort by category order, then photo order
    const categoryOrderMap = new Map<string, number>();
    db.portfolioCategories.forEach((c) => categoryOrderMap.set(c.id, c.order));

    photos.sort((a, b) => {
      const orderCatA = categoryOrderMap.get(a.categoryId) || 999;
      const orderCatB = categoryOrderMap.get(b.categoryId) || 999;
      if (orderCatA !== orderCatB) return orderCatA - orderCatB;
      return (a.order || 0) - (b.order || 0);
    });

    res.json(photos);
  });

  // Admin Get All Portfolio Photos (Admin Only - with filters & search)
  app.get('/api/admin/portfolio/photos', requireAdmin, (req: Request, res: Response) => {
    const { categoryId, status, search } = req.query;

    let photos = [...db.portfolioPhotos];

    if (categoryId && categoryId !== 'Todos') {
      photos = photos.filter((p) => p.categoryId === categoryId);
    }

    if (status === 'active') {
      photos = photos.filter((p) => p.active);
    } else if (status === 'inactive') {
      photos = photos.filter((p) => !p.active);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      photos = photos.filter(
        (p) =>
          p.number.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    // Sort by category order, then photo order
    const categoryOrderMap = new Map<string, number>();
    db.portfolioCategories.forEach((c) => categoryOrderMap.set(c.id, c.order));

    photos.sort((a, b) => {
      const orderCatA = categoryOrderMap.get(a.categoryId) || 999;
      const orderCatB = categoryOrderMap.get(b.categoryId) || 999;
      if (orderCatA !== orderCatB) return orderCatA - orderCatB;
      return (a.order || 0) - (b.order || 0);
    });

    res.json(photos);
  });

  // Multi-Photo Upload to Portfolio (Admin Only)
  // Preserves original photo quality, saves directly to disk, assigns automatic visual numbers (001, 002...)
  app.post(
    '/api/admin/portfolio/photos/upload',
    requireAdmin,
    upload.array('files', 100),
    (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhuma fotografia enviada.' });
      }

      const categoryIdentifier = req.body.categoryId || req.body.category;
      if (!categoryIdentifier) {
        return res.status(400).json({ error: 'Selecione uma categoria para as fotos.' });
      }

      // Find category by ID or Name
      let category = db.portfolioCategories.find(
        (c) =>
          c.id === categoryIdentifier ||
          c.name.toLowerCase() === String(categoryIdentifier).toLowerCase()
      );

      // Auto-create category if missing
      if (!category) {
        const catName = String(categoryIdentifier).trim();
        const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
        category = {
          id: `cat-${toSlug(catName)}-${Date.now().toString(36)}`,
          name: catName,
          slug: toSlug(catName),
          order: maxOrder + 1,
          active: true,
          createdAt: new Date().toISOString(),
        };
        db.portfolioCategories.push(category);
      }

      const safeCategoryFolder = category.name.replace(/[/\\?%*:|"<>]/g, '-').trim();
      const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Calculate base sequential number and order
      const photosInCat = db.portfolioPhotos.filter((p) => p.categoryId === category.id);
      let highestNum = 0;
      let highestOrder = 0;
      photosInCat.forEach((p) => {
        const n = parseInt(p.number, 10);
        if (!isNaN(n) && n > highestNum) highestNum = n;
        if ((p.order || 0) > highestOrder) highestOrder = p.order;
      });

      const uploadedPhotos: PortfolioPhoto[] = [];
      const userDesc = (req.body.description || '').trim();

      files.forEach((file, idx) => {
        const rawFileName = path.basename(file.originalname);
        const safeFileName = `${Date.now()}_${idx}_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
        const targetFilePath = path.join(targetDir, safeFileName);

        // Write original image bytes with zero compression/filters
        fs.writeFileSync(targetFilePath, file.buffer);

        const currentSeq = highestNum + idx + 1;
        const formattedNumber = formatPhotoNumber(currentSeq);
        const itemTitle = cleanTitle(rawFileName) || `${category.name} ${formattedNumber}`;
        const imageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;

        const newPhoto: PortfolioPhoto = {
          id: `port-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          categoryId: category.id,
          categoryName: category.name,
          number: formattedNumber,
          order: highestOrder + idx + 1,
          imageUrl,
          title: itemTitle,
          description: userDesc || `${category.name} — Fotografia original Rocha Foto & Vídeo`,
          aspect: 'portrait',
          active: true,
          featured: false,
          createdAt: new Date().toISOString(),
        };

        uploadedPhotos.push(newPhoto);
        db.portfolioPhotos.push(newPhoto);
      });

      syncPortfolioLegacy();
      saveDatabase();

      res.status(201).json({
        success: true,
        count: uploadedPhotos.length,
        photos: uploadedPhotos,
        category: category.name,
      });
    }
  );

  // Update Portfolio Photo (Admin Only) - can change category, description, order, status, number
  app.put('/api/admin/portfolio/photos/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const photoIndex = db.portfolioPhotos.findIndex((p) => p.id === id);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Fotografia não encontrada.' });
    }

    const currentPhoto = db.portfolioPhotos[photoIndex];
    const { categoryId, title, description, order, active, featured, number } = req.body;

    let targetCatId = currentPhoto.categoryId;
    let targetCatName = currentPhoto.categoryName;

    if (categoryId && categoryId !== currentPhoto.categoryId) {
      const cat = db.portfolioCategories.find((c) => c.id === categoryId);
      if (cat) {
        targetCatId = cat.id;
        targetCatName = cat.name;
      }
    }

    db.portfolioPhotos[photoIndex] = {
      ...currentPhoto,
      categoryId: targetCatId,
      categoryName: targetCatName,
      title: title !== undefined ? title.trim() : currentPhoto.title,
      description: description !== undefined ? description.trim() : currentPhoto.description,
      number: number !== undefined && number.trim() ? number.trim() : currentPhoto.number,
      order: typeof order === 'number' ? order : currentPhoto.order,
      active: active !== undefined ? Boolean(active) : currentPhoto.active,
      featured: featured !== undefined ? Boolean(featured) : currentPhoto.featured,
    };

    syncPortfolioLegacy();
    saveDatabase();

    res.json(db.portfolioPhotos[photoIndex]);
  });

  // Replace Single Photo File (Admin Only) - Preserves ID, category, sequential number, order
  app.post(
    '/api/admin/portfolio/photos/:id/replace',
    requireAdmin,
    upload.single('file'),
    (req: Request, res: Response) => {
      const { id } = req.params;
      const photoIndex = db.portfolioPhotos.findIndex((p) => p.id === id);
      if (photoIndex === -1) {
        return res.status(404).json({ error: 'Fotografia não encontrada.' });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Nenhum novo arquivo enviado.' });
      }

      const photo = db.portfolioPhotos[photoIndex];
      const category = db.portfolioCategories.find((c) => c.id === photo.categoryId);
      const safeCategoryFolder = (category ? category.name : photo.categoryName)
        .replace(/[/\\?%*:|"<>]/g, '-')
        .trim();
      const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Unlink previous file if physical
      if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
        try {
          const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
          const oldPath = path.join(PORTFOLIO_DIR, decoded);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {
          console.error('Error removing replaced file:', e);
        }
      }

      const rawFileName = path.basename(req.file.originalname);
      const safeFileName = `${Date.now()}_replaced_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const targetFilePath = path.join(targetDir, safeFileName);
      fs.writeFileSync(targetFilePath, req.file.buffer);

      const newImageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;
      photo.imageUrl = newImageUrl;

      syncPortfolioLegacy();
      saveDatabase();

      res.json({
        success: true,
        photo,
        message: 'Fotografia substituída com sucesso mantendo numeração e dados.',
      });
    }
  );

  // Delete Single Portfolio Photo (Admin Only)
  app.delete('/api/admin/portfolio/photos/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const photo = db.portfolioPhotos.find((p) => p.id === id);
    if (!photo) {
      return res.status(404).json({ error: 'Fotografia não encontrada.' });
    }

    // Delete physical file from disk
    if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
      try {
        const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
        const physicalPath = path.join(PORTFOLIO_DIR, decoded);
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
        }
      } catch (err) {
        console.error('Error removing physical photo file:', err);
      }
    }

    db.portfolioPhotos = db.portfolioPhotos.filter((p) => p.id !== id);
    syncPortfolioLegacy();
    saveDatabase();

    res.json({ success: true, message: 'Foto excluída do portfólio.' });
  });

  // Reorder Photos (Admin Only)
  app.post('/api/admin/portfolio/photos/reorder', requireAdmin, (req: Request, res: Response) => {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds deve ser uma lista de IDs.' });
    }

    photoIds.forEach((photoId, index) => {
      const photo = db.portfolioPhotos.find((p) => p.id === photoId);
      if (photo) {
        photo.order = index + 1;
      }
    });

    syncPortfolioLegacy();
    saveDatabase();

    res.json({ success: true });
  });

  // Renumber Photos Sequentially (Admin Only)
  // Ensures 001, 002, 003... across a category or entire portfolio
  app.post('/api/admin/portfolio/photos/renumber', requireAdmin, (req: Request, res: Response) => {
    const { categoryId } = req.body;

    const targetPhotos = categoryId
      ? db.portfolioPhotos.filter((p) => p.categoryId === categoryId)
      : db.portfolioPhotos;

    // Sort by current order
    targetPhotos.sort((a, b) => (a.order || 0) - (b.order || 0));

    targetPhotos.forEach((photo, idx) => {
      photo.number = formatPhotoNumber(idx + 1);
      photo.order = idx + 1;
    });

    syncPortfolioLegacy();
    saveDatabase();

    res.json({
      success: true,
      count: targetPhotos.length,
      message: `${targetPhotos.length} fotografias renumeradas sequencialmente com sucesso!`,
    });
  });

  // Portfolio Summary & Stats
  app.get('/api/portfolio/summary', (req: Request, res: Response) => {
    const summary: Record<string, number> = {};
    db.portfolioPhotos.forEach((p) => {
      summary[p.categoryName] = (summary[p.categoryName] || 0) + 1;
    });
    res.json({
      total: db.portfolioPhotos.length,
      categories: summary,
      isUsingRealPhotos: db.portfolioPhotos.some((p) => p.imageUrl.startsWith('/portfolio/')),
    });
  });

  // Import Real Portfolio ZIP file (Admin Only)
  app.post(
    '/api/portfolio/import-zip',
    requireAdmin,
    upload.single('file'),
    (req: Request, res: Response) => {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Nenhum arquivo ZIP enviado.' });
      }

      const replaceDemo = req.query.replaceDemo !== 'false';
      try {
        const result = extractAndProcessZip(req.file.buffer, replaceDemo);
        res.json({
          success: true,
          message: `${result.count} fotografias reais foram importadas e organizadas por categoria com sucesso!`,
          count: result.count,
          categories: result.categories,
          totalInPortfolio: db.portfolioPhotos.length,
        });
      } catch (err: any) {
        console.error('Error unzipping portfolio package:', err);
        res.status(500).json({ error: 'Falha ao processar arquivo ZIP: ' + (err.message || err) });
      }
    }
  );

  // Import files from Folder or Multiple selection (Admin Only)
  app.post(
    '/api/portfolio/import-files',
    requireAdmin,
    upload.array('files', 500),
    (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const defaultCategory = (req.body.category as string) || 'Geral';
      const replaceDemo = req.body.replaceDemo === 'true';
      const paths = Array.isArray(req.body.paths)
        ? req.body.paths
        : typeof req.body.paths === 'string'
        ? [req.body.paths]
        : [];

      const newPhotos: PortfolioPhoto[] = [];
      const categoryStats: Record<string, number> = {};

      files.forEach((file, index) => {
        const relPath = paths[index] || file.originalname;
        const parts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);

        let rawCat = defaultCategory;
        if (parts.length > 1) {
          rawCat = parts[parts.length - 2];
        }

        const categoryName = normalizePortfolioCategory(rawCat);
        // Find or create category
        let category = db.portfolioCategories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (!category) {
          const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
          category = {
            id: `cat-${toSlug(categoryName)}-${Date.now().toString(36)}`,
            name: categoryName,
            slug: toSlug(categoryName),
            order: maxOrder + 1,
            active: true,
            createdAt: new Date().toISOString(),
          };
          db.portfolioCategories.push(category);
        }

        const safeCategoryFolder = category.name.replace(/[/\\?%*:|"<>]/g, '-').trim();
        const targetDir = path.join(PORTFOLIO_DIR, safeCategoryFolder);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const rawFileName = path.basename(file.originalname);
        const safeFileName = `${Date.now()}_${index}_${rawFileName.replace(/[/\\?%*:|"<>]/g, '_')}`;
        const targetFilePath = path.join(targetDir, safeFileName);

        fs.writeFileSync(targetFilePath, file.buffer);

        categoryStats[categoryName] = (categoryStats[categoryName] || 0) + 1;
        const seqNumber = formatPhotoNumber(categoryStats[categoryName]);
        const itemTitle = cleanTitle(rawFileName) || `${categoryName} ${seqNumber}`;
        const imageUrl = `/portfolio/${encodeURIComponent(safeCategoryFolder)}/${encodeURIComponent(safeFileName)}`;

        const newPhoto: PortfolioPhoto = {
          id: `port-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          categoryId: category.id,
          categoryName: category.name,
          number: seqNumber,
          order: index + 1,
          imageUrl,
          title: itemTitle,
          description: `${categoryName} — Fotografia original Rocha Foto & Vídeo`,
          aspect: 'portrait',
          active: true,
          featured: categoryStats[categoryName] <= 2,
          createdAt: new Date().toISOString(),
        };

        newPhotos.push(newPhoto);
      });

      if (replaceDemo) {
        db.portfolioPhotos = [...newPhotos];
      } else {
        db.portfolioPhotos = [...newPhotos, ...db.portfolioPhotos];
      }

      syncPortfolioLegacy();
      saveDatabase();

      res.json({
        success: true,
        count: newPhotos.length,
        categories: categoryStats,
        totalInPortfolio: db.portfolioPhotos.length,
      });
    }
  );

  // Trigger local server-side scan for ZIP files or photos (Admin Only)
  app.post('/api/portfolio/scan-local', requireAdmin, (req: Request, res: Response) => {
    const replaceDemo = req.body.replaceDemo === true;
    const result = scanLocalPortfolioFiles(replaceDemo);
    res.json({
      success: true,
      count: result.count,
      message: result.message,
      totalInPortfolio: db.portfolioPhotos.length,
    });
  });

  // Legacy single item CRUD (secured with requireAdmin)
  app.post('/api/portfolio', requireAdmin, (req: Request, res: Response) => {
    const { title, category, categoryId, imageUrl, aspect, caption, description, featured } = req.body;
    if (!category && !categoryId) {
      return res.status(400).json({ error: 'Categoria é obrigatória.' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'Imagem é obrigatória.' });
    }

    let cat = db.portfolioCategories.find(
      (c) => c.id === categoryId || c.name.toLowerCase() === String(category).toLowerCase()
    );
    if (!cat) {
      const catName = (category || 'Geral').trim();
      const maxOrder = db.portfolioCategories.reduce((max, c) => Math.max(max, c.order || 0), 0);
      cat = {
        id: `cat-${toSlug(catName)}`,
        name: catName,
        slug: toSlug(catName),
        order: maxOrder + 1,
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.portfolioCategories.push(cat);
    }

    const nextNum = getNextCategoryPhotoNumber(cat.id);
    const newPhoto: PortfolioPhoto = {
      id: `port-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      categoryId: cat.id,
      categoryName: cat.name,
      number: nextNum,
      order: db.portfolioPhotos.length + 1,
      imageUrl,
      title: title || `${cat.name} ${nextNum}`,
      description: description || caption || '',
      aspect: aspect || 'portrait',
      active: true,
      featured: Boolean(featured),
      createdAt: new Date().toISOString(),
    };

    db.portfolioPhotos.unshift(newPhoto);
    syncPortfolioLegacy();
    saveDatabase();

    res.status(201).json(newPhoto);
  });

  app.put('/api/portfolio/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const photo = db.portfolioPhotos.find((p) => p.id === id);
    if (!photo) {
      return res.status(404).json({ error: 'Foto do portfólio não encontrada' });
    }
    Object.assign(photo, req.body);
    syncPortfolioLegacy();
    saveDatabase();
    res.json(photo);
  });

  app.delete('/api/portfolio/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const photo = db.portfolioPhotos.find((p) => p.id === id);
    if (!photo) {
      return res.status(404).json({ error: 'Foto do portfólio não encontrada' });
    }
    if (photo.imageUrl && photo.imageUrl.startsWith('/portfolio/')) {
      try {
        const decoded = decodeURIComponent(photo.imageUrl.replace(/^\/portfolio\//, ''));
        const physicalPath = path.join(PORTFOLIO_DIR, decoded);
        if (fs.existsSync(physicalPath)) fs.unlinkSync(physicalPath);
      } catch (err) {
        console.error('Error removing physical photo file:', err);
      }
    }
    db.portfolioPhotos = db.portfolioPhotos.filter((p) => p.id !== id);
    syncPortfolioLegacy();
    saveDatabase();
    res.json({ success: true });
  });

  // Reset to initial seed portfolio (Admin Only)
  app.post('/api/portfolio/reset-demo', requireAdmin, (req: Request, res: Response) => {
    db.portfolioCategories = [...INITIAL_PORTFOLIO_CATEGORIES];
    db.portfolioPhotos = [...INITIAL_PORTFOLIO_PHOTOS];
    syncPortfolioLegacy();
    saveDatabase();
    res.json({ success: true, count: db.portfolioPhotos.length });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rocha Foto & Vídeo server running on http://localhost:${PORT}`);
  });
}

startServer();
