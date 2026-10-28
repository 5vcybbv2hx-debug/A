import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Willkommen from '@/pages/Willkommen';
import Schrank from '@/pages/Schrank';
import Upload from '@/pages/Upload';
import Studio from '@/pages/Studio';
import Heute from '@/pages/Heute';
import Galerie from '@/pages/Galerie';
import Packlisten from '@/pages/Packlisten';
import Profil from '@/pages/Profil';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Der Erststart steht für sich, ohne Navigationsleiste. */}
      <Route path="/start" element={<Erststart />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Willkommen />} />
        <Route path="/heute" element={<Heute />} />
        <Route path="/schrank" element={<Schrank />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/galerie" element={<Galerie />} />
        <Route path="/packlisten" element={<Packlisten />} />
        <Route path="/profil" element={<Profil />} />
      </Route>
      {/* Add your page Route elements here */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App