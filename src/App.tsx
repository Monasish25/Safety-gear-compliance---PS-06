import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Attendance } from "./pages/Attendance";
import { Workers } from "./pages/Workers";
import { Scan } from "./pages/Scan";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ModelAdmin } from "./pages/ModelAdmin";
import { QRDetail } from "./pages/QRDetail";
import { Login } from "./pages/Login";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Public QR Verification Route (Wraps inside Layout for visual consistency) */}
          <Route path="/qr/:token" element={<Layout />}>
            <Route index element={<QRDetail />} />
          </Route>

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="workers" element={<Workers />} />
            <Route path="scan" element={<Scan />} />
            <Route path="gate-scan" element={<Navigate to="/scan" replace />} />
            <Route path="reports" element={<Reports />} />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={["HEAD", "SUPERVISOR"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="model"
              element={
                <ProtectedRoute allowedRoles={["HEAD"]}>
                  <ModelAdmin />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
