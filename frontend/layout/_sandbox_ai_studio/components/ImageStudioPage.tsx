import React, { useEffect } from 'react';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { StudioLayout } from './studio/StudioLayout';
import { getStudioCredits } from '../services/api';
import { 
    BrandDNAStep, 
    ImageBankStep, 
    TaskSelectorStep, 
    ReferenceSelectorStep, 
    GenerationStep 
} from './studio/steps';

const WizardContent = () => {
    const { state } = useStudio();

    return (
        <>
            {state.currentStep === 1 && <BrandDNAStep />}
            {state.currentStep === 2 && <ImageBankStep />}
            {state.currentStep === 3 && <TaskSelectorStep />}
            {state.currentStep === 4 && <ReferenceSelectorStep />}
            {state.currentStep === 5 && <GenerationStep />}
        </>
    );
}

export const ImageStudioPage: React.FC = () => {
    const { user } = useAuth();
    const { dispatch } = useStudio();

    // Load credits on mount
    useEffect(() => {
        const loadCredits = async () => {
            if (!user?.tenantId) return;
            
            // Admins get unlimited credits
            if (user.isAdmin) {
                dispatch({ 
                    type: 'SET_CREDITS', 
                    payload: { total: 9999, used: 0, available: 9999 } 
                });
                return;
            }

            try {
                const result = await getStudioCredits(user.tenantId);
                dispatch({ 
                    type: 'SET_CREDITS', 
                    payload: {
                        total: result.data.total_credits,
                        used: result.data.used_credits,
                        available: result.data.available_credits,
                    }
                });
            } catch (err) {
                console.error('Error loading studio credits:', err);
                // Default to 0 credits if fetch fails
                dispatch({ 
                    type: 'SET_CREDITS', 
                    payload: { total: 0, used: 0, available: 0 } 
                });
            }
        };

        loadCredits();
    }, [user?.tenantId, dispatch]);

    return (
        <StudioLayout>
            <WizardContent />
        </StudioLayout>
    );
};
