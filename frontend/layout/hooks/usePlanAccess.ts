/**
 * usePlanAccess Hook
 *
 * Subscription-tier gating has been removed — every authenticated user now
 * has access to every feature (the backend no longer has a concept of
 * plans). Kept as a hook, unchanged shape, so existing callers don't need
 * to be rewritten one by one.
 */

interface PlanAccessResult {
    hasAccess: boolean;
    requiredPlan: string;
    requiredPlanName: string;
    currentPlan: string;
    currentPlanName: string;
}

export function usePlanAccess(_feature: string): PlanAccessResult {
    return {
        hasAccess: true,
        requiredPlan: 'none',
        requiredPlanName: 'Sin restricción',
        currentPlan: 'none',
        currentPlanName: 'Sin restricción',
    };
}

export function useBenefitAccess(_benefitId: string): PlanAccessResult & { isGranted: boolean } {
    return {
        hasAccess: true,
        requiredPlan: 'none',
        requiredPlanName: 'Sin restricción',
        currentPlan: 'none',
        currentPlanName: 'Sin restricción',
        isGranted: true,
    };
}

export default usePlanAccess;
