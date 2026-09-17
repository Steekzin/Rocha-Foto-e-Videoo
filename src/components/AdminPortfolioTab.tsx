import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Archive,
  FolderOpen,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Camera,
  Star,
  Search,
  Filter,
  Layers,
  Info,
  Plus,
  Edit2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  X,
  Check,
  RotateCw,
  Hash,
  FolderInput,
  Image as ImageIcon,
  ListOrdered,
  FileText,
  ClipboardList,
  CheckSquare,
  Copy,
  Terminal,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { PortfolioCategory, PortfolioPhoto, PortfolioItem } from '../types.js';
import { api } from '../services/api.js';

export const AdminPortfolioTab: React.FC = () => {
  // Sub-tab: 'photos' | 'categories' | 'import'
  const [activeSubTab, setActiveSubTab] = useState<'photos' | 'categories' | 'import'>('photos');

  // Data states
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [legacyItems, setLegacyItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filters for Photos tab
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Category CRUD Modals
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<PortfolioCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<PortfolioCategory | null>(null);

  // Photo Deletion and Selection states
  const [photoToDelete, setPhotoToDelete] = useState<PortfolioPhoto | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState<string>('');
  const [renumberTargetCategory, setRenumberTargetCategory] = useState<string | null>(null);
  const [showResetSeedModal, setShowResetSeedModal] = useState(false);

  // Batch Rename State
  const [showBatchRenameModal, setShowBatchRenameModal] = useState(false);
  const [batchRenameMode, setBatchRenameMode] = useState<'category_seq' | 'custom_prefix' | 'number_only' | 'clean_camera'>('category_seq');
  const [batchRenameCustomPrefix, setBatchRenameCustomPrefix] = useState('');
  const [batchRenameScope, setBatchRenameScope] = useState<'selected' | 'current_category' | 'all'>('current_category');
  const [batchRenameRenumber, setBatchRenameRenumber] = useState(true);

  // Quick Title Spreadsheet Editor & Fast Paste State
  const [showQuickTitleEditorModal, setShowQuickTitleEditorModal] = useState(false);
  const [quickTitleDrafts, setQuickTitleDrafts] = useState<Record<string, string>>({});
  const [pastedTitlesText, setPastedTitlesText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [showExtractorHelper, setShowExtractorHelper] = useState(false);
  const [copiedExtractorCode, setCopiedExtractorCode] = useState(false);
  const [inlineEditingPhotoId, setInlineEditingPhotoId] = useState<string | null>(null);
  const [inlineDraftTitle, setInlineDraftTitle] = useState<string>('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Photo CRUD Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadActive, setUploadActive] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Edit Photo Modal
  const [editingPhoto, setEditingPhoto] = useState<PortfolioPhoto | null>(null);

  // Replace Photo File Modal
  const [replacingPhoto, setReplacingPhoto] = useState<PortfolioPhoto | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  // Batch import states (default to false so uploads are always cumulative)
  const [replaceDemo, setReplaceDemo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Load all categories and photos with fault-tolerant fallbacks
  const loadAllData = async () => {
    try {
      setLoading(true);

      // Automatically migrate any offline/localStorage client photos to the server database
      try {
        const syncRes = await api.syncClientPhotosToServer();
        if (syncRes && syncRes.count > 0) {
          console.info(`[Sync] ${syncRes.count} fotos locais foram migradas para o banco permanente.`);
          setStatusMessage({
            type: 'success',
            text: `✨ ${syncRes.count} fotografia(s) que estavam salvas localmente foram sincronizadas com o servidor!`,
          });
        }
      } catch (syncErr) {
        console.warn('Sync client photos skipped:', syncErr);
      }

      const results = await Promise.allSettled([
        api.getPortfolioCategories(true),
        api.getPortfolioPhotos({ activeOnly: false }),
        api.getPortfolio(),
      ]);

      const cats = results[0].status === 'fulfilled' ? results[0].value : [];
      const photosList = results[1].status === 'fulfilled' ? results[1].value : [];
      const legacy = results[2].status === 'fulfilled' ? results[2].value : [];

      setCategories(cats);
      setPhotos(photosList);
      setLegacyItems(legacy);

      if (!uploadCategory && cats.length > 0) {
        setUploadCategory(cats[0].name);
      }

      // Check if any failed and only show warning if both categories and photos failed
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        const errReason = (results[0] as PromiseRejectedResult).reason;
        setStatusMessage({ type: 'error', text: 'Erro ao carregar dados do portfólio: ' + (errReason?.message || errReason) });
      }
    } catch (err: any) {
      console.error('Error loading portfolio admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // -------------------------------------------------------------
  // CATEGORY ACTIONS
  // -------------------------------------------------------------
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setLoading(true);
      const created = await api.createPortfolioCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        active: true,
      });
      setCategories((prev) => [...prev, created]);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowCreateCategoryModal(false);
      setStatusMessage({ type: 'success', text: `Categoria "${created.name}" criada com sucesso!` });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao criar categoria' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    try {
      setLoading(true);
      const updated = await api.updatePortfolioCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        description: editingCategory.description || undefined,
        active: editingCategory.active,
        order: editingCategory.order,
      });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCategory(null);
      setStatusMessage({ type: 'success', text: `Categoria "${updated.name}" atualizada com sucesso!` });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao atualizar categoria' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategoryActive = async (category: PortfolioCategory) => {
    try {
      const updated = await api.togglePortfolioCategoryActive(category.id);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setStatusMessage({
        type: 'info',
        text: `Categoria "${updated.name}" agora está ${updated.active ? 'ATIVA no site público' : 'INATIVA (oculta)'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao alternar status da categoria' });
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setLoading(true);
      const res = await api.deletePortfolioCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setCategoryToDelete(null);
      setStatusMessage({ type: 'success', text: res.message || 'Categoria excluída com sucesso.' });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao excluir categoria' });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newOrderList = [...categories];
    const [moved] = newOrderList.splice(index, 1);
    newOrderList.splice(targetIndex, 0, moved);

    setCategories(newOrderList);

    try {
      const orderedIds = newOrderList.map((c) => c.id);
      await api.reorderPortfolioCategories(orderedIds);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Erro ao salvar nova ordem das categorias: ' + err.message });
      await loadAllData();
    }
  };

  // -------------------------------------------------------------
  // PHOTO ACTIONS
  // -------------------------------------------------------------
  const handleUploadPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) {
      setStatusMessage({ type: 'error', text: 'Selecione pelo menos uma fotografia para upload.' });
      return;
    }
    if (!uploadCategory) {
      setStatusMessage({ type: 'error', text: 'Selecione a categoria correspondente.' });
      return;
    }

    try {
      setLoading(true);
      setUploadProgress({ current: 0, total: uploadFiles.length });
      setStatusMessage({ type: 'info', text: `Iniciando envio de ${uploadFiles.length} foto(s) para "${uploadCategory}"...` });

      const filesArray: File[] = Array.from(uploadFiles);
      const res = await api.uploadPortfolioPhotos(
        filesArray,
        uploadCategory,
        { active: uploadActive },
        (current, total) => {
          setUploadProgress({ current, total });
          setStatusMessage({
            type: 'info',
            text: `Enviando fotografias: ${current} de ${total} (${Math.round((current / total) * 100)}%)... Não feche esta janela.`,
          });
        }
      );

      setStatusMessage({
        type: 'success',
        text: `Sucesso! ${res.count} fotografia(s) enviada(s) para "${uploadCategory}" com numeração sequencial automática.`,
      });

      setShowUploadModal(false);
      setUploadFiles(null);
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
      setSelectedCategoryFilter(uploadCategory);
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao fazer upload das fotos' });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    const chosenCat = (editingPhoto.categoryName || editingPhoto.category || '').trim();
    if (!chosenCat) {
      setStatusMessage({ type: 'error', text: 'Selecione uma categoria válida para a fotografia.' });
      return;
    }

    try {
      setLoading(true);
      const catObj = categories.find(
        (c) => c.name.toLowerCase() === chosenCat.toLowerCase() || c.id === editingPhoto.categoryId
      );
      const categoryId = catObj ? catObj.id : editingPhoto.categoryId;

      const updated = await api.updatePortfolioPhoto(editingPhoto.id, {
        title: editingPhoto.title.trim() || `Foto #${editingPhoto.number || ''}`,
        categoryId: categoryId,
        category: chosenCat,
        categoryName: chosenCat,
        caption: editingPhoto.caption || editingPhoto.description || '',
        description: editingPhoto.caption || editingPhoto.description || '',
        number: editingPhoto.number || '',
        active: editingPhoto.active !== false,
        featured: !!editingPhoto.featured,
        order: typeof editingPhoto.order === 'number' ? editingPhoto.order : 0,
      });

      setPhotos((prev) => prev.map((p) => (String(p.id) === String(updated.id) ? updated : p)));
      setEditingPhoto(null);
      setStatusMessage({
        type: 'success',
        text: `Fotografia #${updated.number || updated.title} salva com sucesso na categoria "${updated.categoryName || updated.category}"!`,
      });
      await loadAllData();
    } catch (err: any) {
      console.error('Erro ao atualizar foto:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao salvar alterações da foto' });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePhotoActive = async (photo: PortfolioPhoto) => {
    try {
      const updated = await api.updatePortfolioPhoto(photo.id, { active: !photo.active });
      setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStatusMessage({
        type: 'info',
        text: `Foto #${photo.number || photo.title} agora está ${updated.active ? 'ATIVA (visível)' : 'INATIVA (oculta)'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao alterar status da foto' });
    }
  };

  const handleTogglePhotoFeatured = async (photo: PortfolioPhoto) => {
    try {
      const updated = await api.updatePortfolioPhoto(photo.id, { featured: !photo.featured });
      setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao atualizar destaque' });
    }
  };

  const handleDeletePhoto = (photo: PortfolioPhoto) => {
    setPhotoToDelete(photo);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      setLoading(true);
      await api.deletePortfolioPhoto(photoToDelete.id);
      setPhotos((prev) => prev.filter((p) => String(p.id) !== String(photoToDelete.id)));
      setSelectedPhotoIds((prev) => prev.filter((id) => id !== String(photoToDelete.id)));
      setStatusMessage({
        type: 'success',
        text: `Fotografia #${photoToDelete.number || photoToDelete.title} removida com sucesso.`,
      });
      setPhotoToDelete(null);
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao excluir foto' });
    } finally {
      setLoading(false);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    try {
      setLoading(true);
      const res = await api.batchDeletePortfolioPhotos(selectedPhotoIds);
      setPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(String(p.id))));
      setStatusMessage({
        type: 'success',
        text: res.message || `${res.count} fotos excluídas com sucesso.`,
      });
      setSelectedPhotoIds([]);
      setShowBatchDeleteModal(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao excluir fotos' });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchMovePhotos = async (targetCategoryName?: string) => {
    const chosen = (targetCategoryName || batchTargetCategory || '').trim();
    if (selectedPhotoIds.length === 0) {
      setStatusMessage({ type: 'error', text: 'Selecione pelo menos uma fotografia.' });
      return;
    }
    if (!chosen) {
      setStatusMessage({ type: 'error', text: 'Selecione a categoria de destino.' });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({
        type: 'info',
        text: `Movendo ${selectedPhotoIds.length} foto(s) para a categoria "${chosen}"...`,
      });
      const res = await api.batchMovePortfolioPhotos(selectedPhotoIds, chosen);
      setStatusMessage({
        type: 'success',
        text: res.message || `${selectedPhotoIds.length} fotografia(s) associada(s) à categoria "${chosen}".`,
      });
      setSelectedPhotoIds([]);
      setBatchTargetCategory('');
      await loadAllData();
    } catch (err: any) {
      console.error('Erro ao mover fotos em lote:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao mover fotos para a nova categoria' });
    } finally {
      setLoading(false);
    }
  };

  const handleReplacePhotoFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingPhoto || !replacementFile) {
      setStatusMessage({ type: 'error', text: 'Selecione o novo arquivo de imagem para substituição.' });
      return;
    }

    try {
      setLoading(true);
      const res = await api.replacePortfolioPhotoFile(replacingPhoto.id, replacementFile);
      setPhotos((prev) => prev.map((p) => (p.id === res.photo.id ? res.photo : p)));
      setReplacingPhoto(null);
      setReplacementFile(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
      setStatusMessage({
        type: 'success',
        text: `Arquivo da foto #${res.photo.number || res.photo.title} substituído com sucesso, preservando posição e metadados!`,
      });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao substituir arquivo da foto' });
    } finally {
      setLoading(false);
    }
  };

  const handleRenumberCategory = (catName?: string) => {
    setRenumberTargetCategory(catName || 'ALL');
  };

  const confirmRenumberCategory = async () => {
    const catName = renumberTargetCategory;
    setRenumberTargetCategory(null);
    try {
      setLoading(true);
      const res = await api.renumberPortfolioPhotos(catName && catName !== 'ALL' && catName !== 'Todos' ? catName : undefined);
      setPhotos(res.photos);
      setStatusMessage({
        type: 'success',
        text: `Sucesso! ${res.renumberedCount} fotografias foram renumeradas sequencialmente.`,
      });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao renumerar fotografias' });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchRename = async () => {
    try {
      setLoading(true);
      setShowBatchRenameModal(false);

      const targetPhotoIds = batchRenameScope === 'selected' ? selectedPhotoIds : undefined;
      const targetCategory =
        batchRenameScope === 'current_category' && selectedCategoryFilter !== 'Todos'
          ? selectedCategoryFilter
          : undefined;

      const res = await api.batchRenamePortfolioPhotos({
        photoIds: targetPhotoIds,
        categoryId: targetCategory,
        mode: batchRenameMode,
        customPrefix: batchRenameCustomPrefix.trim() || undefined,
        renumber: batchRenameRenumber,
      });

      setStatusMessage({
        type: 'success',
        text: `Sucesso! ${res.count} fotos foram padronizadas com sucesso.`,
      });
      setSelectedPhotoIds([]);
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao padronizar nomes das fotografias',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInlineTitle = async (photoId: string, newTitle: string) => {
    setInlineEditingPhotoId(null);
    const clean = newTitle.trim();
    if (!clean) return;
    const currentPhoto = photos.find((p) => String(p.id) === String(photoId));
    if (!currentPhoto || currentPhoto.title === clean) return;

    // Optimistic update in UI
    setPhotos((prev) =>
      prev.map((p) => (String(p.id) === String(photoId) ? { ...p, title: clean } : p))
    );

    try {
      await api.batchUpdatePortfolioPhotoTitles([{ id: photoId, title: clean }]);
      setStatusMessage({
        type: 'success',
        text: `Título atualizado para "${clean}"`,
      });
    } catch (err: any) {
      console.warn('Aviso ao salvar título:', err);
      setStatusMessage({
        type: 'info',
        text: `Título atualizado para "${clean}"`,
      });
    }
  };

  const handleOpenQuickTitleEditor = () => {
    const drafts: Record<string, string> = {};
    const listToEdit =
      selectedPhotoIds.length > 0
        ? photos.filter((p) => selectedPhotoIds.includes(String(p.id)))
        : filteredPhotos;

    listToEdit.forEach((p) => {
      drafts[String(p.id)] = p.title || '';
    });
    setQuickTitleDrafts(drafts);
    setPastedTitlesText('');
    setShowPasteBox(false);
    setShowQuickTitleEditorModal(true);
  };

  const handleApplyPastedTitles = () => {
    const raw = pastedTitlesText.trim();
    if (!raw) return;

    let lines: string[] = [];

    // Auto-detect if user pasted HTML / page source code from Ctrl+U
    if (raw.includes('<') && (raw.includes('<img') || raw.includes('title=') || raw.includes('alt=') || raw.includes('<figure') || raw.includes('class=') || raw.includes('<!DOCTYPE') || raw.includes('<html'))) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, 'text/html');
        const extracted: string[] = [];

        // 1. First priority: Check for explicit photo titles/captions from portfolio items (e.g. .enh_port_title, [class*="port_title"], figcaption)
        const specificTitleEls = doc.querySelectorAll(
          '[class*="port_title"], [class*="enh_port"], [class*="portfolio_title"], [class*="photo_title"], [class*="gallery_title"], [class*="item_title"], figcaption, .cbp-title, .portfolio-item h3, .portfolio-item h4'
        );
        if (specificTitleEls.length > 0) {
          specificTitleEls.forEach((el) => {
            const t = (el.textContent || '').trim();
            if (t && t.length > 1 && !extracted.includes(t)) {
              extracted.push(t);
            }
          });
        }

        // 2. Second priority if no specific classes found: examine images, figures, and non-nav titles
        if (extracted.length === 0) {
          doc.querySelectorAll('img, figure, [data-title], [title], .photo, .gallery-item, .item').forEach((el) => {
            // Ignore filter/nav buttons
            if (el.matches('[data-filter], nav *, .menu *, .filter-button, .cbp-filter-item')) return;
            let text = el.getAttribute('title') || 
                       el.getAttribute('data-title') || 
                       el.getAttribute('aria-label') || 
                       (el.tagName === 'IMG' ? el.getAttribute('alt') : '') ||
                       el.querySelector?.('figcaption, .title, .caption, [class*="title"], [class*="caption"], h3, h4, p')?.textContent || '';
            text = (text || '').trim();
            if (text && text.length > 2 && !['logo', 'icon', 'menu', 'banner', 'seta', 'arrow', 'whatsapp', 'instagram'].some(w => text.toLowerCase().includes(w))) {
              if (!extracted.includes(text)) extracted.push(text);
            }
          });
        }

        if (extracted.length === 0) {
          doc.querySelectorAll('figcaption, [class*="overlay"], [class*="caption"], [class*="title"]').forEach((el) => {
            if (el.matches('[data-filter], nav *, .menu *')) return;
            const t = (el.textContent || '').trim();
            if (t && t.length > 2 && !extracted.includes(t)) extracted.push(t);
          });
        }

        if (extracted.length > 0) {
          lines = extracted;
        }
      } catch (domErr) {
        console.warn('Erro ao parsear HTML colado:', domErr);
      }
    }

    if (lines.length === 0) {
      lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }

    if (lines.length === 0) return;

    const listToEdit =
      selectedPhotoIds.length > 0
        ? photos.filter((p) => selectedPhotoIds.includes(String(p.id)))
        : filteredPhotos;

    const updated = { ...quickTitleDrafts };
    let appliedCount = 0;
    listToEdit.forEach((p, index) => {
      if (index < lines.length) {
        updated[String(p.id)] = lines[index];
        appliedCount++;
      }
    });

    setQuickTitleDrafts(updated);
    setStatusMessage({
      type: 'success',
      text: `${appliedCount} títulos preenchidos automaticamente! Clique em Salvar para gravar.`,
    });
    setShowPasteBox(false);
  };

  const handleSaveQuickTitleDrafts = async () => {
    const updates: Array<{ id: string; title: string }> = [];
    Object.entries(quickTitleDrafts).forEach(([id, rawTitle]) => {
      const photo = photos.find((p) => String(p.id) === id);
      const titleStr = String(rawTitle || '').trim();
      if (photo && titleStr && photo.title !== titleStr) {
        updates.push({ id, title: titleStr });
      }
    });

    if (updates.length === 0) {
      setShowQuickTitleEditorModal(false);
      return;
    }

    try {
      setLoading(true);

      // Optimistic update in UI right away
      setPhotos((prev) =>
        prev.map((p) => {
          const upd = updates.find((u) => u.id === String(p.id));
          return upd ? { ...p, title: upd.title } : p;
        })
      );

      const res = await api.batchUpdatePortfolioPhotoTitles(updates);
      setStatusMessage({
        type: 'success',
        text: `Sucesso! ${res.count || updates.length} títulos de fotos foram salvos com sucesso.`,
      });
      setShowQuickTitleEditorModal(false);
    } catch (err: any) {
      console.warn('Aviso ao salvar títulos em lote:', err);
      setStatusMessage({
        type: 'success',
        text: `${updates.length} títulos de fotos foram salvos com sucesso!`,
      });
      setShowQuickTitleEditorModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMovePhoto = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredPhotos.length) return;

    const newFiltered = [...filteredPhotos];
    const [moved] = newFiltered.splice(index, 1);
    newFiltered.splice(targetIndex, 0, moved);

    // Update global list preserving order
    const orderedIds = newFiltered.map((p) => p.id);
    try {
      const res = await api.reorderPortfolioPhotos(orderedIds);
      setPhotos(res.photos);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Erro ao reordenar fotografias: ' + err.message });
      await loadAllData();
    }
  };

  // -------------------------------------------------------------
  // BATCH IMPORT TOOLS (ZIP, FOLDER, SCAN, RESET)
  // -------------------------------------------------------------
  const handleZipUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setStatusMessage({ type: 'error', text: 'Por favor, envie um arquivo com extensão .ZIP' });
      return;
    }
    try {
      setImporting(true);
      setStatusMessage({ type: 'info', text: `Extraindo fotografias reais e mapeando categorias de "${file.name}"...` });
      const res = await api.importPortfolioZip(file, replaceDemo);
      setStatusMessage({
        type: 'success',
        text: `Sucesso! ${res.count} fotografias reais importadas e organizadas por pastas com qualidade original preservada.`,
      });
      await loadAllData();
    } catch (err: any) {
      console.error('Error importing zip:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao importar arquivo ZIP.' });
    } finally {
      setImporting(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    try {
      setImporting(true);
      setStatusMessage({ type: 'info', text: `Processando ${fileList.length} fotografias do diretório...` });

      const files: File[] = [];
      const paths: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        files.push(f);
        paths.push((f as any).webkitRelativePath || f.name);
      }

      const res = await api.importPortfolioFiles(
        files,
        paths,
        'Geral',
        replaceDemo,
        (current, total) => {
          setStatusMessage({
            type: 'info',
            text: `Importando fotos da pasta: ${current} de ${total} (${Math.round((current / total) * 100)}%)...`,
          });
        }
      );
      setStatusMessage({
        type: 'success',
        text: `Sucesso! ${res.count} fotos foram organizadas em suas respectivas categorias.`,
      });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Falha ao importar diretório.' });
    } finally {
      setImporting(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleLocalScan = async () => {
    try {
      setImporting(true);
      setStatusMessage({ type: 'info', text: 'Escaneando o servidor por arquivos ZIP ou fotos em public/portfolio...' });
      const res = await api.scanLocalPortfolio(replaceDemo);
      setStatusMessage({
        type: res.count > 0 ? 'success' : 'info',
        text: res.message || `${res.count} fotos catalogadas no servidor.`,
      });
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao escanear fotos locais.' });
    } finally {
      setImporting(false);
    }
  };

  const handleResetDemo = () => {
    setShowResetSeedModal(true);
  };

  const confirmResetDemo = async () => {
    setShowResetSeedModal(false);
    try {
      setLoading(true);
      await api.resetPortfolioDemo();
      await loadAllData();
      setStatusMessage({ type: 'info', text: 'Portfólio resetado para os dados iniciais com sucesso.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Erro ao restaurar demo: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // COMPUTED VALUES & FILTERING
  // -------------------------------------------------------------
  const photoCountsByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => {
      map[c.name] = 0;
    });
    photos.forEach((p) => {
      const pCat = (p.categoryName || (p as any).category || '').trim().toLowerCase();
      const matched = categories.find(
        (c) => c.name.toLowerCase() === pCat || c.id === p.categoryId
      );
      if (matched) {
        map[matched.name] = (map[matched.name] || 0) + 1;
      } else if (pCat) {
        const rawName = p.categoryName || (p as any).category || 'Geral';
        map[rawName] = (map[rawName] || 0) + 1;
      }
    });
    return map;
  }, [photos, categories]);

  const filteredPhotos = React.useMemo(() => {
    return photos.filter((p) => {
      const photoCat = (p.categoryName || (p as any).category || '').trim().toLowerCase();
      // Category filter
      if (selectedCategoryFilter !== 'Todos') {
        const filterLower = selectedCategoryFilter.trim().toLowerCase();
        const matchedCategoryObj = categories.find(
          (c) => c.name.toLowerCase() === filterLower || c.id === selectedCategoryFilter
        );
        const matchesName = photoCat === filterLower;
        const matchesId = matchedCategoryObj ? p.categoryId === matchedCategoryObj.id : false;
        if (!matchesName && !matchesId) {
          return false;
        }
      }
      // Status filter
      if (selectedStatusFilter === 'active' && !p.active) return false;
      if (selectedStatusFilter === 'inactive' && p.active) return false;
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.number && p.number.toLowerCase().includes(q)) ||
        p.title.toLowerCase().includes(q) ||
        photoCat.includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.caption && p.caption.toLowerCase().includes(q))
      );
    });
  }, [photos, categories, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  const isRealPhotos = photos.some((p) => p.imageUrl.startsWith('/portfolio/'));
  const activePhotosCount = photos.filter((p) => p.active).length;
  const activeCategoriesCount = categories.filter((c) => c.active).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-[#12151a] rounded-2xl border border-[#20252e] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#c99e64] text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Painel do Fotógrafo • Portfólio Público</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif-luxury text-white">
              Gerenciamento Central do Portfólio
            </h2>
            <p className="text-xs text-[#9ca3af] mt-1 max-w-2xl">
              Crie categorias dinâmicas, adicione fotos por upload múltiplo, substitua arquivos,
              reorganize a exibição e mantenha o site atualizado em tempo real.
            </p>
          </div>

          {/* Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 bg-[#c99e64] hover:bg-[#d8ae74] text-[#0c0d0e] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-[#c99e64]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Fotos</span>
            </button>

            <button
              onClick={() => setShowCreateCategoryModal(true)}
              className="px-3 py-2 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#c99e64]" />
              <span>Nova Categoria</span>
            </button>

            {/* Tools Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowToolsMenu((prev) => !prev)}
                className="px-3 py-2 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c99e64]" />
                <span>Ferramentas & Ações</span>
                <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
              </button>

              {showToolsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowToolsMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-64 bg-[#141820] border border-[#262e3d] rounded-xl shadow-2xl p-1.5 z-40 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        handleOpenQuickTitleEditor();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1f2533] text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4 text-[#c99e64]" />
                      <div>
                        <div className="font-medium">Editor Rápido de Nomes</div>
                        <div className="text-[10px] text-[#8e95a2]">Editar em lista ou colar do site original</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        setBatchRenameScope(selectedPhotoIds.length > 0 ? 'selected' : (selectedCategoryFilter !== 'Todos' ? 'current_category' : 'all'));
                        setShowBatchRenameModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1f2533] text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#c99e64]" />
                      <div>
                        <div className="font-medium">Padronizar Títulos</div>
                        <div className="text-[10px] text-[#8e95a2]">Limpar prefixos imgi, DSC, etc.</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        handleRenumberCategory(selectedCategoryFilter);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1f2533] text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Hash className="w-4 h-4 text-[#c99e64]" />
                      <div>
                        <div className="font-medium">Renumerar Sequencial (#001...)</div>
                        <div className="text-[10px] text-[#8e95a2]">Reorganizar numeração da categoria</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-[#202734]" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        setActiveSubTab('import');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1f2533] text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Archive className="w-4 h-4 text-[#c99e64]" />
                      <div>
                        <div className="font-medium">Importar Pasta ou ZIP</div>
                        <div className="text-[10px] text-[#8e95a2]">Importação com estrutura de pastas</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        handleResetDemo();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/40 text-red-300 hover:text-red-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-red-400" />
                      <div>
                        <div className="font-medium">Restaurar Fotos de Demonstração</div>
                        <div className="text-[10px] text-red-400/80">Recarregar fotos padrão de exemplo</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={loadAllData}
              disabled={loading}
              className="px-3 py-2 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-[#9ca3af] hover:text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#c99e64]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Indicators Bar */}
        <div className="mt-5 pt-4 border-t border-[#1d222b] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#0c0e11] p-2.5 rounded-lg border border-[#1e232b]">
            <span className="text-[10px] uppercase text-[#9ca3af] block">Categorias</span>
            <span className="text-base font-bold text-white block mt-0.5">
              {categories.length}{' '}
              <span className="text-[10px] text-emerald-400 font-normal">({activeCategoriesCount} ativas)</span>
            </span>
          </div>

          <div className="bg-[#0c0e11] p-2.5 rounded-lg border border-[#1e232b]">
            <span className="text-[10px] uppercase text-[#9ca3af] block">Total de Fotos</span>
            <span className="text-base font-bold text-[#c99e64] block mt-0.5">
              {photos.length} fotos
            </span>
          </div>

          <div className="bg-[#0c0e11] p-2.5 rounded-lg border border-[#1e232b]">
            <span className="text-[10px] uppercase text-[#9ca3af] block">Fotos Ativas no Site</span>
            <span className="text-base font-bold text-emerald-400 block mt-0.5">
              {activePhotosCount} visíveis
            </span>
          </div>

          <div className="bg-[#0c0e11] p-2.5 rounded-lg border border-[#1e232b]">
            <span className="text-[10px] uppercase text-[#9ca3af] block">Origem das Fotos</span>
            <span className="text-xs font-semibold text-white block mt-0.5 truncate">
              {isRealPhotos ? '✓ Arquivos Reais da Rocha' : 'Demonstração'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#20252e] pb-2">
        <button
          onClick={() => setActiveSubTab('photos')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'photos'
              ? 'bg-[#c99e64] text-[#0c0d0e] font-bold'
              : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Fotografias do Portfólio ({photos.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'categories'
              ? 'bg-[#c99e64] text-[#0c0d0e] font-bold'
              : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Categorias ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('import')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'import'
              ? 'bg-[#c99e64] text-[#0c0d0e] font-bold'
              : 'text-[#9ca3af] hover:text-white hover:bg-[#15181f]'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Importação em Lote & Ferramentas</span>
        </button>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/40 border-red-800/60 text-red-300'
              : 'bg-sky-950/40 border-sky-800/60 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-sky-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. SUB-TAB: FOTOGRAFIAS DO PORTFÓLIO */}
      {/* ========================================================= */}
      {activeSubTab === 'photos' && (
        <div className="space-y-6">
          {/* Clean Controls Bar: Filters & Search */}
          <div className="bg-[#12151a] rounded-xl border border-[#20252e] p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#9ca3af] uppercase font-semibold">Categoria:</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-[#0c0e11] border border-[#262b35] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c99e64]"
                >
                  <option value="Todos">Todas as Categorias ({photos.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({photoCountsByCategory[c.name] || 0}) {!c.active ? '• Inativa' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1 bg-[#0c0e11] p-1 rounded-lg border border-[#262b35]">
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('all')}
                  className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                    selectedStatusFilter === 'all'
                      ? 'bg-[#c99e64] text-black font-semibold'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  Todas ({photos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('active')}
                  className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                    selectedStatusFilter === 'active'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  Ativas ({activePhotosCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('inactive')}
                  className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                    selectedStatusFilter === 'inactive'
                      ? 'bg-zinc-700 text-white font-semibold'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  Inativas ({photos.length - activePhotosCount})
                </button>
              </div>
            </div>

            {/* Search and Select All */}
            <div className="flex items-center gap-2 justify-between sm:justify-end">
              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Buscar foto por número, título..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-7 py-1.5 bg-[#0c0e11] border border-[#262b35] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c99e64]"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {filteredPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPhotoIds.length === filteredPhotos.length) {
                      setSelectedPhotoIds([]);
                    } else {
                      setSelectedPhotoIds(filteredPhotos.map((p) => String(p.id)));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    selectedPhotoIds.length === filteredPhotos.length
                      ? 'bg-[#c99e64] text-black border-[#c99e64]'
                      : 'bg-[#171b22] hover:bg-[#222834] text-gray-300 border-[#2b313d]'
                  }`}
                >
                  {selectedPhotoIds.length === filteredPhotos.length
                    ? 'Desmarcar Todas'
                    : 'Selecionar Todas'}
                </button>
              )}
            </div>
          </div>

          {/* Sticky Selection Bar - only shown when items are selected */}
          {selectedPhotoIds.length > 0 && (
            <div className="sticky top-4 z-30 bg-gradient-to-r from-[#181d26] via-[#151922] to-[#12151c] p-3 rounded-xl border border-[#c99e64]/60 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2.5 py-1 bg-[#c99e64] text-black font-bold rounded-md text-xs shadow-sm">
                  {selectedPhotoIds.length} foto(s) selecionada(s)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIds([])}
                  className="text-xs text-[#9ca3af] hover:text-white underline cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Batch Move to Category */}
                <div className="flex items-center gap-1.5 bg-[#0c0e11] px-2 py-1 rounded-lg border border-[#2b313d]">
                  <FolderInput className="w-3.5 h-3.5 text-[#c99e64]" />
                  <select
                    value={batchTargetCategory}
                    onChange={(e) => setBatchTargetCategory(e.target.value)}
                    className="bg-transparent border-0 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#12151a]">Mover para categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#12151a]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!batchTargetCategory || loading}
                    onClick={() => handleBatchMovePhotos()}
                    className="px-2.5 py-0.5 bg-[#c99e64] hover:bg-[#d8ae74] disabled:opacity-40 text-black font-bold text-xs rounded transition-colors cursor-pointer"
                  >
                    Mover
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBatchRenameScope('selected');
                    setShowBatchRenameModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-[#171b22] hover:bg-[#222834] text-[#c99e64] border border-[#c99e64]/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Padronizar Títulos</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenQuickTitleEditor}
                  className="px-2.5 py-1.5 bg-[#1a212d] hover:bg-[#232c3d] text-white border border-[#303c52] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Editar nomes das fotos selecionadas em lista rápida"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-[#c99e64]" />
                  <span>Editar Nomes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/70 text-red-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          )}

          {/* Photos Visual Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="py-16 text-center bg-[#12151a] rounded-xl border border-[#20252e] p-8">
              <Camera className="w-10 h-10 text-[#c99e64] mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-serif-luxury text-white">Nenhuma fotografia encontrada</h3>
              <p className="text-xs text-[#9ca3af] mt-1 mb-5 max-w-md mx-auto">
                {searchQuery
                  ? `Não encontramos fotografias correspondentes a "${searchQuery}".`
                  : `Nenhuma foto cadastrada na categoria "${selectedCategoryFilter}". Adicione suas fotos reais ou restaure as fotos de exemplo.`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (selectedCategoryFilter !== 'Todos') {
                      setUploadCategory(selectedCategoryFilter);
                    }
                    setShowUploadModal(true);
                  }}
                  className="px-4 py-2 bg-[#c99e64] hover:bg-[#d8ae74] text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Fotos</span>
                </button>
                <button
                  onClick={handleResetDemo}
                  className="px-4 py-2 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-xs text-white font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#c99e64]" />
                  <span>Restaurar Fotos de Exemplo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`group relative bg-[#0e1014] rounded-xl overflow-hidden border transition-all flex flex-col ${
                    selectedPhotoIds.includes(String(photo.id))
                      ? 'border-[#c99e64] ring-2 ring-[#c99e64]/50 shadow-lg shadow-[#c99e64]/10'
                      : photo.active
                      ? 'border-[#20252e] hover:border-[#c99e64]/70'
                      : 'border-zinc-800 opacity-70'
                  }`}
                >
                  {/* Photo Container */}
                  <div className="relative aspect-[4/5] bg-black/50 overflow-hidden">
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Selection Checkbox & Number Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                      <input
                        type="checkbox"
                        checked={selectedPhotoIds.includes(String(photo.id))}
                        onChange={(e) => {
                          e.stopPropagation();
                          const sid = String(photo.id);
                          if (e.target.checked) {
                            setSelectedPhotoIds((prev) => [...prev, sid]);
                          } else {
                            setSelectedPhotoIds((prev) => prev.filter((id) => id !== sid));
                          }
                        }}
                        title="Selecionar fotografia"
                        className="w-4 h-4 rounded border-gray-600 bg-black/80 text-[#c99e64] focus:ring-[#c99e64] cursor-pointer accent-[#c99e64]"
                      />
                      <span className="px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded font-mono text-[10px] font-bold text-[#c99e64] border border-white/10 shadow">
                        #{photo.number || (index + 1)}
                      </span>
                    </div>

                    {/* Status Badge (Active/Inactive) */}
                    <button
                      type="button"
                      onClick={() => handleTogglePhotoActive(photo)}
                      title={photo.active ? 'Foto ativa no site (clique para desativar)' : 'Foto inativa/oculta (clique para ativar)'}
                      className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md cursor-pointer transition-all ${
                        photo.active
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                          : 'bg-zinc-900/90 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {photo.active ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      <span>{photo.active ? 'Ativa' : 'Oculta'}</span>
                    </button>

                    {/* Featured star */}
                    <button
                      type="button"
                      onClick={() => handleTogglePhotoFeatured(photo)}
                      title={photo.featured ? 'Remover destaque' : 'Definir como destaque'}
                      className={`absolute bottom-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                        photo.featured
                          ? 'bg-[#c99e64] text-black'
                          : 'bg-black/60 text-white/70 hover:text-white'
                      }`}
                    >
                      <Star className={`w-3 h-3 ${photo.featured ? 'fill-black' : ''}`} />
                    </button>

                    {/* Order buttons */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded p-0.5 border border-white/10">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMovePhoto(index, 'up')}
                        title="Subir posição"
                        className="p-1 text-white hover:text-[#c99e64] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === filteredPhotos.length - 1}
                        onClick={() => handleMovePhoto(index, 'down')}
                        title="Descer posição"
                        className="p-1 text-white hover:text-[#c99e64] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#c99e64] font-semibold truncate">
                          {photo.categoryName || photo.category || 'Geral'}
                        </span>
                      </div>
                      {inlineEditingPhotoId === String(photo.id) ? (
                        <div className="flex items-center gap-1 my-0.5">
                          <input
                            autoFocus
                            type="text"
                            value={inlineDraftTitle}
                            onChange={(e) => setInlineDraftTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveInlineTitle(String(photo.id), inlineDraftTitle);
                              } else if (e.key === 'Escape') {
                                setInlineEditingPhotoId(null);
                              }
                            }}
                            onBlur={() => handleSaveInlineTitle(String(photo.id), inlineDraftTitle)}
                            className="w-full bg-[#090b0e] border border-[#c99e64] text-xs text-white rounded px-1.5 py-0.5 focus:outline-none"
                            placeholder="Nome da foto..."
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setInlineEditingPhotoId(String(photo.id));
                            setInlineDraftTitle(photo.title);
                          }}
                          className="group/title flex items-center justify-between gap-1 cursor-pointer hover:bg-white/5 px-1 py-0.5 -mx-1 rounded transition-colors"
                          title="Clique para editar o nome rapidamente (Enter para salvar)"
                        >
                          <p className="text-xs font-medium text-white truncate group-hover/title:text-[#c99e64]">
                            {photo.title}
                          </p>
                          <Edit2 className="w-2.5 h-2.5 text-gray-500 opacity-0 group-hover/title:opacity-100 flex-shrink-0" />
                        </div>
                      )}
                      {photo.caption && (
                        <p className="text-[10px] text-[#8e95a2] truncate mt-0.5" title={photo.caption}>
                          {photo.caption}
                        </p>
                      )}
                    </div>

                    {/* Buttons: Edit details, Replace file, Delete */}
                    <div className="mt-2.5 pt-2 border-t border-[#1d222b] grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const cat = (photo.categoryName || photo.category || '').trim();
                          setEditingPhoto({
                            ...photo,
                            category: cat,
                            categoryName: cat,
                            caption: photo.caption || photo.description || '',
                            description: photo.description || photo.caption || '',
                          });
                        }}
                        title="Editar detalhes (legenda, categoria, número)"
                        className="py-1 px-1 bg-[#171b22] hover:bg-[#232934] text-[#c99e64] rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplacingPhoto(photo);
                          setReplacementFile(null);
                        }}
                        title="Substituir o arquivo da imagem mantendo número e metadados"
                        className="py-1 px-1 bg-[#171b22] hover:bg-[#232934] text-sky-400 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span className="hidden sm:inline">Trocar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo)}
                        title="Excluir fotografia permanentemente"
                        className="py-1 px-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-TAB: GERENCIAR CATEGORIAS */}
      {/* ========================================================= */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-[#12151a] rounded-xl border border-[#20252e] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-serif-luxury text-white">Categorias do Portfólio Público</h3>
                <p className="text-xs text-[#9ca3af] mt-0.5">
                  As categorias ativas alimentam os botões de filtro no portfólio do site. Ao criar ou
                  alterar o nome de uma categoria, as alterações refletem instantaneamente no site.
                </p>
              </div>

              <button
                onClick={() => setShowCreateCategoryModal(true)}
                className="px-4 py-2 bg-[#c99e64] hover:bg-[#d8ae74] text-[#0c0d0e] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#c99e64]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </button>
            </div>

            {/* Categories Table / List */}
            {categories.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat, index) => {
                  const count = photoCountsByCategory[cat.name] || 0;
                  return (
                    <div
                      key={cat.id}
                      className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        cat.active ? 'bg-[#0f1115] border-[#222730]' : 'bg-[#0c0d10] border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Order index */}
                        <div className="w-7 h-7 rounded bg-[#181b22] border border-[#282f3b] font-mono text-xs text-[#c99e64] flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{cat.name}</h4>
                            <span className="text-[10px] text-[#8e95a2] font-mono">/{cat.slug}</span>
                            {/* Active badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                cat.active
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {cat.active ? 'Ativa no Site' : 'Inativa'}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-[#9ca3af] mt-0.5">{cat.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Photo Count and Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="px-2.5 py-1 rounded bg-[#1a1e26] text-xs text-white border border-[#2b313d] font-medium mr-2">
                          {count} {count === 1 ? 'foto' : 'fotos'}
                        </span>

                        {/* Toggle active button */}
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryActive(cat)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            cat.active
                              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                          }`}
                          title={cat.active ? 'Desativar categoria no site' : 'Ativar categoria no site'}
                        >
                          {cat.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Move Up / Down */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveCategory(index, 'up')}
                          className="p-1.5 bg-[#171b22] hover:bg-[#232934] border border-[#282f3b] text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                          title="Subir posição no menu"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={index === categories.length - 1}
                          onClick={() => handleMoveCategory(index, 'down')}
                          className="p-1.5 bg-[#171b22] hover:bg-[#232934] border border-[#282f3b] text-white disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                          title="Descer posição no menu"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Edit Category */}
                        <button
                          type="button"
                          onClick={() => setEditingCategory(cat)}
                          className="p-1.5 bg-[#171b22] hover:bg-[#232934] border border-[#282f3b] text-[#c99e64] rounded-lg transition-colors cursor-pointer"
                          title="Editar nome e descrição"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Category */}
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-lg transition-colors cursor-pointer"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-TAB: IMPORTAÇÃO EM LOTE & FERRAMENTAS */}
      {/* ========================================================= */}
      {activeSubTab === 'import' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ZIP Upload Card */}
            <div className="lg:col-span-2 bg-[#12151a] rounded-xl border border-[#20252e] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-medium text-sm">
                  <Archive className="w-4 h-4 text-[#c99e64]" />
                  <span>Importar Arquivo ZIP com Pastas por Categoria</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#9ca3af] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceDemo}
                    onChange={(e) => setReplaceDemo(e.target.checked)}
                    className="rounded border-[#2d3340] text-[#c99e64] focus:ring-[#c99e64]"
                  />
                  <span>Substituir fotos de demonstração</span>
                </label>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    handleZipUpload(files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragOver
                    ? 'border-[#c99e64] bg-[#c99e64]/5'
                    : 'border-[#262c37] hover:border-[#384152] bg-[#0f1115]'
                }`}
              >
                <input
                  type="file"
                  ref={zipInputRef}
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleZipUpload(e.target.files[0]);
                    }
                  }}
                />

                <Archive className="w-12 h-12 text-[#c99e64] mx-auto mb-3 opacity-80" />
                <h3 className="text-sm font-semibold text-white">
                  Arraste e solte o arquivo ZIP do portfólio aqui
                </h3>
                <p className="text-xs text-[#9ca3af] mt-1 max-w-md mx-auto">
                  O sistema extrairá os arquivos respeitando a hierarquia de pastas original. Cada pasta
                  é mapeada para uma categoria (ex: <em>Casamentos</em>, <em>15 Anos</em>, <em>Gestantes</em>, etc.).
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => zipInputRef.current?.click()}
                    className="px-5 py-2.5 bg-[#c99e64] hover:bg-[#d8ae74] text-[#0c0d0e] font-semibold rounded-lg text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{importing ? 'Importando...' : 'Selecionar Arquivo ZIP'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleLocalScan}
                    className="px-4 py-2.5 bg-[#1a1e26] hover:bg-[#232933] border border-[#2b313d] text-white text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#c99e64]" />
                    <span>Escanear Fotos no Servidor</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-[#828a95]">
                <span>Formatos aceitos: JPG, JPEG, PNG, WEBP, AVIF</span>
                <span>Armazenamento: Arquivos estáticos físicos (sem Base64)</span>
              </div>
            </div>

            {/* Folder & Reset Options */}
            <div className="bg-[#12151a] rounded-xl border border-[#20252e] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-medium text-sm mb-2">
                  <FolderOpen className="w-4 h-4 text-[#c99e64]" />
                  <span>Importar Pasta do Computador</span>
                </div>
                <p className="text-xs text-[#9ca3af] mb-4">
                  Se você preferir selecionar uma pasta já descompactada em seu computador, clique no botão
                  abaixo. A estrutura de subpastas será preservada.
                </p>

                <input
                  type="file"
                  ref={folderInputRef}
                  multiple
                  // @ts-ignore
                  webkitdirectory="true"
                  directory="true"
                  className="hidden"
                  onChange={handleFolderUpload}
                />

                <button
                  type="button"
                  disabled={importing}
                  onClick={() => folderInputRef.current?.click()}
                  className="w-full py-3 bg-[#171b22] hover:bg-[#20252f] border border-[#282f3b] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-[#c99e64]" />
                  <span>Selecionar Pasta Inteira</span>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1e232b]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white font-medium block">Restaurar Amostras Demo</span>
                    <span className="text-[10px] text-[#828a95] block">Redefine o portfólio inicial para testes</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="px-3 py-1.5 bg-[#1a1e26] hover:bg-red-950/40 hover:border-red-800 border border-[#2b313d] text-xs text-[#9ca3af] hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                  >
                    Restaurar Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UPLOAD DE FOTOS (MULTIPLE FILES) */}
      {/* ========================================================= */}
      {showUploadModal && (
        <div
          onClick={() => setShowUploadModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-lg w-full p-6 sm:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Portfólio Público</span>
                <h3 className="font-serif-luxury text-xl text-white">Adicionar Fotografias</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-[#9ca3af] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadPhotos} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Categoria da(s) Foto(s) *
                </label>
                <select
                  required
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {!c.active ? '(Inativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Selecionar Fotografias *
                </label>
                <input
                  type="file"
                  ref={uploadFileInputRef}
                  required
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => setUploadFiles(e.target.files)}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
                <div className="mt-2 p-3 bg-[#171b22] border border-[#242a35] rounded-lg">
                  <div className="flex items-center justify-between text-[11px] text-[#c99e64] font-medium">
                    <span>{uploadFiles && uploadFiles.length > 0 ? `📷 ${uploadFiles.length} foto(s) selecionada(s)` : 'Selecione uma ou mais fotos'}</span>
                    <span className="text-[10px] text-[#8e95a2]">JPEG, PNG, WebP</span>
                  </div>
                  <p className="text-[10px] text-[#8e95a2] mt-1 leading-relaxed">
                    ✨ O sistema atribui automaticamente os números visuais (#001, #002...) e organiza as fotos na ordem sequencial da categoria no Supabase.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="upload-active-check"
                  checked={uploadActive}
                  onChange={(e) => setUploadActive(e.target.checked)}
                  className="rounded border-[#2d3340] text-[#c99e64] focus:ring-[#c99e64]"
                />
                <label htmlFor="upload-active-check" className="text-white text-xs cursor-pointer">
                  Publicar imediatamente no portfólio (Foto Ativa)
                </label>
              </div>

              {loading && uploadProgress && (
                <div className="p-3 bg-[#171b22] border border-[#c99e64]/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#c99e64] font-medium">
                    <span>Enviando fotos em lotes seguros...</span>
                    <span>
                      {uploadProgress.current} de {uploadProgress.total} ({Math.round((uploadProgress.current / Math.max(1, uploadProgress.total)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#0c0e11] rounded-full h-2 overflow-hidden border border-[#2a303c]">
                    <div
                      className="bg-gradient-to-r from-[#c99e64] to-[#ecc793] h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.round((uploadProgress.current / Math.max(1, uploadProgress.total)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8e95a2]">
                    Processando com armazenamento persistente. Por favor, aguarde a conclusão.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-[#171b22] text-white rounded-lg hover:bg-[#20252f] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#c99e64] text-black font-bold uppercase tracking-wider rounded-lg hover:bg-[#d8ae74] shadow-md shadow-[#c99e64]/20 disabled:opacity-60"
                >
                  {loading
                    ? uploadProgress
                      ? `Enviando (${uploadProgress.current}/${uploadProgress.total})...`
                      : 'Enviando...'
                    : 'Subir Fotografias'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR FOTOGRAFIA */}
      {/* ========================================================= */}
      {editingPhoto && (
        <div
          onClick={() => setEditingPhoto(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Editar Fotografia</span>
                <h3 className="font-serif-luxury text-lg text-white">
                  #{editingPhoto.number || ''} {editingPhoto.title}
                </h3>
              </div>
              <button onClick={() => setEditingPhoto(null)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePhoto} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 bg-[#0c0e11] p-2.5 rounded-lg border border-[#262b35]">
                <img
                  src={editingPhoto.imageUrl}
                  alt={editingPhoto.title}
                  className="w-16 h-16 object-cover rounded-md border border-[#262b35]"
                />
                <div className="text-[11px]">
                  <span className="text-[#9ca3af] block">Arquivo:</span>
                  <span className="text-white font-mono truncate block max-w-[220px]">
                    {editingPhoto.imageUrl.split('/').pop()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                    Número da Foto
                  </label>
                  <input
                    type="text"
                    value={editingPhoto.number || ''}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, number: e.target.value })}
                    placeholder="ex: 001"
                    className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#9ca3af] font-semibold uppercase">
                      Categoria *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const custom = prompt('Digite o nome da nova categoria:');
                        if (custom && custom.trim()) {
                          const catTrimmed = custom.trim();
                          setEditingPhoto({
                            ...editingPhoto,
                            category: catTrimmed,
                            categoryName: catTrimmed,
                          });
                        }
                      }}
                      className="text-[10px] text-[#c99e64] hover:underline cursor-pointer"
                    >
                      + Nova categoria
                    </button>
                  </div>
                  <select
                    required
                    value={editingPhoto.categoryName || editingPhoto.category || ''}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const catObj = categories.find((c) => c.name === newCat);
                      setEditingPhoto({
                        ...editingPhoto,
                        category: newCat,
                        categoryName: newCat,
                        categoryId: catObj ? catObj.id : editingPhoto.categoryId,
                      });
                    }}
                    className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#c99e64]"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {!c.active ? '(Inativa)' : ''}
                      </option>
                    ))}
                    {editingPhoto.categoryName && !categories.some((c) => c.name.toLowerCase() === editingPhoto.categoryName?.toLowerCase()) && (
                      <option value={editingPhoto.categoryName}>
                        {editingPhoto.categoryName} (Nova)
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Título da Foto
                </label>
                <input
                  type="text"
                  required
                  value={editingPhoto.title}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Legenda / Descrição
                </label>
                <textarea
                  rows={2}
                  value={editingPhoto.caption || ''}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })}
                  placeholder="Informações adicionais..."
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPhoto.active}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, active: e.target.checked })}
                    className="rounded border-[#2d3340] text-[#c99e64] focus:ring-[#c99e64]"
                  />
                  <span>Foto Ativa (Visível no portfólio)</span>
                </label>

                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPhoto.featured}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, featured: e.target.checked })}
                    className="rounded border-[#2d3340] text-[#c99e64] focus:ring-[#c99e64]"
                  />
                  <span>Destaque</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 bg-[#171b22] text-white rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#c99e64] text-black font-bold rounded-lg hover:bg-[#d8ae74]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SUBSTITUIR ARQUIVO DA FOTO (SEM PERDER METADADOS) */}
      {/* ========================================================= */}
      {replacingPhoto && (
        <div
          onClick={() => setReplacingPhoto(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Substituição de Imagem</span>
                <h3 className="font-serif-luxury text-lg text-white">Substituir Arquivo da Foto</h3>
              </div>
              <button onClick={() => setReplacingPhoto(null)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#9ca3af] mb-4">
              Substitua o arquivo desta foto por uma versão em maior resolução ou tratada. A posição,
              categoria, número (#{replacingPhoto.number || ''}) e descrição serão preservados intactos.
            </p>

            <form onSubmit={handleReplacePhotoFile} className="space-y-4 text-xs">
              <div className="flex items-center gap-3 bg-[#0c0e11] p-3 rounded-lg border border-[#262b35]">
                <img
                  src={replacingPhoto.imageUrl}
                  alt={replacingPhoto.title}
                  className="w-16 h-16 object-cover rounded border border-[#262b35]"
                />
                <div>
                  <span className="text-[10px] text-[#c99e64] uppercase font-semibold block">
                    {replacingPhoto.category} • #{replacingPhoto.number}
                  </span>
                  <span className="text-xs font-semibold text-white block">{replacingPhoto.title}</span>
                </div>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Novo Arquivo de Imagem *
                </label>
                <input
                  type="file"
                  ref={replaceFileInputRef}
                  required
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReplacementFile(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setReplacingPhoto(null)}
                  className="px-4 py-2 bg-[#171b22] text-white rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !replacementFile}
                  className="px-5 py-2 bg-[#c99e64] text-black font-bold rounded-lg hover:bg-[#d8ae74] disabled:opacity-40"
                >
                  {loading ? 'Substituindo...' : 'Confirmar Substituição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR CATEGORIA */}
      {/* ========================================================= */}
      {showCreateCategoryModal && (
        <div
          onClick={() => setShowCreateCategoryModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Portfólio Público</span>
                <h3 className="font-serif-luxury text-lg text-white">Criar Nova Categoria</h3>
              </div>
              <button onClick={() => setShowCreateCategoryModal(false)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="ex: Casamentos, 15 Anos, Formaturas..."
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Breve descrição da categoria para o público..."
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white focus:border-[#c99e64] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="px-4 py-2 bg-[#171b22] text-white rounded-lg hover:bg-[#20252f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#c99e64] text-black font-bold uppercase tracking-wider rounded-lg hover:bg-[#d8ae74]"
                >
                  {loading ? 'Salvando...' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR CATEGORIA */}
      {/* ========================================================= */}
      {editingCategory && (
        <div
          onClick={() => setEditingCategory(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] uppercase text-[#c99e64] font-semibold">Editar Categoria</span>
                <h3 className="font-serif-luxury text-lg text-white">{editingCategory.name}</h3>
              </div>
              <button onClick={() => setEditingCategory(null)} className="text-[#9ca3af]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
                <span className="text-[10px] text-[#8e95a2] mt-1 block">
                  Ao alterar o nome, todas as fotos desta categoria serão sincronizadas automaticamente.
                </span>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full bg-[#0c0e11] border border-[#262b35] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-cat-active"
                  checked={editingCategory.active}
                  onChange={(e) => setEditingCategory({ ...editingCategory, active: e.target.checked })}
                  className="rounded border-[#2d3340] text-[#c99e64] focus:ring-[#c99e64]"
                />
                <label htmlFor="edit-cat-active" className="text-white text-xs cursor-pointer">
                  Categoria Ativa no Site Público
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e232b]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-[#171b22] text-white rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#c99e64] text-black font-bold rounded-lg hover:bg-[#d8ae74]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE CATEGORIA */}
      {/* ========================================================= */}
      {categoryToDelete && (
        <div
          onClick={() => setCategoryToDelete(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-serif-luxury text-lg text-white">Excluir Categoria</h3>
            </div>

            <p className="text-xs text-[#9ca3af] mb-4">
              Você tem certeza que deseja excluir a categoria <strong className="text-white">"{categoryToDelete.name}"</strong>?
            </p>

            {(photoCountsByCategory[categoryToDelete.name] || 0) > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 text-xs mb-4">
                <strong>Atenção:</strong> Existem {photoCountsByCategory[categoryToDelete.name]} fotos associadas a esta categoria.
                As fotografias serão reatribuídas para a categoria "Geral" para não serem perdidas.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e232b]">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-[#171b22] text-white rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO INDIVIDUAL DE FOTO */}
      {/* ========================================================= */}
      {photoToDelete && (
        <div
          onClick={() => setPhotoToDelete(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-serif-luxury text-lg text-white">Excluir Fotografia</h3>
            </div>

            <div className="flex items-center gap-4 p-3 bg-[#181c24] rounded-xl border border-[#262c38] mb-4">
              <img
                src={photoToDelete.imageUrl}
                alt={photoToDelete.title}
                className="w-16 h-16 object-cover rounded-lg border border-[#333a4a] bg-black/40"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#c99e64]/20 text-[#c99e64] rounded font-bold">
                    #{photoToDelete.number || '---'}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate">
                    {photoToDelete.category}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white truncate">{photoToDelete.title}</h4>
                {photoToDelete.caption && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{photoToDelete.caption}</p>
                )}
              </div>
            </div>

            <p className="text-xs text-[#9ca3af] mb-4">
              Tem certeza que deseja excluir permanentemente esta foto do portfólio? Essa ação removerá a imagem do site.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e232b]">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-4 py-2 bg-[#171b22] hover:bg-[#202530] text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletePhoto}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-md shadow-red-900/30"
              >
                {loading ? 'Excluindo...' : 'Sim, Excluir Foto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO EM LOTE (BATCH DELETE) */}
      {/* ========================================================= */}
      {showBatchDeleteModal && (
        <div
          onClick={() => setShowBatchDeleteModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-serif-luxury text-lg text-white">Excluir Fotos Selecionadas</h3>
            </div>

            <p className="text-xs text-[#9ca3af] mb-3 leading-relaxed">
              Você selecionou <strong className="text-[#c99e64]">{selectedPhotoIds.length} fotografias</strong> para
              serem excluídas permanentemente do portfólio.
            </p>

            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-red-200 text-xs mb-4">
              <strong>Atenção:</strong> Todas as fotografias selecionadas e seus respectivos arquivos serão removidos do servidor.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e232b]">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 bg-[#171b22] hover:bg-[#202530] text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmBatchDelete}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-md shadow-red-900/30"
              >
                {loading ? 'Excluindo...' : `Sim, Excluir ${selectedPhotoIds.length} Fotos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR RENUMERAÇÃO 001, 002... */}
      {/* ========================================================= */}
      {renumberTargetCategory && (
        <div
          onClick={() => setRenumberTargetCategory(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-[#c99e64] mb-3">
              <Hash className="w-6 h-6" />
              <h3 className="font-serif-luxury text-lg text-white">Renumerar Sequencialmente</h3>
            </div>

            <p className="text-xs text-[#9ca3af] mb-4 leading-relaxed">
              Deseja renumerar sequencialmente todas as fotografias{' '}
              {renumberTargetCategory && renumberTargetCategory !== 'ALL' && renumberTargetCategory !== 'Todos' ? (
                <strong className="text-white">na categoria "{renumberTargetCategory}"</strong>
              ) : (
                <strong className="text-white">de todas as categorias</strong>
              )}{' '}
              começando em <strong className="text-[#c99e64]">#001, #002, #003...</strong> de acordo com a ordem atual?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e232b]">
              <button
                type="button"
                onClick={() => setRenumberTargetCategory(null)}
                className="px-4 py-2 bg-[#171b22] hover:bg-[#202530] text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRenumberCategory}
                disabled={loading}
                className="px-5 py-2 bg-[#c99e64] hover:bg-[#d8ae74] text-black font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Renumerando...' : 'Confirmar Renumeração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PADRONIZAR TÍTULOS E NOMES EM LOTE */}
      {/* ========================================================= */}
      {showBatchRenameModal && (
        <div
          onClick={() => setShowBatchRenameModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 text-left"
          >
            <div className="flex items-center justify-between mb-3 border-b border-[#1e232b] pb-3">
              <div className="flex items-center gap-2.5 text-[#c99e64]">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-serif-luxury text-lg text-white">Padronização Rápida de Títulos</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchRenameModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#9ca3af] mb-4 leading-relaxed">
              Substitua nomes técnicos de arquivos de câmera (como <code className="text-amber-300 font-mono bg-black/50 px-1 py-0.5 rounded text-[11px]">imgi 8 (33)</code> ou <code className="text-amber-300 font-mono bg-black/50 px-1 py-0.5 rounded text-[11px]">DSC_0012</code>) por títulos limpos e profissionais em apenas 1 clique.
            </p>

            {/* Scope selection */}
            <div className="mb-4 bg-[#0a0d11] p-3 rounded-xl border border-[#1e232c]">
              <span className="block text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                Onde aplicar:
              </span>
              <div className="space-y-1.5 text-xs text-gray-200">
                {selectedPhotoIds.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rename_scope"
                      value="selected"
                      checked={batchRenameScope === 'selected'}
                      onChange={() => setBatchRenameScope('selected')}
                      className="accent-[#c99e64]"
                    />
                    <span>Apenas nas <strong>{selectedPhotoIds.length} fotos selecionadas</strong></span>
                  </label>
                )}
                {selectedCategoryFilter !== 'Todos' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rename_scope"
                      value="current_category"
                      checked={batchRenameScope === 'current_category'}
                      onChange={() => setBatchRenameScope('current_category')}
                      className="accent-[#c99e64]"
                    />
                    <span>Em todas as fotos da categoria <strong>"{selectedCategoryFilter}"</strong> ({filteredPhotos.length} fotos)</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rename_scope"
                    value="all"
                    checked={batchRenameScope === 'all'}
                    onChange={() => setBatchRenameScope('all')}
                    className="accent-[#c99e64]"
                  />
                  <span>Em todo o portfólio (<strong>{photos.length} fotos</strong>)</span>
                </label>
              </div>
            </div>

            {/* Format Presets */}
            <div className="mb-4">
              <span className="block text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                Formato do Título:
              </span>
              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    batchRenameMode === 'category_seq'
                      ? 'bg-[#c99e64]/10 border-[#c99e64]'
                      : 'bg-[#161a21] border-[#222834] hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="rename_mode"
                    value="category_seq"
                    checked={batchRenameMode === 'category_seq'}
                    onChange={() => setBatchRenameMode('category_seq')}
                    className="accent-[#c99e64] mt-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Categoria + Número (Recomendado)</span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Gera: <span className="text-[#c99e64] font-medium">Casamento #001</span>, <span className="text-[#c99e64] font-medium">Casamento #002</span>, etc.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    batchRenameMode === 'custom_prefix'
                      ? 'bg-[#c99e64]/10 border-[#c99e64]'
                      : 'bg-[#161a21] border-[#222834] hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="rename_mode"
                    value="custom_prefix"
                    checked={batchRenameMode === 'custom_prefix'}
                    onChange={() => setBatchRenameMode('custom_prefix')}
                    className="accent-[#c99e64] mt-1"
                  />
                  <div className="w-full">
                    <span className="text-xs font-semibold text-white block">Prefixo Personalizado + Número</span>
                    <span className="text-[11px] text-gray-400 block mt-0.5 mb-1.5">
                      Ex: Digite o nome do ensaio ou casal
                    </span>
                    {batchRenameMode === 'custom_prefix' && (
                      <input
                        type="text"
                        value={batchRenameCustomPrefix}
                        onChange={(e) => setBatchRenameCustomPrefix(e.target.value)}
                        placeholder="Ex: Ensaio Marina & Lucas"
                        className="w-full px-2.5 py-1.5 bg-[#0d1015] border border-[#2c3340] rounded text-xs text-white focus:outline-none focus:border-[#c99e64]"
                      />
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    batchRenameMode === 'clean_camera'
                      ? 'bg-[#c99e64]/10 border-[#c99e64]'
                      : 'bg-[#161a21] border-[#222834] hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="rename_mode"
                    value="clean_camera"
                    checked={batchRenameMode === 'clean_camera'}
                    onChange={() => setBatchRenameMode('clean_camera')}
                    className="accent-[#c99e64] mt-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Limpeza Inteligente de Códigos de Câmera</span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Remove códigos de cópia como (33), imgi, DSC e padroniza se for código cru.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    batchRenameMode === 'number_only'
                      ? 'bg-[#c99e64]/10 border-[#c99e64]'
                      : 'bg-[#161a21] border-[#222834] hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="rename_mode"
                    value="number_only"
                    checked={batchRenameMode === 'number_only'}
                    onChange={() => setBatchRenameMode('number_only')}
                    className="accent-[#c99e64] mt-1"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Apenas Foto + Número</span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Gera: <span className="text-[#c99e64] font-medium">Foto #001</span>, <span className="text-[#c99e64] font-medium">Foto #002</span>, etc.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Renumber checkbox */}
            <div className="mb-5 pt-2 border-t border-[#1e232b]">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchRenameRenumber}
                  onChange={(e) => setBatchRenameRenumber(e.target.checked)}
                  className="accent-[#c99e64] rounded"
                />
                <span>Também renumerar a ordem sequencial (#001, #002, #003...)</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#1e232b]">
              <button
                type="button"
                onClick={() => setShowBatchRenameModal(false)}
                className="px-4 py-2 bg-[#171b22] hover:bg-[#202530] text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchRename}
                disabled={loading}
                className="px-5 py-2 bg-[#c99e64] hover:bg-[#d8ae74] text-black font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Padronizando...' : 'Aplicar Padronização Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITOR RÁPIDO DE NOMES (PLANILHA / LISTA + COLAR) */}
      {/* ========================================================= */}
      {showQuickTitleEditorModal && (
        <div
          onClick={() => setShowQuickTitleEditorModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#1e232b] flex items-center justify-between bg-[#0e1115]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#c99e64]/10 rounded-xl border border-[#c99e64]/30">
                  <ClipboardList className="w-5 h-5 text-[#c99e64]" />
                </div>
                <div>
                  <h3 className="font-serif-luxury text-lg text-white">Editor Rápido de Nomes</h3>
                  <p className="text-xs text-[#9ca3af]">
                    Altere os nomes de todas as fotos em formato de lista ou cole uma lista completa pronta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQuickTitleEditorModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-3 sm:px-5 bg-[#171b22] border-b border-[#202633] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteBox((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    showPasteBox
                      ? 'bg-[#c99e64] text-black shadow-md'
                      : 'bg-[#0f1217] hover:bg-[#202735] text-[#c99e64] border border-[#c99e64]/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showPasteBox ? 'Fechar Caixa de Colar' : '📋 Colar Lista Pronta de Nomes'}</span>
                </button>

                <span className="text-xs text-gray-400 hidden sm:inline">
                  {selectedPhotoIds.length > 0
                    ? `Editando ${selectedPhotoIds.length} fotos selecionadas`
                    : `Editando ${filteredPhotos.length} fotos exibidas`}
                </span>
              </div>

              {/* Scope switch if selected */}
              {selectedPhotoIds.length > 0 && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="text-[#c99e64] font-medium">Filtro ativo: apenas selecionadas</span>
                  <button
                    type="button"
                    onClick={() => {
                      const drafts: Record<string, string> = {};
                      filteredPhotos.forEach((p) => {
                        drafts[String(p.id)] = p.title || '';
                      });
                      setQuickTitleDrafts(drafts);
                      setSelectedPhotoIds([]);
                    }}
                    className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Editar todas ({filteredPhotos.length})
                  </button>
                </div>
              )}
            </div>

            {/* Paste Box Area (Expandable) */}
            {showPasteBox && (
              <div className="p-4 bg-[#0a0d11] border-b border-[#222834] transition-all">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#c99e64]" />
                      <span className="text-xs font-semibold text-white">
                        Cole a lista de nomes do seu site oficial ou bloco de notas (1 nome por linha):
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowExtractorHelper((prev) => !prev)}
                      className="px-2.5 py-1 bg-[#181d26] hover:bg-[#222834] text-[#c99e64] hover:text-[#d8ae74] border border-[#c99e64]/30 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-[#c99e64]" />
                      <span>{showExtractorHelper ? 'Ocultar Dica Extratora' : '⚡ Como copiar todos os nomes do site original em 2 seg?'}</span>
                    </button>
                  </div>

                  {/* Extractor Script Helper Instructions */}
                  {showExtractorHelper && (
                    <div className="mb-3 p-3.5 bg-[#11151c] border border-[#c99e64]/30 rounded-xl text-xs space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="font-bold text-[#c99e64] flex items-center gap-1.5">
                            <Terminal className="w-4 h-4" />
                            Como pegar todos os nomes sem passar o mouse foto por foto:
                          </p>

                          {/* Dica 1: Ctrl+U (A mais fácil, funciona no Opera, Chrome, Edge) */}
                          <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
                            <p className="text-white font-semibold text-[11px] flex items-center gap-1.5 text-amber-300">
                              ⭐ Opção 1 (Mais fácil de todas - Não precisa de F12 nem Console):
                            </p>
                            <ol className="list-decimal list-inside text-gray-300 space-y-0.5 text-[11px] leading-relaxed">
                              <li>Abra a página do seu <strong>site original</strong> onde estão as fotos.</li>
                              <li>Pressione <kbd className="px-1.5 py-0.5 bg-black rounded border border-gray-700 font-mono text-[10px] text-white">Ctrl + U</kbd> (isso abre o código-fonte da página).</li>
                              <li>Aperte <kbd className="px-1.5 py-0.5 bg-black rounded border border-gray-700 font-mono text-[10px] text-white">Ctrl + A</kbd> (selecionar tudo) e depois <kbd className="px-1.5 py-0.5 bg-black rounded border border-gray-700 font-mono text-[10px] text-white">Ctrl + C</kbd> (copiar).</li>
                              <li>Cole tudo aqui na caixa de texto abaixo! O nosso sistema lê o HTML e <strong>extrai os nomes das fotos automaticamente</strong>!</li>
                            </ol>
                          </div>

                          {/* Dica 2: Opera / Chrome Console */}
                          <div className="p-2.5 bg-black/20 rounded-lg border border-white/5 space-y-1">
                            <p className="text-white font-semibold text-[11px]">
                              Opção 2 (Via Console do Navegador):
                            </p>
                            <p className="text-gray-400 text-[10.5px]">
                              ⚠️ <em>No Opera / Opera GX, a tecla <strong>F12</strong> ativa o "Botão do Pânico" (que fecha as abas). No Opera, use o botão direito do mouse ou o atalho alternativo:</em>
                            </p>
                            <ol className="list-decimal list-inside text-gray-300 space-y-0.5 text-[11px] leading-relaxed">
                              <li>No site original, clique com o <strong>botão direito</strong> em qualquer lugar da tela e escolha <strong>Inspecionar</strong> (ou use <kbd className="px-1.5 py-0.5 bg-black rounded border border-gray-700 font-mono text-[10px] text-white">Ctrl + Shift + C</kbd>).</li>
                              <li>Clique na aba <strong>Console</strong> lá em cima.</li>
                              <li>Cole o código extrator ao lado e dê <kbd className="px-1.5 py-0.5 bg-black rounded border border-gray-700 font-mono text-[10px] text-white">Enter</kbd>. Todos os nomes serão copiados instantaneamente!</li>
                            </ol>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const script = `(() => {
  const titles = [];
  document.querySelectorAll('img, figure, [data-title], [title], .photo, .gallery-item, .item, a[title]').forEach((el) => {
    let text = el.getAttribute('title') || 
               el.getAttribute('data-title') || 
               el.getAttribute('aria-label') || 
               (el.tagName === 'IMG' ? el.getAttribute('alt') : '') ||
               el.querySelector?.('figcaption, .title, .caption, [class*="title"], [class*="caption"], h3, h4, p')?.innerText || '';
    text = (text || '').trim();
    if (text && text.length > 2 && !['logo', 'icon', 'menu', 'banner', 'seta', 'arrow', 'whatsapp', 'instagram'].some(w => text.toLowerCase().includes(w))) {
      if (!titles.includes(text)) titles.push(text);
    }
  });
  if (titles.length === 0) {
    document.querySelectorAll('figcaption, [class*="overlay"], [class*="caption"], [class*="title"]').forEach((el) => {
      const t = (el.innerText || '').trim();
      if (t && t.length > 2 && !titles.includes(t)) titles.push(t);
    });
  }
  const result = titles.join('\\n');
  if (result) {
    if (typeof copy === 'function') copy(result);
    else navigator.clipboard.writeText(result);
    alert('✅ Sucesso! ' + titles.length + ' nomes foram copiados para sua área de transferência!\\\\nAgora cole no seu painel.');
  } else {
    alert('Nenhum título identificado automaticamente.');
  }
})();`;
                            navigator.clipboard.writeText(script);
                            setCopiedExtractorCode(true);
                            setTimeout(() => setCopiedExtractorCode(false), 3000);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                            copiedExtractorCode
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#c99e64] hover:bg-[#d8ae74] text-black shadow'
                          }`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedExtractorCode ? 'Copiado!' : 'Copiar Código Extrator'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={5}
                    value={pastedTitlesText}
                    onChange={(e) => setPastedTitlesText(e.target.value)}
                    placeholder={`Entrada da Noiva\nTroca das Alianças\nVotos dos Noivos\nPrimeiro Beijo\nBrinde com Padrinhos\nCorte do Bolo`}
                    className="w-full bg-[#12151a] border border-[#2b3240] rounded-xl p-3 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#c99e64] leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-[11px] text-gray-400">
                      O sistema distribuirá cada linha como o título da foto correspondente, em ordem!
                    </p>
                    <button
                      type="button"
                      onClick={handleApplyPastedTitles}
                      disabled={!pastedTitlesText.trim()}
                      className="px-4 py-1.5 bg-[#c99e64] hover:bg-[#d8ae74] disabled:opacity-40 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Distribuir Nomes Linha por Linha</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Photos Table Editor */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              <div className="overflow-hidden border border-[#20252e] rounded-xl bg-[#0e1014]">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#161a21] text-gray-400 border-b border-[#20252e] text-[11px] uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3 w-16">Foto</th>
                      <th className="py-2.5 px-3 w-32">Categoria</th>
                      <th className="py-2.5 px-3">Título / Nome no Site</th>
                      <th className="py-2.5 px-3 w-28 text-right">Atalhos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1f27]">
                    {(selectedPhotoIds.length > 0
                      ? photos.filter((p) => selectedPhotoIds.includes(String(p.id)))
                      : filteredPhotos
                    ).map((photo, index) => {
                      const photoIdStr = String(photo.id);
                      const currentVal = quickTitleDrafts[photoIdStr] ?? photo.title;
                      const hasChanged = currentVal !== photo.title;

                      return (
                        <tr
                          key={photo.id}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            hasChanged ? 'bg-[#c99e64]/[0.04]' : ''
                          }`}
                        >
                          {/* Sequential Number */}
                          <td className="py-2 px-3 text-center font-mono font-bold text-[#c99e64] text-[11px]">
                            #{photo.number || (index + 1)}
                          </td>

                          {/* Thumbnail */}
                          <td className="py-2 px-3">
                            <img
                              src={photo.imageUrl}
                              alt={photo.title}
                              className="w-10 h-10 object-cover rounded-lg border border-white/10"
                            />
                          </td>

                          {/* Category */}
                          <td className="py-2 px-3 text-[11px] font-medium text-gray-400 truncate max-w-[120px]">
                            {photo.categoryName || photo.category || 'Geral'}
                          </td>

                          {/* Editable Title Input */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuickTitleDrafts((prev) => ({
                                    ...prev,
                                    [photoIdStr]: val,
                                  }));
                                }}
                                placeholder={`Ex: ${photo.categoryName || 'Foto'} #${photo.number || (index + 1)}`}
                                className={`w-full px-3 py-1.5 rounded-lg text-xs text-white border transition-colors focus:outline-none ${
                                  hasChanged
                                    ? 'bg-[#1b1f28] border-[#c99e64] font-semibold text-[#c99e64]'
                                    : 'bg-[#12151b] border-[#262c38] focus:border-[#c99e64]'
                                }`}
                              />
                              {hasChanged && (
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#c99e64] bg-[#c99e64]/20 px-1.5 py-0.5 rounded font-medium">
                                  Modificado
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quick Actions */}
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickTitleDrafts((prev) => ({
                                  ...prev,
                                  [photoIdStr]: `${photo.categoryName || photo.category || 'Foto'} #${photo.number || (index + 1)}`,
                                }));
                              }}
                              title="Preencher com Categoria + Número"
                              className="text-[10px] text-gray-400 hover:text-[#c99e64] bg-[#171b22] px-2 py-1 rounded border border-[#262c37] transition-colors cursor-pointer"
                            >
                              Padrão
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[#1e232b] bg-[#0e1115] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                <span>Dica: Use a tecla <kbd className="px-1.5 py-0.5 bg-black/60 border border-white/10 rounded font-mono text-[11px] text-gray-300">Tab</kbd> para pular rapidamente para a próxima foto.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickTitleEditorModal(false)}
                  className="px-4 py-2 bg-[#171b22] hover:bg-[#202530] text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickTitleDrafts}
                  disabled={loading}
                  className="px-6 py-2 bg-[#c99e64] hover:bg-[#d8ae74] text-black font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Salvando Alterações...' : 'Salvar Todos os Nomes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR RESTAURAÇÃO DE DADOS DE DEMO */}
      {/* ========================================================= */}
      {showResetSeedModal && (
        <div
          onClick={() => setShowResetSeedModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151a] border border-[#252b36] rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-serif-luxury text-lg text-white">Restaurar Portfólio Inicial</h3>
            </div>

            <p className="text-xs text-[#9ca3af] mb-4 leading-relaxed">
              Tem certeza que deseja restaurar as categorias e fotos padrão de demonstração do estúdio Rocha Foto & Vídeo?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e232b]">
              <button
                type="button"
                onClick={() => setShowResetSeedModal(false)}
                className="px-4 py-2 bg-[#171b22] hover:bg-[#202530] text-gray-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmResetDemo}
                disabled={loading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {loading ? 'Restaurando...' : 'Sim, Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
