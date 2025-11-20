import React from 'react';
import FlashcardManager from './components/FlashcardManager';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <div className="App">
          <FlashcardManager />
        </div>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
