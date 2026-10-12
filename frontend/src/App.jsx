import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import UploadStudents from "./pages/UploadStudents";
import Students from "./pages/Students";
import StudentDetails from "./pages/StudentDetails";
import LearningGraph from "./pages/LearningGraph";
import RecoveryPlan from "./pages/RecoveryPlan";
import Interventions from "./pages/Interventions";
import StudentHistory from "./pages/StudentHistory";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Segments from "./pages/Segments";
import Settings from "./pages/Settings";

function getAuthenticatedUser() {
  const token = sessionStorage.getItem("edupulse_access_token");
  const storedUser = sessionStorage.getItem("edupulse_user");

  if (!token || !storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);

    if (!user?.id || !user?.role) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

function ProtectedRoute() {
  const user = getAuthenticatedUser();

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const user = getAuthenticatedUser();

  return user ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Login />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route path="/login" element={<PublicOnlyRoute />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadStudents />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetails />} />
            <Route path="/interventions" element={<Interventions />} />

            <Route
              path="/students/:id/learning-gaps"
              element={<LearningGraph />}
            />

            <Route
              path="/students/:id/recovery-plan"
              element={<RecoveryPlan />}
            />

            <Route
              path="/students/:id/interventions"
              element={<Interventions />}
            />

            <Route
              path="/students/:id/history"
              element={<StudentHistory />}
            />

            <Route path="/analytics" element={<Analytics />} />
            <Route path="/segments" element={<Segments />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}