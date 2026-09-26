import React, { useState, useEffect, Component, ErrorInfo, ReactNode, Suspense, lazy } from 'react';
import { LoginForm, WorkflowVisual, SuccessAnimation } from './components/LoginComponents.tsx';
import { Sidebar } from './components/Sidebar.tsx';
// import { RightSidebar } from './components/RightSidebar.tsx';
import { AlertCircle, Calendar, Star, Zap, Shield, Crown } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { AnalysisProvider } from './hooks/useAnalysis.tsx';
import { TasksProvider } from './hooks/useTasks.tsx';
// StudioProvider/ImageStudioPage/ImageGeneratorPage moved to _sandbox_ai_studio/ —
// "Estudio IA" is retired, AI image generation now happens in the local Magnific workflow.

// Lazy-loaded views for better performance
const LabView = lazy(() => import('./components/LabView.tsx').then(m => ({ default: m.LabView })));
const TasksView = lazy(() => import('./components/TasksView.tsx').then(m => ({ default: m.TasksView })));
const DashboardView = lazy(() => import('./components/DashboardView.tsx').then(m => ({ default: m.DashboardView })));
const WikiView = lazy(() => import('./components/WikiView.tsx'));
const PartnersView = lazy(() => import('./components/PartnersView.tsx'));
const AdminPanel = lazy(() => import('./components/AdminPanel.tsx').then(m => ({ default: m.AdminPanel })));
const InterviewView = lazy(() => import('./components/InterviewView.tsx').then(m => ({ default: m.InterviewView })));
const BrandView = lazy(() => import('./components/BrandView.tsx').then(m => ({ default: m.BrandView })));
const ContentPlanView = lazy(() => import('./components/ContentPlanView.tsx').then(m => ({ default: m.ContentPlanView })));
const StrategyView = lazy(() => import('./components/StrategyView.tsx').then(m => ({ default: m.StrategyView })));
const BenefitsView = lazy(() => import('./components/BenefitsView.tsx').then(m => ({ default: m.BenefitsView })));

// =============================================================================
// ERROR BOUNDARY
// =============================================================================
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
              <AlertCircle size={40} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Algo salió mal</h3>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message || 'Error desconocido'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-all"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Transition States
type FlowState = 'LOGIN_ACTIVE' | 'LOGIN_EXITING' | 'ANIMATION_ENTRY' | 'ANIMATION_EXITING' | 'DASHBOARD_ACTIVE';
type ViewType = 'dashboard' | 'partners' | 'lab' | 'work' | 'wiki' | 'interview' | 'brand' | 'strategy' | 'benefits';

// ... imports


// ... ErrorBoundary ...

