import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import RoleSelection from './components/RoleSelection';
import CitizenDashboard from './pages/CitizenDashboard';
import FieldOfficerDashboard from './pages/FieldOfficerDashboard';
import DepartmentAdminDashboard from './pages/DepartmentAdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { RequireRole } from './RoleGuards';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/citizen-dashboard" element={<RequireRole allowed={["citizen"]}><CitizenDashboard /></RequireRole>} />
            <Route path="/field-officer-dashboard" element={<RequireRole allowed={["field-officer"]}><FieldOfficerDashboard /></RequireRole>} />
            <Route path="/department-admin-dashboard" element={<RequireRole allowed={["dept-admin"]}><DepartmentAdminDashboard /></RequireRole>} />
            <Route path="/super-admin-dashboard" element={<RequireRole allowed={["super-admin"]}><SuperAdminDashboard /></RequireRole>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
