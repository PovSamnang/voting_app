import { Routes, Route } from "react-router-dom";
import RegisterRequestToken from "./pages/user/RegisterRequestToken.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ProtectedAdminRoute from "./pages/admin/ProtectedAdminRoute.jsx";
import ElectionAdmin from "./pages/admin/ElectionAdmin.jsx";
import VotersAdmin from "./pages/admin/VotersAdmin.jsx";
import NotFound from "./pages/NotFound.jsx";
import OfficialVoterSearch from "./pages/user/OfficialVoterSearch";
import DocumentChangeRequestPage from "./pages/user/DocumentChangeRequestPage";
import AdminDocumentChangeRequestsPage from "./pages/admin/AdminDocumentChangeRequestsPage";
import TrackDocumentChangeRequestPage from "./pages/user/TrackDocumentChangeRequestPage";

export default function App() {
  return (
    <Routes>
      {/* USER */}
      <Route path="/" element={<RegisterRequestToken />} />
      <Route path="/official-voter-search" element={<OfficialVoterSearch />} />
      <Route path="/document-change-request" element={<DocumentChangeRequestPage />} />
      <Route path="/track-document-request" element={<TrackDocumentChangeRequestPage />} />
      <Route path="/track-document-request/:requestNo" element={<TrackDocumentChangeRequestPage />} />

      {/* ADMIN LOGIN */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ADMIN PROTECTED */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/admin/AdminDocumentChangeRequestsPage"
        element={
          <ProtectedAdminRoute>
            <AdminDocumentChangeRequestsPage />
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

      {/* FALLBACK */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}