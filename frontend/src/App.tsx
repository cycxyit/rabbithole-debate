import React from 'react';
import SearchView from './components/SearchView';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <SearchView />
      </div>
    </AuthProvider>
  );
}

export default App; 