import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import OrderDetail from "./pages/OrderDetail";
import Orders from "./pages/Orders";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";
import { isAuthenticated } from "./auth";

function RequireAuth({ children }: { children: JSX.Element }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
        <Route path="orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
        <Route path="orders" element={<RequireAuth><Orders /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
      </Route>
    </Routes>
  );
}
