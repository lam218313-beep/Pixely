/**
 * Pixely Partners - Lab View
 * 
 * Main view for Q1-Q10 Social Media Analysis with Premium Card Design
 * Clean design matching the original Lab project
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { useAnalysisContext } from '../hooks/useAnalysis';
import {
  CardLabsQ1_Emotions,
  CardLabsQ2_Personality,
  CardLabsQ3_TopTopics,
  CardLabsQ3_ConclusionGauge,
  CardLabsQ4_NarrativeFrames,
  CardLabsQ5_InfluencerRanking,
  CardLabsQ6_OpportunitiesMatrix,
  CardLabsQ7_SentimentBars,
  CardLabsQ8_TemporalEvolution,
  CardLabs_SemanticDistribution
} from './lab';
import { WorkflowStepper } from './WorkflowStepper';
import { AnimatedHeaderCard } from './AnimatedHeaderCard';
export const LabView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { data, isLoading } = useAnalysisContext();

  const hasData = data?.Q1 && data.Q1.emociones?.some((e: any) => e.value > 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  // Empty state - no data yet
  if (!hasData) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-primary-50 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Layers size={40} className="text-primary-300" />
          </div>
          <h3 className="text-2xl font-bold text-gray-400 mb-2">Pixely Lab</h3>
          <p className="text-sm text-gray-400">
            No hay análisis disponible. Sube archivos y ejecuta el análisis desde el panel de Partners.
          </p>
        </div>
      </div>
    );
  }

  // Main content with data
  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <main className="w-full p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Workflow Stepper */}
          <WorkflowStepper currentStep={3} onNavigate={onNavigate} />

          {/* Header Card */}
          <AnimatedHeaderCard
            supertitle="Fase 3: Inteligencia"
            title="Lab."
            subtitle="Análisis de mercado."
          />

          {/* Grid Layout - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-8">

            {/* 1. TOP TOPICS SECTION */}
            <div className="col-span-12 lg:col-span-8">
              <CardLabsQ3_TopTopics data={data.Q3!} />
            </div>

            {/* 2. CONCLUSION GAUGE */}
            <div className="col-span-12 lg:col-span-4">
              <CardLabsQ3_ConclusionGauge data={data.Q3!} />
            </div>

            {/* 3. Main Content Area (Left col-8) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 md:gap-6">

              {/* Radar Charts (Side by Side on Desktop) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="h-auto min-h-[350px] md:min-h-[400px] lg:h-[450px]">
                  <CardLabsQ1_Emotions data={data.Q1!} />
                </div>
                <div className="h-auto min-h-[350px] md:min-h-[400px] lg:h-[450px]">
                  <CardLabsQ2_Personality data={data.Q2!} />
                </div>
              </div>

              {/* Opportunities Matrix */}
              <div className="h-auto min-h-[300px] md:min-h-[350px] lg:h-[380px]">
                <CardLabsQ6_OpportunitiesMatrix data={data.Q6!} />
              </div>

              {/* Temporal Evolution */}
              <div className="h-auto min-h-[400px] md:min-h-[450px] lg:h-[480px]">
                <CardLabsQ8_TemporalEvolution data={data.Q8!} />
              </div>
            </div>

            {/* 4. Right Sidebar (Right col-4) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-6">

              {/* Narrative Frames */}
              <div className="h-auto min-h-[300px] md:min-h-[330px] lg:h-[360px]">
                <CardLabsQ4_NarrativeFrames data={data.Q4!} />
              </div>

              {/* Influencer Ranking */}
              <div className="h-auto min-h-[400px] md:min-h-[450px] lg:h-[480px]">
                <CardLabsQ5_InfluencerRanking data={data.Q5!} />
              </div>

              {/* Sentiment Bars */}
              <div className="h-auto min-h-[350px] md:min-h-[400px] lg:h-[450px]">
                <CardLabsQ7_SentimentBars data={data.Q7!} />
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
