import React from 'react';
import { MultiStepForm } from './components/MultiStepForm';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-ink font-sans flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-7xl">
         <MultiStepForm />
      </div>
    </div>
  );
};

export default App;