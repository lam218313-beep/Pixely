import React from 'react';
import { PixelyTutorial } from './components/PixelyTutorial';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
        <PixelyTutorial />
    </div>
  );
};

export default App;