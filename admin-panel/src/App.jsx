import { Routes, Route, Navigate } from "react-router-dom";
import RegisterRequestToken from "./pages/user/RegisterRequestToken.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ProtectedAdminRoute from "./pages/admin/ProtectedAdminRoute.jsx";
import ElectionAdmin from "./pages/admin/ElectionAdmin.jsx";
import VotersAdmin from "./pages/admin/VotersAdmin.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      {/* ✅ USER HOME */}
      <Route path="/" element={<RegisterRequestToken />} />

      {/* ✅ ADMIN LOGIN */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ✅ ADMIN PROTECTED */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/elections"
        element={
          <ProtectedAdminRoute>
            <ElectionAdmin />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/voters"
        element={
          <ProtectedAdminRoute>
            <VotersAdmin />
          </ProtectedAdminRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}