import React, { useEffect, useState, useRef } from 'react';
import { useStudio, ImageBankItem } from '../../../contexts/StudioContext';
import { getImageBank, uploadToImageBank, deleteFromImageBank, toggleImageFavorite } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Images, Upload, Star, Trash2, Filter, Loader2, 
    ArrowRight, ArrowLeft, ImagePlus, Check, X, Package, 
    Mountain, Users, Sparkles, Eye
} from 'lucide-react';

const CATEGORIES = [
    { id: 'all', label: 'Todas', icon: Images },
    { id: 'product', label: 'Producto', icon: Package },
    { id: 'background', label: 'Fondos', icon: Mountain },
    { id: 'lifestyle', label: 'Lifestyle', icon: Users },
    { id: 'reference', label: 'Referencias', icon: Sparkles },
];

export const ImageBankStep: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImageBankItem | null>(null);
    const [uploadCategory, setUploadCategory] = useState<ImageBankItem['category']>('reference');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load image bank
    useEffect(() => {
        if (!state.clientId) return;
        
        const loadImages = async () => {
            setIsLoading(true);
            try {
                const result = await getImageBank(state.clientId, {
                    category: activeCategory === 'all' ? undefined : activeCategory,
                    favoritesOnly: showFavoritesOnly
                });
                dispatch({ type: 'LOAD_IMAGE_BANK', payload: (result.images || []).filter(Boolean) });
            } catch (err) {
                console.error('Error loading image bank:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadImages();
    }, [state.clientId, activeCategory, showFavoritesOnly, dispatch]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !state.clientId) return;

        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                const result = await uploadToImageBank(state.clientId, file, uploadCategory);
                dispatch({ type: 'ADD_TO_IMAGE_BANK', payload: result.image });
            }
        } catch (err) {
            console.error('Error uploading:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (imageId: string) => {
        if (!state.clientId) return;
        try {
            await deleteFromImageBank(state.clientId, imageId);
            dispatch({ type: 'REMOVE_FROM_IMAGE_BANK', payload: imageId });
            setSelectedImage(null);
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const handleToggleFavorite = async (image: ImageBankItem) => {
        if (!state.clientId) return;
        const newFavorite = !image.is_favorite;
        try {
            await toggleImageFavorite(state.clientId, image.id, newFavorite);
            dispatch({ type: 'TOGGLE_FAVORITE', payload: { id: image.id, isFavorite: newFavorite } });
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    };

    const filteredImages = (state.imageBank || []).filter(img => {
        if (!img) return false;
        if (activeCategory !== 'all' && img.category !== activeCategory) return false;
        if (showFavoritesOnly && !img.is_favorite) return false;
        return true;
    });

    const canProceed = state.imageBankLoaded;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24"
        >
            {/* HEADER */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-emerald-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                            <Images size={20} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Banco de Imágenes
                        </h2>
                    </div>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Tu biblioteca de recursos visuales. Sube productos, fondos y referencias de estilo 
                        que usarás para guiar la generación con <strong className="text-emerald-700">hasta 14 imágenes de referencia</strong>.
                    </p>
                </div>
            </div>

            {/* UPLOAD SECTION */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Categoría para Subir
                        </label>
                        <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value as ImageBankItem['category'])}
                            className="w-full md:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="product">📦 Producto</option>
                            <option value="background">🏔️ Fondo</option>
                            <option value="lifestyle">👥 Lifestyle</option>
                            <option value="reference">✨ Referencia de Estilo</option>
                        </select>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || !state.clientId}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                    >
                        {isUploading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Upload size={18} />
                        )}
                        {isUploading ? 'Subiendo...' : 'Subir Imágenes'}
                    </button>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-white/80 rounded-xl p-1 border border-gray-100 shadow-sm">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                                activeCategory === cat.id
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <cat.icon size={14} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                        showFavoritesOnly
                            ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                            : 'bg-white/80 text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <Star size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                    Solo Favoritos
                </button>

                <div className="flex-1" />
                
                <span className="text-sm text-gray-500 font-medium">
                    {filteredImages.length} imágenes
                </span>
            </div>

            {/* IMAGE GRID */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-lg min-h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-emerald-500" size={40} />
                    </div>
                ) : filteredImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <ImagePlus size={48} strokeWidth={1.5} />
                        <p className="mt-4 text-lg font-medium">No hay imágenes</p>
                        <p className="text-sm">Sube imágenes para empezar a construir tu banco</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredImages.map(img => (
                            <motion.div
                                key={img.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer border-2 border-transparent hover:border-emerald-400 transition-all"
                                onClick={() => setSelectedImage(img)}
                            >
                                <img
                                    src={img.thumbnail_url || img.image_url}
                                    alt={img.name || 'Image'}
                                    className="w-full h-full object-cover"
                                />
                                
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                    <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                {/* Category Badge */}
                                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs font-medium rounded-full">
                                    {img.category}
                                </span>

                                {/* Favorite */}
                                {img.is_favorite && (
                                    <Star size={16} className="absolute top-2 right-2 text-amber-400 fill-amber-400" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* IMAGE PREVIEW MODAL */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative">
                                <img
                                    src={selectedImage.image_url}
                                    alt={selectedImage.name || 'Preview'}
                                    className="w-full max-h-[60vh] object-contain bg-gray-100"
                                />
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Categoría</p>
                                    <p className="font-bold text-gray-900 capitalize">{selectedImage.category}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleFavorite(selectedImage)}
                                        className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                                            selectedImage.is_favorite
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Star size={16} fill={selectedImage.is_favorite ? 'currentColor' : 'none'} />
                                        {selectedImage.is_favorite ? 'Favorito' : 'Marcar Favorito'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedImage.id)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-semibold flex items-center gap-2 hover:bg-red-200 transition-all"
                                    >
                                        <Trash2 size={16} />
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* NAVIGATION */}
            <div className="fixed bottom-8 right-8 z-40 flex gap-3">
                <button
                    onClick={() => dispatch({ type: 'PREV_STEP' })}
                    className="px-6 py-4 bg-white rounded-2xl font-bold text-gray-700 flex items-center gap-2 shadow-xl hover:bg-gray-50 transition-all"
                >
                    <ArrowLeft size={18} />
                    Atrás
                </button>
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    disabled={!canProceed}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-2xl ${
                        canProceed
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:scale-105'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    Continuar
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
