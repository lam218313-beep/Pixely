import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// =============================================================================
// DATA STRUCTURES
// =============================================================================

export interface ContextBlock {
    id: string;
    label: string;
    text: string;
    selected: boolean;
    type: 'interview' | 'manual' | 'analysis';
}

export interface BrandVisualDNA {
    color_primary_name?: string;
    color_primary_hex?: string;
    color_secondary_name?: string;
    color_secondary_hex?: string;
    color_accent_name?: string;
    color_accent_hex?: string;
    default_style: 'natural' | 'vivid';
    default_lighting: string;
    default_mood: string;
    default_resolution: string;
    preferred_archetypes: string[];
    always_exclude: string[];
    brand_essence?: string;
    visual_keywords: string[];
    industry_leader_instagram?: string;
    is_configured: boolean;
}

export interface ImageBankItem {
    id: string;
    image_url: string;
    thumbnail_url?: string;
    category: 'reference' | 'product' | 'background' | 'lifestyle' | 'competitor';
    source: 'instagram_scrape' | 'manual_upload' | 'generated' | 'brand_assets';
    name?: string;
    is_favorite: boolean;
    usage_count: number;
}

export interface GenerationTemplate {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    category: 'product' | 'lifestyle' | 'promotional' | 'minimalist' | 'editorial' | 'seasonal';
    requires_product_image: boolean;
    requires_style_reference: boolean;
    recommended_model: string;
    default_aspect_ratio: string;
}

export interface GeneratedImage {
    id: string;
    image_url: string;
    aspect_ratio: string;
    resolution: string;
    model_used: string;
    is_selected: boolean;
    created_at: string;
    generation_time_ms?: number;
    thinking_images?: string[];
}

export interface StyleAnalysisComposition {
    camera_angle: string;
    shot_type: string;
    lens_style: string;
    aspect_ratio: string;
    focal_point: string;
}

export interface StyleAnalysisLighting {
    type: string;
    direction: string;
    quality: string;
    color_temperature: string;
}

export interface StyleAnalysisColors {
    primary: string;
    secondary: string;
    accent?: string;
    mood: string;
}

export interface StyleAnalysisStyle {
    aesthetic: string;
    mood: string;
    texture_emphasis: string;
    background_type: string;
}

export interface StyleAnalysis {
    scene_type: string;
    composition: StyleAnalysisComposition;
    lighting: StyleAnalysisLighting;
    color_palette: StyleAnalysisColors;
    style: StyleAnalysisStyle;
    archetype_suggestion: string;
    reconstruction_summary: string;
}

// =============================================================================
// STUDIO STATE
// =============================================================================

export interface StudioState {
    // META
    currentStep: number;
    totalSteps: number;
    isLoading: boolean;
    error?: string;

    // STEP 1: BRAND DNA (One-time setup per client)
    clientId: string;
    brandDNA?: BrandVisualDNA;
    isBrandDNAConfigured: boolean;

    // STEP 2: IMAGE BANK (One-time + incremental per client)
    imageBank: ImageBankItem[];
    imageBankLoaded: boolean;

    // STEP 3: TASK CONTEXT (Required - from Planning)
    taskId: string;  // REQUIRED - must come from planning
    taskData?: {
        id: string;
        title: string;
        format: string;
        selected_hook?: string;
        key_elements?: string[];
        dos?: string[];
        donts?: string[];
        strategic_purpose?: string;
        description?: string;
        execution_date?: string;
    };
    customPrompt: string;
    excludedTaskFields: string[];  // Fields user chose to exclude

    // STEP 4: REFERENCE SELECTION
    selectedStyleReferences: string[];  // IDs from image bank
    selectedProductImage?: string;  // ID from image bank (for high-fidelity)
    selectedTemplate?: GenerationTemplate;
    archetype: string;  // product_hero, lifestyle, promotional, minimalist, editorial
    aspectRatio: string;
    resolution: '1K' | '2K' | '4K';
    useProModel: boolean;
    cameraSettings: {
        angle?: string;
        shot?: string;
        lens?: string;
        perspective?: string;
    };
    // Copy Style feature
    referenceMode: 'visual' | 'copy_style';  // How to use reference images
    styleAnalysis?: StyleAnalysis;  // Result from analyzing a reference
    isAnalyzingStyle: boolean;  // Loading state for style analysis
    analyzedImageId?: string;  // ID of the image being analyzed

    // STEP 5: GENERATION RESULTS
    generatedImages: GeneratedImage[];
    isGenerating: boolean;
    selectedImageId?: string;  // Image approved by user

    // CREDITS
    credits: {
        total: number;
        used: number;
        available: number;
        loaded: boolean;
    };

