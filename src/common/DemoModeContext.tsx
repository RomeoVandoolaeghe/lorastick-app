import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DemoModeContextType {
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

// Global variable to hold the current demoMode value
let _demoModeValue = false;
export const getDemoModeValue = () => _demoModeValue;

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const [demoMode, setDemoModeState] = useState(false);
  // Keep the global variable in sync
  const setDemoMode = (value: boolean) => {
    _demoModeValue = value;
    setDemoModeState(value);
  };
  // Initialize global value on mount
  React.useEffect(() => { _demoModeValue = demoMode; }, [demoMode]);
  return (
    <DemoModeContext.Provider value={{ demoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}; 