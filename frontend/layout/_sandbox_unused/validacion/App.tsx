import React from 'react';
import { ValidationKanban } from './components/ValidationKanban';

const ValidationApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      <main className="w-full p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Content Area */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* Full Width Kanban Board */}
            <ValidationKanban />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ValidationApp;