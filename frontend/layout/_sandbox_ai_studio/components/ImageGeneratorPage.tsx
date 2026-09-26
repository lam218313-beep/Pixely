import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Sparkles,
    Image as ImageIcon,
    Download,
    Copy,
    Maximize2,
    RefreshCw,
    Settings,
    MoreVertical
} from 'lucide-react';
import * as api from '../services/api';

// Types
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'image_result';
    imageData?: any; // The generated image object
    timestamp: Date;
}

interface ImageGeneratorPageProps {
    // Optional props for initial state if navigated from elsewhere
}

export const ImageGeneratorPage: React.FC<ImageGeneratorPageProps> = () => {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null); // To be implemented with client selector
    const [clients, setClients] = useState<any[]>([]);

    // Config State
    const [stylePreset, setStylePreset] = useState('realistic');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        loadClients();
        // Add welcome message
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: '¡Hola! Soy tu asistente creativo. ¿Qué tipo de imagen te gustaría generar hoy? Puedo ayudarte a crear contenido visual para tus redes sociales.',
                timestamp: new Date()
            }
        ]);
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadClients = async () => {
        try {
            const result = await api.getClients();
            setClients(result);
            if (result.length > 0) setSelectedClient(result[0]);
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isGenerating) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsGenerating(true);

        try {
            // 1. First, we interpret the prompt (simplified for direct generation here)
            // In a real chat, we might ask clarifying questions first. 
            // For V1, we assume direct intent to generate.

            // Add placeholder "Thinking..." message
            const thinkingMsgId = 'thinking-' + Date.now();
            setMessages(prev => [...prev, {
                id: thinkingMsgId,
                role: 'assistant',
                content: 'Generando tu imagen...',
                timestamp: new Date()
            }]);

            // Call API
            const response = await fetch(`${api.API_BASE_URL}/images/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient?.id || 'demo', // Fallback
                    user_additions: userMsg.content,
                    style_preset: stylePreset,
                    aspect_ratio: aspectRatio,
                    // Default context from client if available could go here
                }),
            });

            if (!response.ok) throw new Error('Generation failed');
            const data = await response.json();

            // Replace thinking message with result
            setMessages(prev => prev.filter(m => m.id !== thinkingMsgId).concat([{
                id: data.image.id,
                role: 'assistant',
                content: `Aquí tienes tu imagen generada con estilo ${stylePreset}.`,
                type: 'image_result',
                imageData: data.image,
                timestamp: new Date()
            }]));

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: 'error-' + Date.now(),
                role: 'assistant',
                content: 'Lo siento, hubo un error generando la imagen. Por favor intenta de nuevo.',
                timestamp: new Date()
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex h-full bg-gray-50 rounded-[30px] overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Estudio Creativo</h2>
                            <p className="text-xs text-gray-500">Generación de imágenes con IA</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Client Selector (Simple) */}
                        <select
                            className="text-sm border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 font-medium text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            value={selectedClient?.id || ''}
                            onChange={(e) => {
                                const client = clients.find(c => c.id === e.target.value);
                                setSelectedClient(client);
                            }}
                        >
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.nombre || 'Sin Nombre'}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                            {/* Avatar for Assistant */}
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 shrink-0">
                                    <Sparkles size={14} className="text-indigo-600" />
                                </div>
                            )}

                            <div className={`max-w-[80%] ${msg.role === 'user'
                                    ? 'bg-gray-900 text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm'
                                } p-4`}>
                                {/* Text Content */}
                                {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                                {/* Image Result */}
                                {msg.type === 'image_result' && msg.imageData && (
                                    <div className="mt-4 relative group">
                                        <div className="rounded-xl overflow-hidden shadow-md border border-gray-100 bg-gray-50">
                                            <img
                                                src={msg.imageData.image_url}
                                                alt="Generated"
                                                className="w-full h-auto max-h-[400px] object-contain"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Image Actions */}
                                        <div className="flex items-center justify-between mt-3 px-1">
                                            <div className="text-xs text-gray-400">
                                                ${msg.imageData.cost_usd} • {msg.imageData.aspect_ratio}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Descargar">
                                                    <Download size={16} />
                                                </button>
                                                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Copiar Prompt">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all shadow-sm">
                        <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                            <ImageIcon size={20} />
                        </button>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe la imagen que quieres generar..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3 px-2 text-sm text-gray-800 placeholder-gray-400"
                            rows={1}
                            style={{ minHeight: '44px' }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isGenerating}
                            className={`p-3 rounded-xl transition-all ${inputValue.trim() && !isGenerating
                                    ? 'bg-gray-900 text-white shadow-lg hover:shadow-xl hover:bg-black transform hover:-translate-y-0.5'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar Settings (Could be collapsible) */}
            <div className="w-80 bg-white border-l border-gray-100 flex-shrink-0 flex flex-col p-6 overflow-y-auto">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Settings size={18} /> Configuración
                </h3>

                <div className="space-y-6">
                    {/* Style Presets */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estilo Visual</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Realistic', 'Illustration', '3D Render', 'Minimalist'].map((style) => (
                                <button
                                    key={style}
                                    onClick={() => setStylePreset(style.toLowerCase().replace(' ', '_'))}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${stylePreset === style.toLowerCase().replace(' ', '_')
                                            ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                                        }`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Formato</label>
                        <div className="flex gap-2">
                            {[
                                { id: '1:1', label: 'Post' },
                                { id: '9:16', label: 'Story' },
                                { id: '16:9', label: 'Wide' }
                            ].map((ratio) => (
                                <button
                                    key={ratio.id}
                                    onClick={() => setAspectRatio(ratio.id)}
                                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${aspectRatio === ratio.id
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                                        }`}
                                >
                                    {ratio.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                        <h4 className="font-bold text-amber-800 text-sm mb-2">✨ Pro Tips</h4>
                        <ul className="text-xs text-amber-900/70 space-y-2 list-disc pl-4">
                            <li>Sé específico con la iluminación (ej. "luz de atardecer")</li>
                            <li>Describe el estado de ánimo y colores</li>
                            <li>Usa el formato 9:16 para Stories de Instagram</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