    // LEGACY SUPPORT (for backwards compatibility)
    contextBlocks: ContextBlock[];
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: StudioState = {
    currentStep: 1,
    totalSteps: 5,
    isLoading: false,

    // Step 1
    clientId: '',
    isBrandDNAConfigured: false,

    // Step 2
    imageBank: [],
    imageBankLoaded: false,

    // Step 3
    taskId: '',
    customPrompt: '',
    excludedTaskFields: [],

    // Step 4
    selectedStyleReferences: [],
    archetype: 'lifestyle',
    aspectRatio: '1:1',
    resolution: '2K',
    useProModel: false,
    cameraSettings: {},
    referenceMode: 'visual',
    styleAnalysis: undefined,
    isAnalyzingStyle: false,
    analyzedImageId: undefined,

    // Step 5
    generatedImages: [],
    isGenerating: false,

    // Credits
    credits: {
        total: 0,
        used: 0,
        available: 0,
        loaded: false,
    },

    // Legacy
    contextBlocks: [],
};

// =============================================================================
// ACTIONS
// =============================================================================

type Action =
    // Navigation
    | { type: 'SET_STEP'; payload: number }
    | { type: 'NEXT_STEP' }
    | { type: 'PREV_STEP' }
    | { type: 'RESET_WIZARD' }
    
    // Loading states
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | undefined }
    
    // Step 1: Brand DNA
    | { type: 'SET_CLIENT'; payload: string }
    | { type: 'LOAD_BRAND_DNA'; payload: { dna?: BrandVisualDNA; isConfigured: boolean } }
    | { type: 'UPDATE_BRAND_DNA'; payload: Partial<BrandVisualDNA> }
    
    // Step 2: Image Bank
    | { type: 'LOAD_IMAGE_BANK'; payload: ImageBankItem[] }
    | { type: 'ADD_TO_IMAGE_BANK'; payload: ImageBankItem }
    | { type: 'REMOVE_FROM_IMAGE_BANK'; payload: string }
    | { type: 'TOGGLE_FAVORITE'; payload: { id: string; isFavorite: boolean } }
    
    // Step 3: Task Context (REQUIRED)
    | { type: 'SET_TASK'; payload: { taskId: string; taskData: any } }
    | { type: 'SET_CUSTOM_PROMPT'; payload: string }
    | { type: 'TOGGLE_TASK_FIELD'; payload: { field: string } }
    
    // Step 4: Reference Selection
    | { type: 'TOGGLE_STYLE_REFERENCE'; payload: string }
    | { type: 'SET_PRODUCT_IMAGE'; payload: string | undefined }
    | { type: 'SET_TEMPLATE'; payload: GenerationTemplate | undefined }
    | { type: 'SET_ARCHETYPE'; payload: string }
    | { type: 'SET_ASPECT_RATIO'; payload: string }
    | { type: 'SET_RESOLUTION'; payload: '1K' | '2K' | '4K' }
    | { type: 'SET_USE_PRO_MODEL'; payload: boolean }
    | { type: 'SET_CAMERA_SETTING'; payload: { key: 'angle' | 'shot' | 'lens' | 'perspective'; value: string | undefined } }
    | { type: 'RESET_CAMERA_SETTINGS' }
    // Copy Style feature
    | { type: 'SET_REFERENCE_MODE'; payload: 'visual' | 'copy_style' }
    | { type: 'SET_STYLE_ANALYSIS'; payload: { analysis: StyleAnalysis; imageId: string } }
    | { type: 'SET_ANALYZING_STYLE'; payload: boolean }
    | { type: 'CLEAR_STYLE_ANALYSIS' }
    | { type: 'APPLY_STYLE_ANALYSIS' }  // Apply analyzed settings to generation config
    
    // Step 5: Generation
    | { type: 'SET_GENERATING'; payload: boolean }
    | { type: 'ADD_GENERATED_IMAGE'; payload: GeneratedImage }
    | { type: 'SET_GENERATED_IMAGES'; payload: GeneratedImage[] }
    | { type: 'SELECT_IMAGE'; payload: string }
    | { type: 'APPROVE_IMAGE'; payload: string }
    
    // Credits
    | { type: 'SET_CREDITS'; payload: { total: number; used: number; available: number } }
    | { type: 'DEDUCT_CREDIT' }
    
    // Legacy support
    | { type: 'LOAD_CONTEXT_BLOCKS'; payload: ContextBlock[] }
    | { type: 'TOGGLE_BLOCK'; payload: { id: string; block?: ContextBlock } }
    | { type: 'SET_CUSTOM_CONTEXT'; payload: string }
    | { type: 'SET_INITIAL_DATA'; payload: { clientId: string; taskId?: string; taskData?: any } };

// =============================================================================
// REDUCER
// =============================================================================

