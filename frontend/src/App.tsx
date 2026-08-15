import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useCouple } from './hooks/useCouple';
import { useTheme } from './hooks/useTheme';
import { Bubbles } from './components/Bubbles';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { AuthPage } from './pages/Auth';
import { ChoixMode } from './pages/ChoixMode';
import { RejoindreGroupe } from './pages/RejoindreGroupe';
import { Accueil } from './pages/Accueil';
import { Categorie } from './pages/Categorie';
import { SessionPage } from './pages/Session';
import { ChatPage } from './pages/Chat';
import { Statistiques } from './pages/Statistiques';
import { DefiDiscret } from './pages/DefiDiscret';
import { InstallPage } from './pages/InstallPage';
import './App.styles.css';

function App() {
  const { user, loading } = useAuth();
  const { couple } = useCouple(user?.id ?? null);
  useTheme();

  if (loading) return <div className="app-loading">Chargement...</div>;

  if (!user) {
    return (
      <>
        <Bubbles />
        <ThemeSwitcher />
        <div className="app-content">
          <AuthPage />
        </div>
      </>
    );
  }

  const mode = couple?.mode ?? 'solo';

  return (
    <BrowserRouter>
      <Bubbles />
      <ThemeSwitcher />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/choix-mode" />} />
          <Route path="/choix-mode" element={<ChoixMode userId={user.id} />} />
          <Route path="/rejoindre-groupe" element={<RejoindreGroupe userId={user.id} />} />
          <Route path="/accueil" element={<Accueil mode={mode} />} />
          <Route path="/categorie/:category" element={<Categorie userId={user.id} coupleId={couple?.id ?? null} mode={mode} />} />
          <Route path="/session/:sessionId" element={<SessionPage userId={user.id} pseudos={{}} />} />
          <Route path="/chat" element={<ChatPage userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/statistiques" element={<Statistiques userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/defi-discret" element={<DefiDiscret userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/installer" element={<InstallPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
