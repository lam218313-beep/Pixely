import React, { useState, useRef } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, X, ArrowRight, ArrowLeft, Sparkles, Info } from 'lucide-react';

/**
 * Step 3: Asset Uploader
 * Optional step to upload reference images that can guide the generation.
 * Users can skip this step if they don't have reference assets.
 */
export const AssetUploader: React.FC = () => {
    const { state, dispatch } = useStudio();
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleFiles(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            handleFiles(files);
        }
    };

    const handleFiles = (files: File[]) => {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setUploadedImages(prev => [...prev, e.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-24"
        >
            {/* Header */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-100/50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Referencias Visuales
                        </h2>
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold uppercase">
                            Opcional
                        </span>
                    </div>
                    <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                        Sube imágenes de referencia que ayuden a guiar el estilo visual de la generación.
                        Este paso es opcional - puedes continuar sin agregar referencias.
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Info size={20} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-blue-800 text-sm font-medium">
                        Las imágenes de referencia ayudan a la IA a entender mejor el estilo visual que deseas.
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                        Puedes subir ejemplos de composición, paleta de colores, o estética general que te inspire.
                    </p>
                </div>
            </div>

            {/* Upload Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    relative bg-white rounded-3xl border-2 border-dashed transition-all cursor-pointer
                    ${isDragging 
                        ? 'border-primary-500 bg-primary-50/50 scale-[1.01]' 
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50/50'}
                    p-12 text-center
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                
                <div className={`
                    w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 transition-all
                    ${isDragging ? 'bg-primary-100' : 'bg-gray-100'}
                `}>
                    <Upload size={36} className={isDragging ? 'text-primary-600' : 'text-gray-400'} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {isDragging ? '¡Suelta aquí!' : 'Arrastra imágenes aquí'}
                </h3>
                <p className="text-gray-500 mb-4">
                    o haz clic para seleccionar archivos
                </p>
                <p className="text-xs text-gray-400">
                    PNG, JPG, WEBP • Máximo 5MB por imagen
                </p>
            </div>

            {/* Uploaded Images Grid */}
            {uploadedImages.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ImageIcon size={18} className="text-primary-500" />
                        Referencias cargadas ({uploadedImages.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                                <img
                                    src={img}
                                    alt={`Reference ${idx + 1}`}
                                    className="w-full aspect-square object-cover rounded-xl border border-gray-200"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeImage(idx);
                                    }}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Skip Option */}
            <div className="text-center">
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    className="text-gray-500 hover:text-primary-600 text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                    <Sparkles size={16} />
                    Continuar sin referencias
                </button>
            </div>

            {/* Navigation Buttons */}
            <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3">
                <button
                    onClick={() => dispatch({ type: 'PREV_STEP' })}
                    className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-full font-medium transition-all hover:bg-gray-50 shadow-lg flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <span className="hidden md:inline">Anterior</span>
                </button>
                <button
                    onClick={() => dispatch({ type: 'NEXT_STEP' })}
                    className="px-6 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-full font-bold transition-all hover:shadow-primary-500/40 hover:scale-105 active:scale-95 shadow-2xl ring-2 ring-white/20 flex items-center gap-3"
                >
                    <span className="hidden md:inline">Siguiente Paso</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
};