const studioReducer = (state: StudioState, action: Action): StudioState => {
    switch (action.type) {
        // Navigation
        case 'SET_STEP':
            return { ...state, currentStep: action.payload };
        case 'NEXT_STEP':
            return { ...state, currentStep: Math.min(state.currentStep + 1, state.totalSteps) };
        case 'PREV_STEP':
            return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
        case 'RESET_WIZARD':
            return { ...initialState };
        
        // Loading
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        
        // Step 1: Brand DNA
        case 'SET_CLIENT':
            return { 
                ...state, 
                clientId: action.payload, 
                // Reset dependent state when client changes
                brandDNA: undefined,
                isBrandDNAConfigured: false,
                imageBank: [],
                imageBankLoaded: false,
                contextBlocks: [] 
            };
        case 'LOAD_BRAND_DNA':
            return { 
                ...state, 
                brandDNA: action.payload.dna,
                isBrandDNAConfigured: action.payload.isConfigured 
            };
        case 'UPDATE_BRAND_DNA':
            return { 
                ...state, 
                brandDNA: { ...state.brandDNA, ...action.payload } as BrandVisualDNA 
            };
        
        // Step 2: Image Bank
        case 'LOAD_IMAGE_BANK':
            return { ...state, imageBank: action.payload, imageBankLoaded: true };
        case 'ADD_TO_IMAGE_BANK':
            return { ...state, imageBank: [action.payload, ...state.imageBank] };
        case 'REMOVE_FROM_IMAGE_BANK':
            return { 
                ...state, 
                imageBank: state.imageBank.filter(img => img.id !== action.payload),
                selectedStyleReferences: state.selectedStyleReferences.filter(id => id !== action.payload),
                selectedProductImage: state.selectedProductImage === action.payload ? undefined : state.selectedProductImage
            };
        case 'TOGGLE_FAVORITE':
            return {
                ...state,
                imageBank: state.imageBank.map(img => 
                    img.id === action.payload.id 
                        ? { ...img, is_favorite: action.payload.isFavorite }
                        : img
                )
            };
        
        // Step 3: Task Context
        case 'SET_TASK':
            return { 
                ...state, 
                taskId: action.payload.taskId,
                taskData: action.payload.taskData,
                excludedTaskFields: [],  // Reset exclusions for new task
                // Set aspect ratio based on task format
                aspectRatio: getAspectRatioForFormat(action.payload.taskData?.format)
            };
        case 'SET_CUSTOM_PROMPT':
            return { ...state, customPrompt: action.payload };
        case 'TOGGLE_TASK_FIELD': {
            const field = action.payload.field;
            const isExcluded = state.excludedTaskFields.includes(field);
            return {
                ...state,
                excludedTaskFields: isExcluded
                    ? state.excludedTaskFields.filter(f => f !== field)
                    : [...state.excludedTaskFields, field]
            };
        }
        
        // Step 4: Reference Selection
        case 'TOGGLE_STYLE_REFERENCE': {
            const id = action.payload;
            const isSelected = state.selectedStyleReferences.includes(id);
            if (isSelected) {
                return {
                    ...state,
                    selectedStyleReferences: state.selectedStyleReferences.filter(ref => ref !== id)
                };
            } else if (state.selectedStyleReferences.length < 6) {  // Max 6 style refs
                return {
                    ...state,
                    selectedStyleReferences: [...state.selectedStyleReferences, id]
                };
            }
            return state;
        }
        case 'SET_PRODUCT_IMAGE':
            return { ...state, selectedProductImage: action.payload };
        case 'SET_TEMPLATE':
            return { ...state, selectedTemplate: action.payload };
        case 'SET_ARCHETYPE':
            return { ...state, archetype: action.payload };
        case 'SET_ASPECT_RATIO':
            return { ...state, aspectRatio: action.payload };
        case 'SET_RESOLUTION':
            return { ...state, resolution: action.payload };
        case 'SET_USE_PRO_MODEL':
            return { ...state, useProModel: action.payload };
        case 'SET_CAMERA_SETTING':
            return { 
                ...state, 
                cameraSettings: {
                    ...state.cameraSettings,
                    [action.payload.key]: action.payload.value
                }
            };
        case 'RESET_CAMERA_SETTINGS':
            return { ...state, cameraSettings: {} };
        
        // Copy Style feature
        case 'SET_REFERENCE_MODE':
            return { 
                ...state, 
                referenceMode: action.payload,
                // Clear analysis when switching modes
                styleAnalysis: action.payload === 'visual' ? undefined : state.styleAnalysis,
                analyzedImageId: action.payload === 'visual' ? undefined : state.analyzedImageId
            };
        case 'SET_STYLE_ANALYSIS':
            return { 
                ...state, 
                styleAnalysis: action.payload.analysis,
                analyzedImageId: action.payload.imageId,
                isAnalyzingStyle: false
            };
        case 'SET_ANALYZING_STYLE':
            return { ...state, isAnalyzingStyle: action.payload };
        case 'CLEAR_STYLE_ANALYSIS':
            return { 
                ...state, 
                styleAnalysis: undefined, 
                analyzedImageId: undefined,
                isAnalyzingStyle: false
            };
        case 'APPLY_STYLE_ANALYSIS': {
            // Apply the analyzed style settings to generation config
            if (!state.styleAnalysis) return state;
            const analysis = state.styleAnalysis;
            return {
                ...state,
                archetype: analysis.archetype_suggestion || state.archetype,
                aspectRatio: analysis.composition.aspect_ratio || state.aspectRatio,
                cameraSettings: {
                    angle: analysis.composition.camera_angle,
                    shot: analysis.composition.shot_type,
                    lens: analysis.composition.lens_style.toLowerCase().includes('standard') 
                        ? '50mm portrait' 
                        : analysis.composition.lens_style.toLowerCase().includes('wide')
                            ? '35mm'
                            : '85mm bokeh'
                }
            };
        }
        
        // Step 5: Generation
        case 'SET_GENERATING':
            return { ...state, isGenerating: action.payload };
        case 'ADD_GENERATED_IMAGE':
            return { 
                ...state, 
                generatedImages: [action.payload, ...state.generatedImages],
                isGenerating: false 
            };
        case 'SET_GENERATED_IMAGES':
            return { ...state, generatedImages: action.payload };
        case 'SELECT_IMAGE':
            return { ...state, selectedImageId: action.payload };
        case 'APPROVE_IMAGE':
            return { 
                ...state, 
                selectedImageId: action.payload,
                generatedImages: state.generatedImages.map(img => ({
                    ...img,
                    is_selected: img.id === action.payload
                }))
            };
        
        // Legacy support
        case 'LOAD_CONTEXT_BLOCKS':
            return { ...state, contextBlocks: action.payload };
        case 'TOGGLE_BLOCK': {
            const { id, block } = action.payload;
            const exists = state.contextBlocks.find(b => b.id === id);
            if (exists) {
                return {
                    ...state,
                    contextBlocks: state.contextBlocks.map(b =>
                        b.id === id ? { ...b, selected: !b.selected } : b
                    ),
                };
            } else if (block) {
                return {
                    ...state,
                    contextBlocks: [...state.contextBlocks, { ...block, selected: true }]
                };
            }
            return state;
        }
        case 'SET_CUSTOM_CONTEXT':
            return { ...state, customPrompt: action.payload };
        case 'SET_INITIAL_DATA':
            return {
                ...state,
                clientId: action.payload.clientId,
                taskId: action.payload.taskId || '',
                taskData: action.payload.taskData,
                excludedTaskFields: [],
                aspectRatio: getAspectRatioForFormat(action.payload.taskData?.format),
                currentStep: 1
            };

        // Credits
        case 'SET_CREDITS':
            return {
                ...state,
                credits: {
                    ...action.payload,
                    loaded: true,
                }
            };
        case 'DEDUCT_CREDIT':
            return {
                ...state,
                credits: {
                    ...state.credits,
                    used: state.credits.used + 1,
                    available: Math.max(0, state.credits.available - 1),
                }
            };
        
        default:
            return state;
    }
};

