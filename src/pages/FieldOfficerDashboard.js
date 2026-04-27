import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FieldOfficerDashboard.css';
import ExcelJS from 'exceljs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ComplaintChatPanel from '../components/ComplaintChatPanel';
import { io } from 'socket.io-client';
import dataService from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';
import DirectChatModal from '../components/DirectChatModal';

const API_BASE_URL = dataService.apiBaseUrl;
const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${SERVER_URL}${url}`;
};

const FieldOfficerDashboard = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [performance, setPerformance] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    fromDate: '',
    toDate: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatComplaint, setChatComplaint] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [toast, setToast] = useState(null);

  // Load user data from localStorage
  useEffect(() => {
    const userDataRaw = localStorage.getItem('user');
    if (!userDataRaw) {
      navigate('/role-selection');
      return;
    }
    let userData = null;
    try { userData = JSON.parse(userDataRaw); } catch (_) {}
    if (!userData || userData.role !== 'field-officer') {
      navigate('/role-selection');
      return;
    }
    setUser(userData);
    fetchDashboardData();
    
    // Initialize socket for real-time updates via shared dataService
    const token = localStorage.getItem('token');
    dataService.initializeSocket(token);
    
    const onComplaintUpdate = () => { fetchDashboardData(); };
    const onNotificationUpdate = async (payload) => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${dataService.apiBaseUrl}/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setNotifications(data.notifications);
      } catch (e) {}
      playNotifySound();
      setToast({ title: 'New notification', text: 'You have a new update.' });
      setTimeout(() => setToast(null), 4000);
    };
    const onNewDirectMessage = () => { playNotifySound(); setToast({ title: 'New message', text: 'Admin sent a new message.' }); setTimeout(() => setToast(null), 4000); };
    const onNewMessage = () => { playNotifySound(); setToast({ title: 'New update', text: 'New complaint message.' }); setTimeout(() => setToast(null), 4000); };

    dataService.subscribe('complaintUpdate', onComplaintUpdate);
    dataService.subscribe('notificationUpdate', onNotificationUpdate);
    dataService.subscribe('newDirectMessage', onNewDirectMessage);
    dataService.subscribe('newMessage', onNewMessage);

    return () => {
      dataService.unsubscribe('complaintUpdate', onComplaintUpdate);
      dataService.unsubscribe('notificationUpdate', onNotificationUpdate);
      dataService.unsubscribe('newDirectMessage', onNewDirectMessage);
      dataService.unsubscribe('newMessage', onNewMessage);
    };
  }, [navigate]);

  // Handle Chat with Admin
  const handleChatWithAdmin = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/dashboard/field-officer/admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.admin) {
        setChatRecipient(data.admin);
      } else {
        alert(data.message || 'Department admin not found');
      }
    } catch (error) {
      console.error('Error fetching admin:', error);
      alert('Error connecting to admin');
    }
  };

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      // --- UPDATED ENDPOINTS ---
      const [complaintsRes, notificationsRes] = await Promise.all([
        fetch(`${dataService.apiBaseUrl}/complaints/field-officer/assigned`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${dataService.apiBaseUrl}/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      const complaintsData = await complaintsRes.json();
      const notificationsData = await notificationsRes.json();

      if (complaintsData.success) setComplaints(complaintsData.complaints);
      if (notificationsData.success) setNotifications(notificationsData.notifications);
      setPerformance({});

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Open chat for a complaint
  const openChat = async (complaint) => {
    try {
      setChatComplaint(complaint);
      setShowChatPanel(true);
      setShowComplaintModal(false);
    } catch (e) {
      alert('Failed to open chat');
    }
  };


  // Handle complaint status update
  const updateComplaintStatus = async (complaintId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      // --- UPDATED ENDPOINT ---
      const response = await fetch(`${dataService.apiBaseUrl}/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Complaint status updated to ${newStatus}`);
        fetchDashboardData(); // Refresh data
        setShowComplaintModal(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error updating complaint status:', error);
      alert('Failed to update complaint status');
    }
  };

  // Handle evidence upload
  const handleEvidenceUpload = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      // --- UPDATED ENDPOINT ---
      const response = await fetch(`${dataService.apiBaseUrl}/complaints/${selectedComplaint.id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData, browser will set it
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        alert('Evidence uploaded successfully');
        setShowEvidenceModal(false);
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence');
    }
  };

  // Save officer notes
  const saveOfficerNotes = async (complaintId, notes) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/complaints/${complaintId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      const data = await response.json();
      if (data.success) {
        alert('Notes saved successfully!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to save notes.');
    }
  };

  const handleExportComplaints = async () => {
    if (!complaints.length) {
      alert('No complaints to export');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Complaints');

      // Define columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Location', key: 'location', width: 30 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 50 }
      ];

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;

      // Apply styles only to the actual header cells (columns 1-7)
      for (let i = 1; i <= 7; i++) {
        const cell = headerRow.getCell(i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A2A6C' } // Primary brand color
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }

      // Add data
      complaints.forEach((c, index) => {
        const row = worksheet.addRow({
          id: c.complaintId || c.id,
          title: c.title,
          category: c.category,
          status: c.status,
          location: c.location,
          date: c.assignedDate ? new Date(c.assignedDate).toLocaleDateString() : '-',
          description: c.description
        });

        // Alternating row background for better readability
        if (index % 2 !== 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' } // Very light gray
            };
          });
        }

        // Style status cell based on status
        const statusCell = row.getCell('status');
        const status = c.status ? c.status.toLowerCase() : '';
        
        if (status === 'resolved' || status === 'completed') {
          statusCell.font = { color: { argb: 'FF2E7D32' }, bold: true }; // Green
        } else if (status === 'pending') {
          statusCell.font = { color: { argb: 'FFD32F2F' }, bold: true }; // Red
        } else {
          statusCell.font = { color: { argb: 'FF1565C0' }, bold: true }; // Blue
        }
        
        // Center align ID, Category, Status, Date
        ['id', 'category', 'status', 'date'].forEach(key => {
          row.getCell(key).alignment = { vertical: 'middle', horizontal: 'center' };
        });
        
        // Left align others with wrap text
        ['title', 'location', 'description'].forEach(key => {
          row.getCell(key).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        });

        // Add borders to all cells
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Add Auto Filter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 7 }
      };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `complaints_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel file');
    }
  };



  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await dataService.markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        // Update unread count in dashboard stats if needed
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to related item
    if (notification.relatedTo === 'complaint' && notification.relatedId) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${dataService.apiBaseUrl}/complaints/${notification.relatedId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSelectedComplaint(data.complaint);
          setShowComplaintModal(true);
        }
      } catch (error) {
        console.error('Error fetching related complaint:', error);
      }
    }
  };

  // Filter complaints based on filters
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = !filters.search || 
      (complaint.complaintId && complaint.complaintId.toLowerCase().includes(filters.search.toLowerCase())) ||
      complaint.title.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCategory = filters.category === 'all' || complaint.category === filters.category;
    // Normalize status comparison for 'in-progress' vs 'progress'
    const normalizedStatus = (complaint.status === 'in-progress') ? 'progress' : complaint.status;
    const matchesStatus = filters.status === 'all' || normalizedStatus === filters.status;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate dashboard stats
  const dashboardStats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    progress: complaints.filter(c => c.status === 'progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  };

  if (isLoading) {
    return (
      <div className="loader-bg">
        <div className="loader-content">
          <div className="loader-spinner">
            <i className="fas fa-cog"></i>
          </div>
          <h2>Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {toast && (
        <div className="toast-notify slide-in">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-text">{toast.text}</div>
        </div>
      )}
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="header-top">
            <div className="app-branding">
              <h2>{t('appTitle')}</h2>
              <p>{t('fieldOfficerDashboard')}</p>
            </div>
            <button 
              className="internal-toggle-btn" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <i className={`fas ${sidebarCollapsed ? 'fa-bars' : 'fa-times'}`}></i>
            </button>
          </div>
        </div>
        
        

        <div className="sidebar-menu">
          {[
            { id: 'dashboard', icon: 'fa-home', label: t('dashboard') },
            { id: 'assigned-complaints', icon: 'fa-tasks', label: t('assignedComplaints') },
            { id: 'notifications', icon: 'fa-bell', label: t('notifications') },
            { id: 'performance', icon: 'fa-chart-line', label: t('performance') },
            { id: 'profile', icon: 'fa-user', label: t('profile') },
            { id: 'settings', icon: 'fa-cog', label: t('settings') }
          ].map(item => (
            <div
              key={item.id}
              className={`menu-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
              }}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </div>
          ))}
          
          <div className="menu-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>{t('logout')}</span>
          </div>
        </div>
      </div>

      {/* Mobile Floating Toggle */}
      <button 
        className={`mobile-floating-toggle ${sidebarCollapsed ? 'hidden' : ''}`}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="header">
          <div className="user-info">
            <div className="user-avatar">
              {user?.fullName?.charAt(0) || 'F'}
            </div>
            <div>
              <h3>{user?.fullName || 'Field Officer'}</h3>
              <p>Field Officer - {user?.department || 'Department'}</p>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={toggleLanguage}>
              {language === 'english' ? 'اردو' : 'English'}
            </button>
            <button className="notification-btn" onClick={() => setActivePage('notifications')}>
              <i className="fas fa-bell"></i>
              {notifications.length > 0 && <span className="badge">{notifications.length}</span>}
            </button>
          </div>
        </div>

        {/* Mobile Floating Toggle */}
        {/* <button 
          className={`mobile-floating-toggle ${sidebarCollapsed ? 'hidden' : ''}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <i className="fas fa-bars"></i>
        </button> */}

        {/* Dashboard Page */}
        {activePage === 'dashboard' && (
          <div className="page-content active">
            <h2 className="modal-title">Field Officer Dashboard</h2>
            
            <div className="dashboard-cards">
              <DashboardCard 
                value={dashboardStats.total}
                title={t('totalAssigned')}
                icon="fa-clipboard-list"
                type="total"
              />
              <DashboardCard 
                value={dashboardStats.pending}
                title={t('pending')}
                icon="fa-clock"
                type="pending"
              />
              <DashboardCard 
                value={dashboardStats.progress}
                title={t('inProgress')}
                icon="fa-spinner"
                type="progress"
              />
              <DashboardCard 
                value={dashboardStats.resolved}
                title={t('resolved')}
                icon="fa-check-circle"
                type="resolved"
              />
            </div>

            <div className="action-buttons">
              <button className="btn btn-outline" onClick={() => setShowCalendarModal(true)}>
                <i className="fas fa-calendar-alt"></i> {t('viewCalendar')}
              </button>
              <button className="btn btn-outline" onClick={handleExportComplaints}>
                <i className="fas fa-file-export"></i> {t('exportComplaints')}
              </button>
            </div>
            
            <ComplaintsList 
              complaints={complaints.slice(0, 5)}
              onViewDetails={(complaint) => {
                setSelectedComplaint(complaint);
                setShowComplaintModal(true);
              }}
              onOpenChat={openChat}
            />
          </div>
        )}

        {/* Other pages */}
        {activePage === 'assigned-complaints' && (
          <AssignedComplaintsPage 
            complaints={filteredComplaints}
            filters={filters}
            onFilterChange={setFilters}
            onViewDetails={(complaint) => {
              setSelectedComplaint(complaint);
              setShowComplaintModal(true);
            }}
            onOpenChat={openChat}
          />
        )}

        {activePage === 'notifications' && (
          <NotificationsPage notifications={notifications} />
        )}

        {activePage === 'performance' && (
          <PerformancePage performance={performance} />
        )}

        {activePage === 'profile' && <ProfilePage user={user} />}
        {activePage === 'settings' && <SettingsPage />}
      </div>

      {/* Complaint Details Modal */}
      {showComplaintModal && selectedComplaint && (
        <ComplaintDetailsModal
          complaint={selectedComplaint}
          onClose={() => setShowComplaintModal(false)}
          onStatusUpdate={updateComplaintStatus}
          onUploadEvidence={() => {
            setShowComplaintModal(false);
            setShowEvidenceModal(true);
          }}
          onOpenChat={openChat}
          t={t}
          saveOfficerNotes={saveOfficerNotes}
        />
      )}

      {/* Evidence Upload Modal */}
      {showEvidenceModal && selectedComplaint && (
        <EvidenceUploadModal
          complaint={selectedComplaint}
          onClose={() => setShowEvidenceModal(false)}
          onUpload={handleEvidenceUpload}
          t={t}
        />
      )}

      {showChatPanel && chatComplaint && (
        <ComplaintChatPanel
          complaint={chatComplaint}
          role="field-officer"
          onClose={() => setShowChatPanel(false)}
        />
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <CalendarModal
          complaints={complaints}
          onClose={() => setShowCalendarModal(false)}
          onViewDetails={(complaint) => {
            setSelectedComplaint(complaint);
            setShowCalendarModal(false);
            setShowComplaintModal(true);
          }}
        />
      )}

      {/* Direct Chat Disabled */}
    </div>
  );
};

