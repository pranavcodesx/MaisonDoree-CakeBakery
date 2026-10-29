import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Shell from './components/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import Cakes from './pages/Cakes.jsx';
import Categories from './pages/Categories.jsx';
import Customers from './pages/Customers.jsx';
import Coupons from './pages/Coupons.jsx';
import Reviews from './pages/Reviews.jsx';
import Delivery from './pages/Delivery.jsx';
import Payments from './pages/Payments.jsx';
import Inbox from './pages/Inbox.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Website from './pages/Website.jsx';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="cakes" element={<Cakes />} />
        <Route path="categories" element={<Categories />} />
        <Route path="customers" element={<Customers />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="delivery" element={<Delivery />} />
        <Route path="payments" element={<Payments />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="website" element={<Website />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
