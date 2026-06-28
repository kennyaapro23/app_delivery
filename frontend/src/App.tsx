import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/AdminLayout";
import { DriverLayout } from "@/components/DriverLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard, defaultHomeForRole } from "@/components/RoleGuard";
import { useAuthStore, useAuthHydrated } from "@/store/auth";

// Cliente
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DriverRegisterPage } from "@/pages/DriverRegisterPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AddressesPage } from "@/pages/AddressesPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { ReviewsPage } from "@/pages/ReviewsPage";

// Admin
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminOrderDetailPage } from "@/pages/admin/AdminOrderDetailPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminDriversPage } from "@/pages/admin/AdminDriversPage";
import { AdminCouponsPage } from "@/pages/admin/AdminCouponsPage";
import { AdminStoreConfigPage } from "@/pages/admin/AdminStoreConfigPage";

// Driver
import { DriverDashboardPage } from "@/pages/driver/DriverDashboardPage";
import { DriverAvailablePage } from "@/pages/driver/DriverAvailablePage";
import { DriverMapPage } from "@/pages/driver/DriverMapPage";
import { DriverMyOrdersPage } from "@/pages/driver/DriverMyOrdersPage";
import { DriverOrderDetailPage } from "@/pages/driver/DriverOrderDetailPage";
import { DriverEarningsPage } from "@/pages/driver/DriverEarningsPage";
import { DriverRatingsPage } from "@/pages/driver/DriverRatingsPage";

/**
 * Redirige según el rol cuando hay sesión; en otro caso manda a la home pública.
 * Espera la rehidratación para no decidir con role=null en un hard-reload.
 */
function RoleAwareRedirect() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  if (!hydrated) return null;
  if (token && role) return <Navigate to={defaultHomeForRole(role)} replace />;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Cliente (layout con header normal) */}
        <Route element={<Layout />}>
          <Route index element={<CatalogPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route element={<ProtectedRoute allow={["customer"]} />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<RoleGuard allow={["admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="drivers" element={<AdminDriversPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="store" element={<AdminStoreConfigPage />} />
          </Route>
        </Route>

        {/* Repartidor */}
        <Route path="/delivery" element={<RoleGuard allow={["delivery_driver"]} />}>
          <Route element={<DriverLayout />}>
            <Route index element={<DriverDashboardPage />} />
            <Route path="available" element={<DriverAvailablePage />} />
            <Route path="map" element={<DriverMapPage />} />
            <Route path="my-orders" element={<DriverMyOrdersPage />} />
            <Route path="my-orders/:id" element={<DriverOrderDetailPage />} />
            <Route path="earnings" element={<DriverEarningsPage />} />
            <Route path="ratings" element={<DriverRatingsPage />} />
          </Route>
        </Route>

        {/* Auth (sin layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-driver" element={<DriverRegisterPage />} />

        <Route path="*" element={<RoleAwareRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