// =============================================================================
// HELPERS
// =============================================================================

function getAspectRatioForFormat(format?: string): string {
    const formatMap: Record<string, string> = {
        'post': '1:1',
        'story': '9:16',
        'reel': '9:16',
        'cover': '16:9',
        'portrait': '4:5',
        'landscape': '3:2',
    };
    return formatMap[format || 'post'] || '1:1';
}

// =============================================================================
// CONTEXT
// =============================================================================

interface StudioContextType {
    state: StudioState;
    dispatch: React.Dispatch<Action>;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(studioReducer, initialState);

    return (
        <StudioContext.Provider value={{ state, dispatch }}>
            {children}
        </StudioContext.Provider>
    );
};

export const useStudio = () => {
    const context = useContext(StudioContext);
    if (!context) {
        throw new Error('useStudio must be used within a StudioProvider');
    }
    return context;
};

// =============================================================================
// CUSTOM HOOKS FOR COMMON OPERATIONS
// =============================================================================

export const useStudioValidation = () => {
    const { state } = useStudio();
    
    return {
        canProceedToStep2: state.isBrandDNAConfigured || state.clientId !== '',
        canProceedToStep3: state.imageBankLoaded,
        canProceedToStep4: state.taskId !== '',  // Task is REQUIRED
        canProceedToStep5: state.taskId !== '' && state.selectedStyleReferences.length > 0,
        canGenerate: state.taskId !== '' && !state.isGenerating && state.credits.available > 0,
        hasCredits: state.credits.available > 0,
        creditsLoaded: state.credits.loaded,
        isTaskRequired: true,  // Always true - generation requires a task
    };
};
