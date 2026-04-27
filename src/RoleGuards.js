import React from 'react';
import { Navigate } from 'react-router-dom';

export function RequireRole({ children, allowed }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (!token || !userStr) {
    return <Navigate to="/role-selection" replace />;
  }
  let user;
  try {
    user = JSON.parse(userStr);
  } catch {
    return <Navigate to="/role-selection" replace />;
  }
  if (!allowed.includes(user.role)) {
    const map = {
      'citizen': '/citizen-dashboard',
      'field-officer': '/field-officer-dashboard',
      'dept-admin': '/department-admin-dashboard',
      'super-admin': '/super-admin-dashboard'
    };
    const path = map[user.role] || '/role-selection';
    return <Navigate to={path} replace />;
  }
  return children;
}

export default RequireRole;
