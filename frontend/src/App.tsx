import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useCouple } from './hooks/useCouple';
import { useTheme } from './hooks/useTheme';
import { Bubbles } from './components/Bubbles';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ErrorBoundary } from './components/ErrorBoundary';
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
import { MesGroupes } from './pages/MesGroupes';
import { Reglages } from './pages/Reglages';
import { DefiDuJour } from './pages/DefiDuJour';
import { Inviter } from './pages/Inviter';
import { InvitationBanner } from './components/InvitationBanner';
import { useGameInvitations } from './hooks/useGameInvitations';
import { useChatNotifications } from './hooks/useChatNotifications';
import { usePushNotifications } from './hooks/usePushNotifications';
import './App.styles.css';

function App() {
  const { user, loading, signOut } = useAuth();
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
  const { incoming, respond } = useGameInvitations(user.id, couple?.id ?? null);
  useChatNotifications(user.id, couple?.id ?? null);
  usePushNotifications(user.id);

  return (
    <BrowserRouter>
      <Bubbles />
      <ThemeSwitcher />
      <InvitationBanner invitations={incoming} onRespond={respond} />
      <div className="app-content">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/choix-mode" />} />
          <Route path="/choix-mode" element={<ChoixMode userId={user.id} />} />
          <Route path="/rejoindre-groupe" element={<RejoindreGroupe userId={user.id} />} />
          <Route path="/accueil" element={<Accueil mode={mode} userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/categorie/:category" element={<Categorie userId={user.id} coupleId={couple?.id ?? null} mode={mode} />} />
          {couple?.id && (
            <Route path="/inviter/:category" element={<Inviter userId={user.id} coupleId={couple.id} />} />
          )}
          <Route
            path="/session/:sessionId"
            element={<SessionPage userId={user.id} coupleId={couple?.id ?? null} mode={mode} />}
          />
          <Route path="/chat" element={<ChatPage userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/statistiques" element={<Statistiques userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/defi-discret" element={<DefiDiscret userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/installer" element={<InstallPage />} />
          <Route path="/mes-groupes" element={<MesGroupes userId={user.id} />} />
          <Route path="/reglages" element={<Reglages userId={user.id} onSignOut={signOut} />} />
          <Route path="/defi-du-jour" element={<DefiDuJour userId={user.id} />} />
        </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

export default App;
