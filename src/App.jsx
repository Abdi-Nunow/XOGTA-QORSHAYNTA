import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import DistrictDashboard from './pages/DistrictDashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Loading Xogta Qorshaynta...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return user.role === 'ADMIN' ? <AdminDashboard /> : <DistrictDashboard />;
}

export default App;
