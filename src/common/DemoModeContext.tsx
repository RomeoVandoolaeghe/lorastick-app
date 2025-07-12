import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DemoModeContextType {
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const [demoMode, setDemoMode] = useState(false);
  return (
    <DemoModeContext.Provider value={{ demoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}; 