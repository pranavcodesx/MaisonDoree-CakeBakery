import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Builder from './pages/Builder.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Track from './pages/Track.jsx';
import Account from './pages/Account.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="builder" element={<Builder />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:orderNum/success" element={<OrderSuccess />} />
        <Route path="track" element={<Track />} />
        <Route path="track/:orderNum" element={<Track />} />
        <Route path="account" element={<Account />} />
        <Route path="account/:tab" element={<Account />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
