import React from 'react';
import FlashcardManager from './components/FlashcardManager';
import { AppProvider } from './context/AppContext';
import './App.css';

const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="App">
        <FlashcardManager />
      </div>
    </AppProvider>
  );
};

export default App;
