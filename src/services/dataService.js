// Shared data service for all dashboards

import { io } from 'socket.io-client';

class DataService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.apiBaseUrl = this.resolveBaseUrl();
  }

  resolveBaseUrl() {
    const fromEnv =
      typeof process !== 'undefined' &&
      process.env &&
      process.env.REACT_APP_API_BASE_URL
        ? process.env.REACT_APP_API_BASE_URL
        : null;
    const fromWindow =
      typeof window !== 'undefined' && window.__API_BASE_URL__
        ? window.__API_BASE_URL__
        : null;
    return this.normalizeApiBaseUrl(fromEnv || fromWindow);
  }

  normalizeApiBaseUrl(rawBaseUrl) {
    // If we're on Vercel, use relative paths to trigger vercel.json rewrites
    if (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost')) {
      return '/api';
    }
    
    if (!rawBaseUrl) return '/api';
    const base = String(rawBaseUrl).trim().replace(/\/+$/, '');
    if (!base) return '/api';
    if (base === '/api' || base.endsWith('/api')) return base;
    return `${base}/api`;
  }

  // Initialize socket connection
  initializeSocket(token) {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // Determine socket base URL
    let socketBase;
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      // Direct connection to Render for sockets because Vercel rewrites don't support WebSockets well
      socketBase = 'https://backend-ui1u.onrender.com';
    } else {
      socketBase = this.apiBaseUrl.replace(/\/api\/?$/, '');
      if (socketBase === '') socketBase = window.location.origin;
    }

    this.socket = io(socketBase, {
      auth: { token: `Bearer ${token}` }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for real-time updates
    this.socket.on('complaintUpdate', (data) => {
      this.notifyListeners('complaintUpdate', data);
    });

    this.socket.on('officerUpdate', (data) => {
      this.notifyListeners('officerUpdate', data);
    });

    this.socket.on('officerLocationUpdate', (data) => {
      this.notifyListeners('officerLocationUpdate', data);
    });

    this.socket.on('notificationUpdate', (data) => {
      this.notifyListeners('notificationUpdate', data);
    });

    this.socket.on('newDirectMessage', (data) => {
      this.notifyListeners('newDirectMessage', data);
    });

    this.socket.on('newMessage', (data) => {
      this.notifyListeners('newMessage', data);
    });
  }

  // Subscribe to real-time updates
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // Unsubscribe from real-time updates
  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // Notify all listeners of an event
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Generic API call method
  async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    };

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...defaultOptions,
      ...options
    });
    clearTimeout(timeout);

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      const message = data && (data.message || data.error)
        ? (data.message || data.error)
        : `API call failed: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return data !== null ? data : {};
  }

  // Notifications
  async getNotifications() {
    return this.apiCall('/notifications');
  }

  async markNotificationAsRead(id) {
    return this.apiCall(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  // Dashboard stats
  async getDashboardStats(role) {
    const endpoint = role === 'citizen' ? '/dashboard/stats' : `/dashboard/${role}`;
    return this.apiCall(endpoint);
  }

  async getComplaints(role, filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') queryParams.append(key, value);
    });

    const endpoint = role === 'citizen' 
      ? `/complaints/my-complaints?${queryParams}`
      : `/dashboard/complaints/${role}?${queryParams}`;
    
    return this.apiCall(endpoint);
  }

  async getOfficers(role) {
    if (role === 'citizen') return null;
    return this.apiCall(`/dashboard/officers/${role}`);
  }

  async getAvailableOfficersForComplaint(complaintId) {
    const res = await this.apiCall(`/dashboard/officers/dept-admin/available?complaintId=${encodeURIComponent(complaintId)}`);
    return res?.officers || [];
  }

  async createOfficer(payload) {
    return this.apiCall('/dashboard/officers/dept-admin', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getMapData(role) {
    if (role === 'citizen') return null;
    return this.apiCall(`/dashboard/map/${role}`);
  }

  async getReports(role, filters = {}) {
    if (role === 'citizen') return null;
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') queryParams.append(key, value);
    });
    return this.apiCall(`/dashboard/reports/${role}?${queryParams}`);
  }

  // Super Admin: Users
  async saCreateUser(payload) {
    return this.apiCall('/superadmin/users', { method: 'POST', body: JSON.stringify(payload) });
  }
  async saBlockUser(role, id, block) {
    return this.apiCall(`/superadmin/users/${role}/${id}/block`, { method: 'PATCH', body: JSON.stringify({ block }) });
  }
  async saResetPassword(role, id, newPassword) {
    return this.apiCall(`/superadmin/users/${role}/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) });
  }
  async saListUsers(role) {
    return this.apiCall(`/superadmin/users?role=${role}`);
  }

  // Super Admin: Departments
  async saCreateDepartment(payload) {
    return this.apiCall('/superadmin/departments', { method: 'POST', body: JSON.stringify(payload) });
  }
  async saUpdateDepartment(id, payload) {
    return this.apiCall(`/superadmin/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async saListDepartments() {
    return this.apiCall('/superadmin/departments');
  }
  async saAssignAdmin(depId, adminId) {
    return this.apiCall(`/superadmin/departments/${depId}/assign-admin`, { method: 'POST', body: JSON.stringify({ adminId }) });
  }
  async saRemoveAdmin(depId, adminId) {
    return this.apiCall(`/superadmin/departments/${depId}/remove-admin`, { method: 'POST', body: JSON.stringify({ adminId }) });
  }
  async saSetCategories(depId, categories) {
    return this.apiCall(`/superadmin/departments/${depId}/categories`, { method: 'PUT', body: JSON.stringify({ categories }) });
  }

  // Super Admin: Hierarchy
  async saCreateUrbanSector(payload) {
    return this.apiCall('/superadmin/urban-sectors', { method: 'POST', body: JSON.stringify(payload) });
  }
  async saListUrbanSectors() {
    return this.apiCall('/superadmin/urban-sectors');
  }
  async saDeleteUrbanSector(id) {
    return this.apiCall(`/superadmin/urban-sectors/${id}`, { method: 'DELETE' });
  }
  async saCreateRuralJurisdiction(payload) {
    return this.apiCall('/superadmin/rural-jurisdictions', { method: 'POST', body: JSON.stringify(payload) });
  }
  async saListRuralJurisdictions() {
    return this.apiCall('/superadmin/rural-jurisdictions');
  }
  async saUpdateRuralJurisdiction(id, payload) {
    return this.apiCall(`/superadmin/rural-jurisdictions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async saDeleteRuralJurisdiction(id) {
    return this.apiCall(`/superadmin/rural-jurisdictions/${id}`, { method: 'DELETE' });
  }

  // Super Admin: Routing Policies
  async saCreateRoutingPolicy(payload) {
    return this.apiCall('/superadmin/routing-policies', { method: 'POST', body: JSON.stringify(payload) });
  }
  async saListRoutingPolicies() {
    return this.apiCall('/superadmin/routing-policies');
  }
  async saUpdateRoutingPolicy(id, payload) {
    return this.apiCall(`/superadmin/routing-policies/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  async saDeleteRoutingPolicy(id) {
    return this.apiCall(`/superadmin/routing-policies/${id}`, { method: 'DELETE' });
  }

  async saListCategoryMappings() {
    return this.apiCall('/superadmin/category-mappings');
  }
  async saUpsertCategoryMapping(payload) {
    return this.apiCall('/superadmin/category-mappings', { method: 'POST', body: JSON.stringify(payload) });
  }
  async saDeleteCategoryMapping(id) {
    return this.apiCall(`/superadmin/category-mappings/${id}`, { method: 'DELETE' });
  }

  // Super Admin: Policies
  async saGetPolicies() {
    return this.apiCall('/superadmin/policies');
  }
  async saUpdatePolicies(payload) {
    return this.apiCall('/superadmin/policies', { method: 'PUT', body: JSON.stringify(payload) });
  }
  async saHeatmap() {
    return this.apiCall('/superadmin/analytics/heatmap');
  }

  // Super Admin: Complaints
  async saGetAllComplaints(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.apiCall(`/superadmin/complaints?${params.toString()}`);
  }
  async saReopenComplaint(id) {
    return this.apiCall(`/superadmin/complaints/${id}/reopen`, { method: 'PUT' });
  }

  // Super Admin: Analytics
  async saComplaintTrends(period = 'daily') {
    return this.apiCall(`/superadmin/analytics/complaints?period=${period}`);
  }
  async saDepartmentPerformance() {
    return this.apiCall('/superadmin/analytics/departments');
  }

  async requestReroute(complaintId, departmentId, reason) {
    return this.apiCall(`/complaints/${complaintId}/reroute-request`, {
      method: 'POST',
      body: JSON.stringify({ departmentId, reason })
    });
  }

  async saListRerouteRequests() {
    return this.apiCall('/superadmin/reroute-requests');
  }
  async saApproveRerouteRequest(id, departmentId, note) {
    return this.apiCall(`/superadmin/reroute-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ departmentId, note })
    });
  }
  async saRejectRerouteRequest(id, reason) {
    return this.apiCall(`/superadmin/reroute-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
  async saMarkInvalidComplaint(id, reason) {
    return this.apiCall(`/superadmin/complaints/${id}/mark-invalid`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Complaint actions
  async updateComplaintStatus(complaintId, status, data = {}) {
    return this.apiCall(`/complaints/${complaintId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...data })
    });
  }

  async assignOfficer(complaintId, officerId) {
    return this.apiCall(`/dashboard/complaints/${complaintId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ officerId })
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }
}

// Create singleton instance
const dataService = new DataService();
export default dataService;


