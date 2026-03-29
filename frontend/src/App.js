import { useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkspacePage from './pages/WorkspacePage';
import Header from './components/Header';
import CommandBar from './components/CommandBar';
import { MolLensProvider } from './context/MolLensContext';

function ScrollToTop() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  return null;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="app-layout">
      <ScrollToTop />
      <CommandBar />
      {location.pathname === '/workspace' && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <MolLensProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MolLensProvider>
  );
}

export default App;
