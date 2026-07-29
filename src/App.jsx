import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { I18nProvider } from '@/lib/i18n';
import ScrollToTop from './components/ScrollToTop';
import SiteLayout from '@/components/layout/SiteLayout';
import AdminLayout from '@/components/admin/AdminLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Learn from '@/pages/Learn';
import Pollution from '@/pages/Pollution';
import Assistant from '@/pages/Assistant';
import Finder from '@/pages/Finder';
import Profile from '@/pages/Profile';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import CheckIn from '@/pages/CheckIn';
import Rewards from '@/pages/Rewards';
import Challenges from '@/pages/Challenges';
import Leaderboard from '@/pages/Leaderboard';
import Settings from '@/pages/Settings';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UserManagement from '@/pages/admin/UserManagement';
import CentreManagement from '@/pages/admin/CentreManagement';
import QRManagement from '@/pages/admin/QRManagement';
import Messages from '@/pages/admin/Messages';
import StaffCheckIn from '@/pages/admin/StaffCheckIn';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();
  const location = useLocation();

  if (AUTH_ROUTES.includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/pollution" element={<Pollution />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/finder" element={<Finder />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/centres" element={<CentreManagement />} />
        <Route path="/admin/qr" element={<QRManagement />} />
        <Route path="/admin/check-in" element={<StaffCheckIn />} />
        <Route path="/admin/messages" element={<Messages />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClientInstance}>
        <I18nProvider>
          <AuthProvider>
            <ScrollToTop />
            <AuthenticatedApp />
          </AuthProvider>
        </I18nProvider>
        <Toaster />
      </QueryClientProvider>
    </Router>
  )
}

export default App