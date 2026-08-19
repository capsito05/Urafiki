import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useCouple } from './hooks/useCouple';
import { useTheme } from './hooks/useTheme';
import { Bubbles } from './components/Bubbles';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthPage } from './pages/Auth';
import { ChoixMode } from './pages/ChoixMode';
import { Accueil } from './pages/Accueil';
import { InvitationBanner } from './components/InvitationBanner';
import { useGameInvitations } from './hooks/useGameInvitations';
import { useChatNotifications } from './hooks/useChatNotifications';
import { usePushNotifications } from './hooks/usePushNotifications';
import './App.styles.css';

// Pages chargées à la demande (code-splitting) : réduit le bundle initial,
// ces écrans n'étant pas nécessaires au tout premier chargement.
const RejoindreGroupe = lazy(() => import('./pages/RejoindreGroupe').then((m) => ({ default: m.RejoindreGroupe })));
const Categorie = lazy(() => import('./pages/Categorie').then((m) => ({ default: m.Categorie })));
const SessionPage = lazy(() => import('./pages/Session').then((m) => ({ default: m.SessionPage })));
const ChatPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ChatPage })));
const Statistiques = lazy(() => import('./pages/Statistiques').then((m) => ({ default: m.Statistiques })));
const DefiDiscret = lazy(() => import('./pages/DefiDiscret').then((m) => ({ default: m.DefiDiscret })));
const InstallPage = lazy(() => import('./pages/InstallPage').then((m) => ({ default: m.InstallPage })));
const MesGroupes = lazy(() => import('./pages/MesGroupes').then((m) => ({ default: m.MesGroupes })));
const Reglages = lazy(() => import('./pages/Reglages').then((m) => ({ default: m.Reglages })));
const DefiDuJour = lazy(() => import('./pages/DefiDuJour').then((m) => ({ default: m.DefiDuJour })));
const Inviter = lazy(() => import('./pages/Inviter').then((m) => ({ default: m.Inviter })));

function App() {
  const { user, loading, signOut } = useAuth();
  const { couple } = useCouple(user?.id ?? null);
  useTheme();
  const { incoming, respond } = useGameInvitations(user?.id ?? null, couple?.id ?? null);
  useChatNotifications(user?.id ?? null, couple?.id ?? null);
  usePushNotifications(user?.id ?? null);

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
      <InvitationBanner invitations={incoming} onRespond={respond} />
      <div className="app-content">
        <ErrorBoundary>
        <Suspense fallback={<div className="app-loading">Chargement...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/choix-mode" />} />
          <Route path="/choix-mode" element={<ChoixMode userId={user.id} />} />
          <Route path="/rejoindre-groupe" element={<RejoindreGroupe userId={user.id} />} />
          <Route path="/accueil" element={<Accueil mode={mode} userId={user.id} coupleId={couple?.id ?? null} />} />
          <Route path="/categorie/:category" element={<Categorie userId={user.id} coupleId={couple?.id ?? null} mode={mode} />} />
          {couple?.id && (
            <Route path="/inviter/:category" element={<Inviter userId={user.id} coupleId={couple.id} mode={mode} />} />
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
        </Suspense>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

export default App;
