import React, { useState, useEffect } from 'react';
import useGlobalState from '@/lib/global_state';

const LOADING_PHRASES = [
  "Rendering timeline...",
  "Syncing audio stems...",
  "Applying custom LUTs...",
  "Allocating resources...",
  "Preparing workspace...",
  "Connecting to peers...",
  "Compiling preview...",
  "Loading assets...",
  "Please wait..."
];

export const GlobalLoader = () => {
  const theme = useGlobalState(state => state.theme);
  const [phrase, setPhrase] = useState(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme === 'dark' ? '#0a0a0a' : '#f9fafb',
      color: theme === 'dark' ? '#ffffff' : '#111827',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
       <img 
         src="/ensemble_lg.svg" 
         alt="Ensemble"
         style={{ 
           width: 48, 
           height: 48, 
           filter: theme === 'light' ? 'invert(1)' : 'none', 
           marginBottom: 24, 
           animation: 'pulse 1.5s infinite ease-in-out' 
         }} 
       />
       <div style={{ 
          fontSize: 15, 
          fontWeight: 600, 
          letterSpacing: 0.5, 
          color: theme === 'dark' ? '#a1a1aa' : '#52525b',
          animation: 'fadeText 1.2s infinite alternate ease-in-out'
       }}>
          {phrase}
       </div>
       <style>{`
         @keyframes pulse {
           0% { opacity: 0.4; transform: scale(0.95); }
           50% { opacity: 1; transform: scale(1.05); }
           100% { opacity: 0.4; transform: scale(0.95); }
         }
         @keyframes fadeText {
           0% { opacity: 0.5; }
           100% { opacity: 1; }
         }
       `}</style>
    </div>
  );
};