// Calendar Modal Component
const CalendarModal = ({ complaints, onClose, onViewDetails }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getComplaintsForDay = (day) => {
    return complaints.filter(c => {
      const d = new Date(c.assignedDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dayComplaints = getComplaintsForDay(i);
      const hasComplaints = dayComplaints.length > 0;
      days.push(
        <div key={i} className={`calendar-day ${hasComplaints ? 'has-events' : ''}`}>
          <div className="day-number">{i}</div>
          {hasComplaints && (
            <div className="day-events">
              {dayComplaints.slice(0, 2).map(c => (
                <div key={c.id} className="event-dot" title={c.title} onClick={() => onViewDetails(c)}>
                  <span className={`status-dot ${c.status}`}></span> {c.complaintId || c.id}
                </div>
              ))}
              {dayComplaints.length > 2 && (
                <div className="more-events">+{dayComplaints.length - 2} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="modal-overlay active">
      <div className="modal calendar-modal" style={{maxWidth: '900px', width: '90%'}}>
        <div className="modal-header">
          <h3 className="modal-title">Complaint Calendar</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="calendar-header">
            <button className="btn btn-sm btn-outline" onClick={prevMonth}>&lt;</button>
            <h4>{monthName} {year}</h4>
            <button className="btn btn-sm btn-outline" onClick={nextMonth}>&gt;</button>
          </div>
          <div className="calendar-grid">
            <div className="calendar-day-header">Sun</div>
            <div className="calendar-day-header">Mon</div>
            <div className="calendar-day-header">Tue</div>
            <div className="calendar-day-header">Wed</div>
            <div className="calendar-day-header">Thu</div>
            <div className="calendar-day-header">Fri</div>
            <div className="calendar-day-header">Sat</div>
            {renderCalendarDays()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Card Component
const DashboardCard = ({ value, title, icon, type }) => (
  <div className="card">
    <div className="card-header">
      <div>
        <div className="card-value">{value}</div>
        <div className="card-title">{title}</div>
      </div>
      <div className={`card-icon ${type}`}>
        <i className={`fas ${icon}`}></i>
      </div>
    </div>
  </div>
);

// ComplaintsList Component
const ComplaintsList = ({ complaints, onViewDetails, onOpenChat }) => {
  const { t } = useLanguage();
  return (
    <div className="complaints-list">
      <h2 className="modal-title">{t('recentAssignedComplaints')}</h2>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('complaintId')}</th>
              <th>{t('title')}</th>
              <th>{t('category')}</th>
              <th>{t('location')}</th>
              <th>{t('status')}</th>
              <th>{t('assignedDate')}</th>
              <th>{t('action')}</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(complaint => (
              <tr key={complaint.id}>
                <td>{complaint.complaintId || complaint.id}</td>
                <td>{complaint.title}</td>
                <td>{complaint.category}</td>
                <td>{complaint.location}</td>
                <td>
                  <span className={`status-badge status-${complaint.status}`}>
                    {complaint.status === 'progress' || complaint.status === 'in-progress' ? t('inProgress') : 
                     complaint.status === 'pending' ? t('pending') : 
                     complaint.status === 'resolved' ? t('resolved') : 
                     complaint.status}
                  </span>
                </td>
                <td>{new Date(complaint.assignedDate).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="action-btn view-details"
                    onClick={() => onViewDetails(complaint)}
                  >
                    <i className="fas fa-eye"></i> {t('view')}
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => onOpenChat(complaint)}
                    style={{ marginLeft: '8px' }}
                  >
                    <i className="fas fa-comments"></i> {t('chat')}
                  </button>
                
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Assigned Complaints Page Component
const AssignedComplaintsPage = ({ complaints, filters, onFilterChange, onViewDetails, onOpenChat }) => {
  const { t } = useLanguage();
  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="page-content active">
      <h2 className="modal-title">{t('myAssignedComplaints')}</h2>
      
      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">{t('search') || 'Search'}</label>
          <input 
            type="text" 
            className="filter-input" 
            placeholder={t('searchPlaceholder')}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">{t('category')}</label>
          <select 
            className="filter-select" 
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">{t('allCategories')}</option>
            <option value="Sanitation">{t('sanitation') || 'Sanitation'}</option>
            <option value="Water Supply">{t('waterSupply') || 'Water Supply'}</option>
            <option value="Electricity">{t('electricity') || 'Electricity'}</option>
            <option value="Roads">{t('roads') || 'Roads'}</option>
            <option value="Drainage">{t('drainage') || 'Drainage'}</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">{t('status')}</label>
          <select 
            className="filter-select" 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">{t('allStatuses')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="progress">{t('inProgress')}</option>
            <option value="resolved">{t('resolved')}</option>
          </select>
        </div>
      </div>
      
      <ComplaintsList complaints={complaints} onViewDetails={onViewDetails} onOpenChat={onOpenChat} />
    </div>
  );
};

// Notifications Page Component
const NotificationsPage = ({ notifications, onNotificationClick }) => {
  const { t } = useLanguage();
  return (
    <div className="page-content active">
      <h2 className="modal-title">{t('notifications')}</h2>
      <div className="notifications-list">
        {notifications.map(notification => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onClick={() => onNotificationClick(notification)}
          />
        ))}
        {notifications.length === 0 && <p style={{textAlign: 'center', padding: '20px'}}>{t('noNotifications')}</p>}
      </div>
    </div>
  );
};

// Notification Item Component
const NotificationItem = ({ notification, onClick }) => (
  <div 
    className={`notification-item ${!notification.isRead ? 'unread' : ''}`} 
    onClick={onClick}
    style={{ cursor: 'pointer', borderLeft: !notification.isRead ? '4px solid #1a2a6c' : 'none' }}
  >
    <div className={`notification-icon ${notification.type}`}>
      <i className={`fas ${notification.icon || 'fa-bell'}`}></i>
    </div>
    <div className="notification-content">
      <div className="notification-title">
        {notification.title}
        {!notification.isRead && <span className="new-badge">New</span>}
      </div>
      <p>{notification.message}</p>
      <div className="notification-time">
        {new Date(notification.timestamp).toLocaleString()}
      </div>
    </div>
  </div>
);

// Performance Page Component
const PerformancePage = ({ performance }) => {
  const { t } = useLanguage();

  const data = [
    { name: t('total'), value: performance.totalAssigned || 0, color: '#8884d8' },
    { name: t('resolved'), value: performance.resolved || 0, color: '#2ecc71' },
    { name: t('pending'), value: performance.pending || 0, color: '#f39c12' }
  ];

  const pieData = [
    { name: t('resolved'), value: performance.resolved || 0 },
    { name: t('pending'), value: performance.pending || 0 }
  ];

  const COLORS = ['#2ecc71', '#f39c12', '#e74c3c', '#3498db'];

  return (
    <div className="page-content active">
      <h2 className="modal-title" style={{ marginBottom: '25px' }}>{t('performanceSummary')}</h2>
      
      {/* Stat Cards */}
      <div className="dashboard-cards" style={{ marginBottom: '40px' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-icon total">
              <i className="fas fa-clipboard-list"></i>
            </div>
          </div>
          <div className="card-value">{performance.totalAssigned || 0}</div>
          <div className="card-title">{t('totalComplaintsAssigned')}</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-icon resolved">
              <i className="fas fa-check-circle"></i>
            </div>
          </div>
          <div className="card-value">{performance.resolved || 0}</div>
          <div className="card-title">{t('complaintsResolved')}</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-icon pending">
              <i className="fas fa-clock"></i>
            </div>
          </div>
          <div className="card-value">{performance.pending || 0}</div>
          <div className="card-title">{t('pendingComplaints')}</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-icon progress">
              <i className="fas fa-hourglass-half"></i>
            </div>
          </div>
          <div className="card-value">{performance.avgResolutionTime || 0}</div>
          <div className="card-title">{t('avgResolutionTime')} ({t('days')})</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        
        {/* Bar Chart */}
        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a2a6c' }}>Complaint Status Overview</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#1a2a6c" name="Complaints" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', color: '#1a2a6c' }}>Resolution Ratio</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Page Component
const ProfilePage = ({ user }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    department: user?.department || ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        department: user.department || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert(t('profileUpdatedSuccess') || 'Profile updated successfully!');
    }, 1000);
  };

  return (
    <div className="page-content active">
      <h2 className="modal-title" style={{ textAlign: 'center', marginBottom: '30px' }}>{t('profileSettings')}</h2>
      <div className="profile-form">
        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label className="form-label">{t('fullName')}</label>
            <input 
              type="text" 
              className="form-control" 
              value={profileData.fullName}
              onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input 
              type="email" 
              className="form-control" 
              value={profileData.email}
              readOnly
              disabled
            />
            <small className="form-text">{t('emailReadOnly') || 'Email cannot be changed'}</small>
          </div>
          <div className="form-group">
            <label className="form-label">{t('department')}</label>
            <input 
              type="text" 
              className="form-control" 
              value={profileData.department}
              readOnly
              disabled
            />
            <small className="form-text">{t('departmentReadOnly') || 'Department cannot be changed'}</small>
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? (
              <><i className="fas fa-spinner fa-spin"></i> {t('updating')}</>
            ) : (
              <><i className="fas fa-save"></i> {t('updateProfile')}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Settings Page Component
const SettingsPage = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    notifications: true,
    theme: 'light'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('foSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Ensure we only keep relevant settings if we want to be strict, 
      // but reading existing is fine.
      setSettings(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  const handleSettingsSave = () => {
    localStorage.setItem('foSettings', JSON.stringify(settings));
    alert(t('settingsSaved') || 'Settings saved successfully!');
  };

  return (
    <div className="page-content active">
      <h2 className="modal-title" style={{ textAlign: 'center', marginBottom: '30px' }}>{t('appSettings')}</h2>
      <div className="settings-form">
        <div className="form-group">
          <label className="form-label">{t('notifications')}</label>
          <select 
            className="form-control" 
            value={settings.notifications}
            onChange={(e) => setSettings({...settings, notifications: e.target.value === 'true'})}
          >
            <option value={true}>{t('enable')}</option>
            <option value={false}>{t('disable')}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('theme')}</label>
          <select 
            className="form-control" 
            value={settings.theme}
            onChange={(e) => setSettings({...settings, theme: e.target.value})}
          >
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleSettingsSave}>
          <i className="fas fa-save"></i> {t('saveSettings')}
        </button>
      </div>
    </div>
  );
};

// Complaint Details Modal Component
const ComplaintDetailsModal = ({ complaint, onClose, onStatusUpdate, onUploadEvidence, onOpenChat }) => {
  const [notes, setNotes] = useState('');
  const [foTemplate, setFoTemplate] = useState('');
  const [foNotes, setFoNotes] = useState('');

  const handleSaveNotes = () => {
    // Save notes to localStorage or backend
    localStorage.setItem(`notes_${complaint.id}`, notes);
    alert('Notes saved successfully!');
  };

  return (
    <div className="modal-overlay active">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Complaint Details</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="complaint-details">
            <div className="detail-item">
              <div className="detail-label">Complaint ID</div>
              <div className="detail-value">{complaint.complaintId || complaint.id}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Title</div>
              <div className="detail-value">{complaint.title}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Category</div>
              <div className="detail-value">{complaint.category}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Status</div>
              <div className="detail-value">
                <span className={`status-badge status-${complaint.status}`}>
                  {complaint.status === 'progress' || complaint.status === 'in-progress' ? 'In Progress' : 
                   complaint.status === 'pending' ? 'Pending' : 
                   complaint.status === 'assigned' ? 'Assigned' : 
                   complaint.status === 'resolved' ? 'Resolved' : complaint.status}
                </span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Assigned Date</div>
              <div className="detail-value">
                {new Date(complaint.assignedDate).toLocaleDateString()}
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Citizen Name</div>
              <div className="detail-value">{complaint.citizenName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Contact Number</div>
              <div className="detail-value">{complaint.contactNumber}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Location</div>
              <div className="detail-value">{complaint.location}</div>
            </div>
            
            <div className="detail-item" style={{gridColumn: '1 / -1'}}>
              <div className="detail-label">Description</div>
              <div className="detail-value">{complaint.description}</div>
            </div>
          </div>
          
          {/* Unified Media Gallery */}
          {(
            (complaint.media && complaint.media.length > 0) || 
            (complaint.evidence && complaint.evidence.length > 0)
          ) && (
            <>
              <h4 style={{ marginTop: '25px', gridColumn: '1 / -1' }}>Media Attachments</h4>
              <div className="media-gallery" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {/* Initial Complaint Media */}
                {complaint.media && complaint.media.map((media, index) => (
                  <div key={`initial-${index}`} className="media-item">
                    <a href={getImageUrl(media.url)} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={getImageUrl(media.url)} 
                        alt={`Complaint Media ${index + 1}`} 
                        style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #dee2e6'}} 
                      />
                    </a>
                  </div>
                ))}
                
                {/* Evidence Media */}
                {complaint.evidence && complaint.evidence.flatMap((ev, i) => 
                  (ev.files || []).map((file, j) => (
                    <div key={`evidence-${i}-${j}`} className="media-item">
                      <a href={getImageUrl(file.url)} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={getImageUrl(file.url)} 
                          alt={`Evidence ${i+1}-${j+1}`} 
                          style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #dee2e6'}} 
                        />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Evidence Log */}
          {complaint.evidence && complaint.evidence.length > 0 && (
            <>
              <h4 style={{ marginTop: '25px' }}>Updates Log</h4>
              <div className="evidence-list">
                {complaint.evidence.map((ev, i) => (
                  <div key={i} className="evidence-item" style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>{ev.officerName || 'Officer'}</strong>
                      <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: 0 }}>{ev.description}</p>
                    {ev.files && ev.files.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '5px' }}>
                        <i className="fas fa-paperclip"></i> {ev.files.length} attachment(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="modal-actions">
            {(complaint.status === 'pending' || complaint.status === 'assigned') && (
              <button 
                className="btn btn-warning" 
                onClick={() => onStatusUpdate(complaint.id, 'in-progress')}
              >
                <i className="fas fa-spinner"></i> Mark as In Progress
              </button>
            )}
            
            <button className="btn btn-outline" onClick={onUploadEvidence}>
              <i className="fas fa-upload"></i> Upload Evidence
            </button>
            
            {(complaint.status === 'progress' || complaint.status === 'in-progress') && (
              <button 
                className="btn btn-success" 
                onClick={() => onStatusUpdate(complaint.id, 'resolved')}
              >
                <i className="fas fa-check-circle"></i> Mark as Resolved
              </button>
            )}
            <button 
              className="btn btn-info"
              onClick={async () => {
                try {
                  if (!navigator.geolocation) {
                    alert('Geolocation not supported');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(async (pos) => {
                    const token = localStorage.getItem('token');
                    const payload = {
                      location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    };
                    await fetch(`${API_BASE_URL}/complaints/${complaint.id}/check-in`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    alert('Check-in recorded');
                  }, () => alert('Unable to get location'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                } catch (e) {
                  alert('Failed to check in');
                }
              }}
              style={{ marginLeft: '8px' }}
            >
              <i className="fas fa-map-marker-alt"></i> Check-In
            </button>
          </div>
          
          <div className="form-group" style={{marginTop: '20px'}}>
            <label className="detail-label">Officer's Quick Notes</label>
            <textarea 
              className="form-control" 
              placeholder="Add your notes or reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button className="btn btn-outline" onClick={handleSaveNotes} style={{marginTop: '10px'}}>
              <i className="fas fa-save"></i> Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Evidence Upload Modal Component
const EvidenceUploadModal = ({ complaint, onClose, onUpload }) => {
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('description', description);
    files.forEach(file => {
      formData.append('evidence', file);
    });
    
    onUpload(formData);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal evidence-modal">
        <div className="modal-header">
          <h3 className="modal-title">Upload Work Evidence</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form className="evidence-form" onSubmit={handleSubmit}>
            <div className="detail-item">
              <div className="detail-label">Complaint ID</div>
              <div className="detail-value">{complaint.complaintId || complaint.id}</div>
            </div>
            
            <div className="file-upload">
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Click to upload or drag and drop</p>
              <span>Upload images or videos of your work</span>
              <input 
                type="file" 
                multiple 
                accept="image/*,video/*" 
                onChange={handleFileChange}
              />
            </div>
            
            {files.length > 0 && (
              <div>
                <strong>Selected files:</strong>
                <ul>
                  {files.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="form-group">
              <label className="detail-label">Work Description</label>
              <textarea 
                className="form-control" 
                placeholder="Describe the work you performed..." 
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-paper-plane"></i> Submit Evidence
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FieldOfficerDashboard;
  const playNotifySound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.45);
    } catch (_) {}
  };
