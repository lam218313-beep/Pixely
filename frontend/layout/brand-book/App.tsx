import React from 'react';
import { Download, Brain, Wand2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

import {
    CardMission,
    CardValues,
    CardTone,
    CardLogo,
    CardColors,
    CardTypography,
    CardIconography,
    CardPatterns,
    CardStationery
} from './components/BrandBookCards';
import { CardPersonas } from './components/CardPersonas';

interface BrandBookProps {
    overrideClientId?: string;
}

const App: React.FC<BrandBookProps> = ({ overrideClientId }) => {
    // --- Data State ---
    const [brandData, setBrandData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    // Use real ClientID from Auth Context
    const { user } = useAuth();
    const CLIENT_ID = overrideClientId || user?.fichaClienteId;

    const fetchBrand = async () => {
        if (!CLIENT_ID) {
            setIsLoading(false);
            return;
        }

        try {
            // Updated to use centralized API
            // Note: The API returns { status: "success", data: ... }
            const json = await api.getBrand(CLIENT_ID);

            if (json.status === "success" && json.data) {
                setBrandData({ ...json.data, brand_name: json.brand_name });
            }
            // Removed auto-generation on empty
        } catch (e) {
            console.error("Failed to load brand:", e);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchBrand();
    }, []);

    const handleDownload = () => {
        if (brandData?.download_url) {
            window.open(brandData.download_url, '_blank');
        } else {
            // Optional: Alert user if no link exists, or just do nothing
            // alert("No se ha configurado un enlace de descarga para esta marca.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!brandData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] bg-white rounded-3xl border-2 border-dashed border-gray-200 m-4">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Brain size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Manual de Marca No Generado</h3>
                <p className="text-gray-500 max-w-lg mb-8 text-lg">
                    Esta marca completó su entrevista pero aún no tiene identidad definida.
                    <br />Puedes generar su Misión, Visión, Valores y Visuales automáticamente usando IA.
                </p>
                <button
                    onClick={async () => {
                        setIsLoading(true);
                        try {
                            if (!CLIENT_ID) return;
                            await api.generateManual(CLIENT_ID);
                            await fetchBrand();
                        } catch (e) {
                            console.error(e);
                            alert("Error generando manual. Revisa la consola.");
                            setIsLoading(false);
                        }
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <Wand2 size={24} />
                    Generar Identidad con IA
                </button>
            </div>
        );
    }

    return (
        <div className="font-sans selection:bg-primary-500 selection:text-white pb-12">
            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto">

                {/* --- ROW 1: STRATEGY (Verbal Identity) --- */}

                {/* 2. Mission & Vision (Large) */}
                <div className="col-span-12 md:col-span-8 min-h-[300px]">
                    <CardMission data={brandData} />
                </div>

                {/* 3. Personality & Tone (Tall/Narrow) */}
                <div className="col-span-12 md:col-span-4 min-h-[300px]">
                    <CardTone data={brandData} />
                </div>

                {/* --- ROW 1.5: AUDIENCE --- */}
                {brandData?.personas && (
                    <div className="col-span-12 min-h-[360px]">
                        <CardPersonas data={brandData} />
                    </div>
                )}

                {/* --- ROW 2: CORE VISUALS --- */}

                {/* 5. Color Palette */}
                <div className="col-span-12 md:col-span-8 min-h-[340px]">
                    <CardColors data={brandData} />
                </div>

                {/* 10. Core Values (moved here) */}
                <div className="col-span-12 md:col-span-4 min-h-[340px]">
                    <CardValues data={brandData} />
                </div>

                {/* --- ROW 3: DETAILS --- */}

                {/* 6. Typography (Wide) */}
                <div className="col-span-12 md:col-span-8 min-h-[280px]">
                    <CardTypography data={brandData} />
                </div>

                {/* 7. Iconography */}
                <div className="col-span-12 md:col-span-4 min-h-[280px]">
                    <CardIconography data={brandData} />
                </div>

                {/* --- ROW 4: APPLICATIONS --- */}

                {/* 8. Patterns & Graphics */}
                <div className="col-span-12 md:col-span-4 min-h-[320px]">
                    <CardPatterns data={brandData} />
                </div>

                {/* 9. Stationery */}
                <div className="col-span-12 md:col-span-8 min-h-[300px]">
                    <CardStationery data={brandData} />
                </div>



            </div>

            {/* Download Button - Always visible */}
            <div className="mt-8 flex justify-center pb-8">
                <button
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-pink-600 text-white rounded-2xl font-bold text-base hover:shadow-2xl transform hover:scale-105 transition-all shadow-lg"
                    onClick={handleDownload}
                >
                    <Download size={22} />
                    Descargar Versión Completa
                </button>
            </div>
        </div>
    );
};

export default App;