const PlanBadge = ({ plan, isAdmin }: { plan?: string, isAdmin?: boolean }) => {
  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-fuchsia-100 border border-purple-200 text-purple-700 shadow-sm pointer-events-auto backdrop-blur-md">
        <Crown size={14} className="fill-purple-700 text-purple-700" />
        <span className="text-xs font-bold tracking-widest uppercase">Admin</span>
      </div>
    );
  }

  const planMap: Record<string, { label: string, color: string, icon: any, fill?: string }> = {
    'starter': { label: 'Emprendedor', color: 'bg-emerald-50/90 border-emerald-200 text-emerald-700', icon: Star, fill: 'fill-emerald-700 text-emerald-700' },
    'growth': { label: 'Agencia', color: 'bg-blue-50/90 border-blue-200 text-blue-700', icon: Zap, fill: 'fill-blue-700 text-blue-700' },
    'scale': { label: 'Enterprise', color: 'bg-slate-900 border-slate-700 text-yellow-400', icon: Shield, fill: 'fill-yellow-400 text-yellow-400' },
    'free_trial': { label: 'Prueba Gratuita', color: 'bg-amber-50/90 border-amber-200 text-amber-700', icon: Zap, fill: 'fill-amber-700 text-amber-700' },
  };

  const current = plan ? (planMap[plan] || planMap['free_trial']) : planMap['free_trial'];
  const Icon = current.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm pointer-events-auto backdrop-blur-md ${current.color}`}>
      <Icon size={14} className={current.fill} />
      <span className="text-xs font-bold tracking-widest uppercase">{current.label}</span>
    </div>
  );
};

// Inner App component that uses auth context
const AppContent: React.FC = () => {
  const { user: authUser, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const [flow, setFlow] = useState<FlowState>('LOGIN_ACTIVE');
  const [displayUser, setDisplayUser] = useState('');

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  // State to track sidebar hover/expansion
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  // Mobile sidebar states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  // const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  // ... activeView ...
  const [activeView, setActiveView] = useState<string>('partners');
  const [viewCounter, setViewCounter] = useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Navigation handler that resets scroll
  const handleNavigate = (view: string) => {
    // Reset all scrollable containers
    document.querySelectorAll('.overflow-y-auto, .custom-scrollbar').forEach(el => {
      el.scrollTop = 0;
    });
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    setViewCounter(prev => prev + 1);
    setActiveView(view);
    // Close mobile sidebar on navigation
    setLeftSidebarOpen(false);
  };


  // Check for existing session on mount
  useEffect(() => {
    if (isAuthenticated && authUser && !authLoading) {
      // Skip animation if already authenticated
      setDisplayUser(authUser.email.split('@')[0]);
      setFlow('DASHBOARD_ACTIVE');
      setActiveView('partners');

      // Check if tutorial has been seen
      const seen = localStorage.getItem('pixely_tutorial_seen_v2');
      if (!seen) {
        // Small delay to let dashboard load
        setTimeout(() => setShowTutorial(true), 1000);
      }
    }
  }, [isAuthenticated, authUser, authLoading]);

  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('pixely_tutorial_seen_v2', 'true');
  };

  // Handler for logout
  const handleLogout = () => {
    logout();
    setDisplayUser('');
    setFlow('LOGIN_ACTIVE');
  };

  // ... handleLogin ...
  const handleLogin = (username: string) => {
    setDisplayUser(username);
    setFlow('LOGIN_EXITING');
    setActiveView('partners');

    // Flow: LOGIN_EXITING -> ANIMATION_ENTRY -> ANIMATION_EXITING -> DASHBOARD_ACTIVE
    setTimeout(() => {
      setFlow('ANIMATION_ENTRY');
    }, 500);

    setTimeout(() => {
      setFlow('ANIMATION_EXITING');
    }, 2500);

    setTimeout(() => {
      setFlow('DASHBOARD_ACTIVE');
    }, 3500);

    // Check tutorial on fresh login too
    const seen = localStorage.getItem('pixely_tutorial_seen_v2');
    if (!seen) {
      setTimeout(() => setShowTutorial(true), 4000); // Wait for all animations
    }
  };

  // ...

  // Content Renderer Logic
  const renderContent = () => {
    // Use counter-based key to force remount on every navigation
    const viewKey = `${activeView}-${viewCounter}`;

    switch (activeView) {
      case 'partners':
        return (
          <ErrorBoundary key={viewKey}>
            <PartnersView onShowTutorial={() => setShowTutorial(true)} />
          </ErrorBoundary>
        );
      case 'interview':
        return (
          <ErrorBoundary key={viewKey}>
            <InterviewView onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case 'brand':
        return (
          <ErrorBoundary key={viewKey}>
            <BrandView onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case 'lab':
        return (
          <ErrorBoundary key={viewKey}>
            <LabView onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case 'strategy':
        return (
          <ErrorBoundary key={viewKey}>
            <StrategyView onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case 'benefits':
        return (
          <ErrorBoundary key={viewKey}>
            <BenefitsView onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case 'work':
        return (
          <ErrorBoundary key={viewKey}>
            <TasksView onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      case 'wiki':
        return (
          <ErrorBoundary key={viewKey}>
            <WikiView />
          </ErrorBoundary>
        );
      case 'admin':
        return (
          <ErrorBoundary key={viewKey}>
            <AdminPanel onNavigate={handleNavigate} />
          </ErrorBoundary>
        );
      // case 'dashboard': Removed
      // case 'content-plan': Keeping just in case but seems redundant with 'work' now? Stepper has 'work' for Planificación.Sidebar has 'work'. So content-plan is unused by stepper/sidebar.
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-hidden relative">

      {/* 1. LOGIN VIEW */}
      {(flow === 'LOGIN_ACTIVE' || flow === 'LOGIN_EXITING') && (
        <div
          className={`absolute inset-0 z-50 flex h-screen w-full transition-all duration-500 ease-in-out ${flow === 'LOGIN_EXITING' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
            }`}
        >
          {/* Left Side */}
          <div className="hidden lg:flex w-1/2 bg-brand-bg relative items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-primary-100/50 rounded-full blur-[100px] animate-pulse"></div>
              <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[100px]"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <WorkflowVisual />
              <div className="mt-12 text-center max-w-md px-6">
                <h2 className="text-2xl font-bold text-brand-dark mb-3">Estrategia integrada</h2>
                <p className="text-gray-500 leading-relaxed">
                  Transforma datos dispersos en estrategias de alto impacto con nuestra plataforma de análisis semántico.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 md:p-12 relative">
            <LoginForm onLogin={handleLogin} />
          </div>
        </div>
      )}

      {/* 2. SUCCESS ANIMATION OVERLAY */}
      {(flow === 'ANIMATION_ENTRY' || flow === 'ANIMATION_EXITING') && (
        <SuccessAnimation
          username={displayUser}
          isExiting={flow === 'ANIMATION_EXITING'}
        />
      )}

      {/* 3. DASHBOARD LAYOUT (Final State) */}
      {flow === 'DASHBOARD_ACTIVE' && (
        <div className="flex h-screen w-full bg-brand-bg animate-[fade-in_0.8s_ease-out] overflow-hidden">

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            aria-label="Abrir menú"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Mobile Overlay */}
          {leftSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setLeftSidebarOpen(false)}
              role="button"
              aria-label="Cerrar menú de navegación"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                  e.preventDefault();
                  setLeftSidebarOpen(false);
                }
              }}
            />
          )}

          {/* Sidebar Left (Responsive) */}
          <div className={`
                fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
                ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:relative lg:translate-x-0 lg:z-0
                ${sidebarExpanded ? 'lg:w-[260px]' : 'lg:w-[88px]'}
                w-[280px] sm:w-[300px]
                shrink-0 h-full
            `}>
            <Sidebar
              isExpanded={sidebarExpanded}
              setIsExpanded={setSidebarExpanded}
              activeView={activeView}
              setActiveView={handleNavigate}
              onLogout={handleLogout}
            />
          </div>

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative transition-all duration-300">

            {/* Mobile Header (Hamburger) - To be added if not present in Views */}
            {/* For now, assuming Views have headers or we add a global mobile trigger here if needed. 
                Sidebar usually has the trigger, but on mobile it's hidden. 
                We need a way to open it. Adding a temporary mobile trigger here or inside Sidebar logic. 
            */}

            {/* Center Content */}
            <main className="flex-1 flex flex-col relative h-full overflow-hidden p-4 lg:py-4 lg:pr-4">

              {/* Floating Plan Badge */}
              <div className="absolute top-8 right-8 lg:top-8 lg:right-8 z-50 pointer-events-none hidden sm:block">
                <PlanBadge plan={authUser?.plan} isAdmin={authUser?.isAdmin} />
              </div>

              {/* Dynamic Card Container */}
              <div key={activeView} ref={contentRef} className="flex-1 min-h-0 bg-transparent rounded-[30px] lg:rounded-[40px] relative overflow-y-auto group flex flex-col items-stretch justify-start mb-0">

                {/* Subtle grid background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
                  style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                </div>

                {/* Render Content based on activeView */}
                <div className="relative z-10 flex-1 flex flex-col">
                  {renderContent()}
                </div>
              </div>
            </main>

            {/* Right Sidebar Removed */}
          </div>
        </div>
      )}


    </div>
  );
};

// Main App component with providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <TasksProvider>
          <AppContent />
        </TasksProvider>
      </AnalysisProvider>
    </AuthProvider>
  );
};

export default App;