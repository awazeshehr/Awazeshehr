import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';
import DirectChatModal from '../components/DirectChatModal';
import './DepartmentAdminDashboard.css';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';


const DepartmentAdminDashboard = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 992;
  });
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
    completedComplaints: 0,
    activeOfficers: 0,
    avgResolutionTime: 0,
    satisfactionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    priority: 'all',
    officer: 'all',
    fromDate: '',
    toDate: '',
    area: '',
    region: '',
    overdueOnly: false
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentCandidates, setAssignmentCandidates] = useState([]);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [filtersVersion, setFiltersVersion] = useState(0);
  const [completedComplaint, setCompletedComplaint] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenMessageAt, setLastSeenMessageAt] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('success');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [directChatRecipient, setDirectChatRecipient] = useState(null);

  // Tour States
  const [showTourLangModal, setShowTourLangModal] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourRect, setTourRect] = useState(null);
  const [tourTooltipPos, setTourTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Refs for Tour
  const sidebarMenuRef = useRef(null);
  const dashboardStatsRef = useRef(null);
  const recentComplaintsRef = useRef(null);
  const activeOfficersRef = useRef(null);
  const headerActionsRef = useRef(null);

  // New Page Specific Refs
  const filterBarRef = useRef(null);
  const complaintsTableRef = useRef(null);
  const createOfficerBtnRef = useRef(null);
  const officersTableRef = useRef(null);
  const mapContainerRef = useRef(null);
  const verificationTableRef = useRef(null);
  const commsListRef = useRef(null);
  const chartsContainerRef = useRef(null);

  const notificationRef = useRef(null);

  const tourSteps = useMemo(() => {
    const isUrdu = language === 'urdu';
    
    // Dashboard Steps
    if (activePage === 'dashboard') {
      return [
        {
          key: 'sidebar',
          title: isUrdu ? 'نیویگیشن مینو' : 'Navigation Menu',
          body: isUrdu 
            ? 'یہاں سے آپ ڈیش بورڈ کے تمام اہم سیکشنز تک رسائی حاصل کر سکتے ہیں جیسے شکایات کا انتظام اور افسران کی لسٹ۔' 
            : 'Access all key sections of the dashboard from here, including complaint management and officer lists.',
          getEl: () => sidebarMenuRef.current
        },
        {
          key: 'stats',
          title: isUrdu ? 'ڈیش بورڈ کے اعدادوشمار' : 'Dashboard Statistics',
          body: isUrdu 
            ? 'یہ کارڈز آپ کو آپ کے ڈیپارٹمنٹ کی شکایات کا فوری جائزہ فراہم کرتے ہیں۔' 
            : 'These cards give you a quick overview of your department\'s complaint statistics.',
          getEl: () => dashboardStatsRef.current
        },
        {
          key: 'recent',
          title: isUrdu ? 'حالیہ شکایات' : 'Recent Complaints',
          body: isUrdu 
            ? 'حالیہ موصول ہونے والی شکایات کو یہاں دیکھا جا سکتا ہے۔' 
            : 'View the most recently received complaints here.',
          getEl: () => recentComplaintsRef.current
        },
        {
          key: 'officers',
          title: isUrdu ? 'فعال افسران' : 'Active Officers',
          body: isUrdu 
            ? 'اپنے ڈیپارٹمنٹ کے فعال فیلڈ افسران اور ان کی کارکردگی پر نظر رکھیں۔' 
            : 'Keep track of active field officers and their current workload.',
          getEl: () => activeOfficersRef.current
        }
      ];
    }

    // Complaints Page Steps
    if (activePage === 'complaints') {
      return [
        {
          key: 'filters',
          title: isUrdu ? 'شکایات کے فلٹرز' : 'Complaint Filters',
          body: isUrdu 
            ? 'یہاں سے آپ شکایات کو ان کے سٹیٹس، کیٹیگری یا تاریخ کے لحاظ سے فلٹر کر سکتے ہیں۔' 
            : 'Filter complaints by status, category, or date range using these controls.',
          getEl: () => filterBarRef.current
        },
        {
          key: 'table',
          title: isUrdu ? 'شکایات کی فہرست' : 'Complaints List',
          body: isUrdu 
            ? 'تمام شکایات کی تفصیلات یہاں موجود ہیں۔ آپ کسی بھی شکایت پر کلک کر کے اس کی تفصیل دیکھ سکتے ہیں یا اسے افسر کو اسائن کر سکتے ہیں۔' 
            : 'All complaints are listed here. Click on any row to view details or assign an officer.',
          getEl: () => complaintsTableRef.current
        }
      ];
    }

    // Officers Page Steps
    if (activePage === 'officers') {
      return [
        {
          key: 'create',
          title: isUrdu ? 'نیا افسر شامل کریں' : 'Add New Officer',
          body: isUrdu 
            ? 'یہاں سے آپ اپنے ڈیپارٹمنٹ کے لیے نئے فیلڈ افسران رجسٹر کر سکتے ہیں۔' 
            : 'Register new field officers for your department from here.',
          getEl: () => createOfficerBtnRef.current
        },
        {
          key: 'officers_list',
          title: isUrdu ? 'افسران کی فہرست' : 'Officers List',
          body: isUrdu 
            ? 'اپنے تمام افسران کی لسٹ اور ان کی موجودہ اسائنمنٹس یہاں چیک کریں۔' 
            : 'Check the list of all your officers and their current assignments.',
          getEl: () => officersTableRef.current
        }
      ];
    }

    // Map Page Steps
    if (activePage === 'map') {
      return [
        {
          key: 'live_map',
          title: isUrdu ? 'لائیو نقشہ' : 'Live Map',
          body: isUrdu 
            ? 'اس نقشے پر آپ شکایات کی لوکیشن اور فیلڈ افسران کی لائیو لوکیشن دیکھ سکتے ہیں۔' 
            : 'Track complaint locations and field officers in real-time on this map.',
          getEl: () => mapContainerRef.current
        }
      ];
    }

    // Verification Page Steps
    if (activePage === 'verification') {
      return [
        {
          key: 'verify_list',
          title: isUrdu ? 'تصدیق اور بندش' : 'Verification & Closure',
          body: isUrdu 
            ? 'افسران کی جانب سے حل شدہ شکایات کی تصدیق یہاں کریں تاکہ انہیں فائنل کلوز کیا جا سکے۔' 
            : 'Verify resolved complaints from officers here to officially close them.',
          getEl: () => verificationTableRef.current
        }
      ];
    }

    // Communication Page Steps
    if (activePage === 'communication') {
      return [
        {
          key: 'comms',
          title: isUrdu ? 'مواصلات' : 'Communication',
          body: isUrdu 
            ? 'شہریوں اور فیلڈ افسران کے پیغامات کا جواب یہاں سے دیں۔' 
            : 'Respond to messages from citizens and field officers here.',
          getEl: () => commsListRef.current
        }
      ];
    }

    // Reports Page Steps
    if (activePage === 'reports') {
      return [
        {
          key: 'analytics',
          title: isUrdu ? 'رپورٹس اور اینالیٹکس' : 'Reports & Analytics',
          body: isUrdu 
            ? 'ڈیپارٹمنٹ کی مجموعی کارکردگی کا جائزہ لینے کے لیے گراف اور چارٹس دیکھیں۔' 
            : 'View detailed graphs and charts to analyze department performance.',
          getEl: () => chartsContainerRef.current
        }
      ];
    }

    return [];
  }, [activePage, language]);

  const computeTourLayout = useCallback(() => {
    if (!tourOpen) return;
    const step = tourSteps[tourIndex];
    const el = step?.getEl ? step.getEl() : null;
    if (!el || typeof el.getBoundingClientRect !== 'function') {
      setTourRect(null);
      setTourTooltipPos({ top: 24, left: 24, placement: 'bottom' });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 10;
    const highlight = {
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: Math.min(window.innerWidth, rect.width + padding * 2),
      height: Math.min(window.innerHeight, rect.height + padding * 2)
    };
    setTourRect(highlight);

    const tooltipWidth = 340;
    const tooltipHeight = 180;
    const gap = 15;

    let placement = 'bottom';
    let top = rect.bottom + gap;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    if (top + tooltipHeight > window.innerHeight) {
      placement = 'top';
      top = rect.top - gap - tooltipHeight;
    }

    // Horizontal bounds
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    setTourTooltipPos({ top, left, placement });
  }, [tourIndex, tourOpen, tourSteps]);

  useEffect(() => {
    if (tourOpen) {
      computeTourLayout();
      window.addEventListener('resize', computeTourLayout);
      return () => window.removeEventListener('resize', computeTourLayout);
    }
  }, [tourOpen, computeTourLayout]);

  const startTour = (lang) => {
    if (lang !== language) {
      toggleLanguage(); // Since LanguageContext only has toggle, we assume this works for 2 langs
    }
    setShowTourLangModal(false);
    setTourOpen(true);
    setTourIndex(0);
  };

  const nextTour = () => {
    if (tourIndex < tourSteps.length - 1) {
      setTourIndex(tourIndex + 1);
    } else {
      closeTour();
    }
  };

  const prevTour = () => {
    if (tourIndex > 0) {
      setTourIndex(tourIndex - 1);
    }
  };

  const closeTour = () => {
    setTourOpen(false);
    localStorage.setItem(`deptAdminTourSeen_${activePage}`, 'true');
  };

  // Check for first time login tour per page
  useEffect(() => {
    const tourSeen = localStorage.getItem(`deptAdminTourSeen_${activePage}`);
    if (!tourSeen && user) {
      // Delay slightly to ensure elements are rendered
      const timer = setTimeout(() => {
        setShowTourLangModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowTourLangModal(false);
    }
  }, [activePage, user]);

  const tr = useCallback(
    (key, fallback) => {
      const v = t ? t(key) : null;
      if (!v || v === key) return fallback;
      return v;
    },
    [t]
  );

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 992;
      setIsMobile(nextIsMobile);
      if (nextIsMobile) {
        setSidebarCollapsed(false);
      } else {
        setSidebarMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openSidebar = () => {
    if (isMobile) {
      setSidebarMobileOpen(true);
      return;
    }
    setSidebarCollapsed(false);
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarMobileOpen(prev => !prev);
      return;
    }
    setSidebarCollapsed(prev => !prev);
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const data = await dataService.apiCall('/dashboard/dept-admin');
      if (data.success) {
        setDashboardStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await dataService.getComplaints('dept-admin', filters);
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  }, [filters]);

  const loadOfficers = useCallback(async () => {
    try {
      const data = await dataService.getOfficers('dept-admin');
      if (data.success) {
        setOfficers(data.officers);
      }
    } catch (error) {
      console.error('Error loading officers:', error);
    }
  }, []);

  const loadMapData = useCallback(async () => {
    try {
      const data = await dataService.getMapData('dept-admin');
      if (data.success) {
        setComplaints(data.complaints);
        setOfficers(data.officers);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }, []);

  const loadPendingVerifications = useCallback(async () => {
    try {
      const data = await dataService.apiCall('/dashboard/verification/pending');
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (error) {
      console.error('Error loading pending verifications:', error);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const data = await dataService.apiCall('/dashboard/messages/dept-admin');
      if (data.success) {
        setRecentMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await dataService.getNotifications();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const data = await dataService.getReports('dept-admin');
      if (data.success) {
        setDashboardStats(prevStats => ({
          ...prevStats,
          reportData: data.reportData
        }));
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }, []);

  const playNotifySound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    } catch (_) {}
  }, []);

  // Load user data and initialize dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/role-selection');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'dept-admin') {
        navigate('/role-selection');
        return;
      }
      setUser(parsedUser);
      
      // Load dashboard data directly here
      const loadData = async () => {
        try {
          // Load notifications first
          loadNotifications();

          // Load independently to prevent one failure from blocking others
          const statsPromise = dataService.getDashboardStats('dept-admin')
            .then(data => data.success && setDashboardStats(data.stats))
            .catch(err => console.error('Stats load error:', err));
            
          const complaintsPromise = dataService.getComplaints('dept-admin')
            .then(data => data.success && setComplaints(data.complaints))
            .catch(err => console.error('Complaints load error:', err));

          const officersPromise = dataService.getOfficers('dept-admin')
            .then(data => data.success && setOfficers(data.officers))
            .catch(err => console.error('Officers load error:', err));

          const departmentsPromise = dataService.apiCall('/complaints/data/departments')
            .then(data => data.success && setDepartments(data.departments))
            .catch(err => console.error('Departments load error:', err));

          await Promise.all([statsPromise, complaintsPromise, officersPromise, departmentsPromise]);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      // Initialize socket using dataService
      const initSocket = () => {
        dataService.initializeSocket(token);
        
        // Subscribe to real-time updates
        dataService.subscribe('complaintUpdate', (data) => {
          if (parsedUser && data.department === parsedUser.department) {
            loadData(); // Reload all data
          }
        });

        dataService.subscribe('officerUpdate', async (data) => {
          if (parsedUser && data.department === parsedUser.department) {
            try {
              const officersData = await dataService.getOfficers('dept-admin');
              if (officersData.success) {
                setOfficers(officersData.officers);
              }
            } catch (error) {
              console.error('Error loading officers:', error);
            }
          }
        });

        dataService.subscribe('officerLocationUpdate', (data) => {
          setOfficers(prevOfficers => 
            prevOfficers.map(officer => 
              officer._id === data.officerId 
                ? { ...officer, currentLocation: data.location }
                : officer
            )
          );
        });

        dataService.subscribe('notificationUpdate', async () => {
          try {
            const notificationsData = await dataService.getNotifications();
            if (notificationsData.success) {
              setNotifications(notificationsData.notifications);
            }
            playNotifySound();
          } catch (error) {
            console.error('Error loading notifications:', error);
          }
        });

        dataService.subscribe('newDirectMessage', async () => {
          setHasNewMessage(true);
          if (activePage === 'communication') await loadMessages();
          playNotifySound();
          setNotificationType('info');
          setNotificationMessage('You have a new message.');
          setShowNotification(true);
        });

        dataService.subscribe('newMessage', async () => {
          setHasNewMessage(true);
          if (activePage === 'communication') await loadMessages();
          playNotifySound();
          setNotificationType('info');
          setNotificationMessage('New complaint message.');
          setShowNotification(true);
        });
      };
      
      loadData();
      initSocket();
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/role-selection');
    }
  }, [navigate, activePage, loadMessages, loadNotifications, playNotifySound]);

  // Load dashboard data based on active page
  useEffect(() => {
    if (user) {
      switch (activePage) {
        case 'dashboard':
          loadDashboardData();
          break;
        case 'complaints':
          loadComplaints();
          break;
        case 'officers':
          loadOfficers();
          break;
        case 'map':
          loadMapData();
          break;
        case 'verification':
          loadPendingVerifications();
          break;
        case 'communication':
          loadMessages();
          setLastSeenMessageAt(Date.now());
          setHasNewMessage(false);
          break;
        case 'reports':
          loadReports();
          break;
        default:
          break;
      }
    }
  }, [activePage, user, loadDashboardData, loadComplaints, loadOfficers, loadMapData, loadPendingVerifications, loadMessages, loadNotifications, loadReports]);

  // Reload complaints when filters change while on complaints page
  useEffect(() => {
    if (activePage === 'complaints') {
      loadComplaints();
    }
  }, [filters, activePage, filtersVersion, loadComplaints]);

  // Refresh all data function
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const [statsData, complaintsData, officersData] = await Promise.all([
        dataService.getDashboardStats('dept-admin'),
        dataService.getComplaints('dept-admin'),
        dataService.getOfficers('dept-admin')
      ]);

      if (statsData.success) setDashboardStats(statsData.stats);
      if (complaintsData.success) setComplaints(complaintsData.complaints);
      if (officersData.success) setOfficers(officersData.officers);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleComplaintAction = async (complaintId, action, data = {}) => {
    try {
      if (action === 'reroute') {
        const result = await dataService.requestReroute(complaintId, data.departmentId, data.reason);
        if (!result.success) {
          setNotificationType('error');
          setNotificationMessage(result.message || t('error'));
          setShowNotification(true);
          return;
        }
        loadComplaints();
        loadDashboardData();
        setShowComplaintModal(false);
        setNotificationType('success');
        setNotificationMessage('Complaint rerouted successfully');
        setShowNotification(true);
        return;
      }
      const result = await dataService.apiCall(`/dashboard/complaints/${complaintId}/${action}`, { method: 'PUT', body: JSON.stringify(data) });
      if (!result.success) {
        setNotificationType('error');
        setNotificationMessage(result.message || t('error'));
        setShowNotification(true);
        return;
      }

      loadComplaints();
      loadDashboardData();
      setShowComplaintModal(false);
      
      // Show completion popup for verification approval
      if (action === 'verify' && data.verified === true) {
        const complaint = complaints.find(c => c._id === complaintId);
        if (complaint) {
          setCompletedComplaint(complaint);
          setShowCompletionPopup(true);
        }
      }
    } catch (error) {
      console.error('Error performing complaint action:', error);
      setNotificationType('error');
      setNotificationMessage(error.message || t('error'));
      setShowNotification(true);
    }
  };

  const handleOfficerAssignment = async (complaintId, officerId) => {
    try {
      const result = await dataService.apiCall(`/dashboard/complaints/${complaintId}/assign`, { method: 'POST', body: JSON.stringify({ officerId }) });
      if (result.success) {
        loadComplaints();
        setShowAssignmentModal(false);
        setNotificationType('success');
        setNotificationMessage(t('officerAssignedSuccess') || 'Officer assigned successfully');
        setShowNotification(true);
      } else {
        setNotificationType('error');
        setNotificationMessage(result.message || 'Failed to assign officer');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error assigning officer:', error);
      setNotificationType('error');
      setNotificationMessage(error.message || 'Failed to assign officer');
      setShowNotification(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dataService.disconnect();
    navigate('/role-selection');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dataService.disconnect();
    };
  }, []);

  if (isLoading || !user || !user.department) {
    return (
      <div className="loader-bg">
        <div className="loader-content">
          <div className="loader-spinner">
            <i className="fas fa-cog"></i>
          </div>
          <h2>{t('loadingDeptDashboard')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${!isMobile && sidebarCollapsed ? 'collapsed' : ''} ${isMobile && sidebarMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="header-top">
            <div className="app-branding">
              <img className="app-logo" src={`${process.env.PUBLIC_URL}/awazeshehr.jpeg`} alt={t('appTitle')} />
              <h2>{t('appTitle')}</h2>
              <div className="dept-badge">{user?.department || 'WASA'}</div>
            </div>
            <button 
              className="internal-toggle-btn" 
              onClick={toggleSidebar}
              aria-label={isMobile ? (sidebarMobileOpen ? "Close sidebar" : "Open sidebar") : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
            >
              <i className={`fas ${isMobile ? (sidebarMobileOpen ? 'fa-times' : 'fa-indent') : (sidebarCollapsed ? 'fa-indent' : 'fa-outdent')}`}></i>
            </button>
          </div>
        </div>

        <div className="sidebar-menu" ref={sidebarMenuRef}>
          {[
            { id: 'dashboard', icon: 'fa-gauge', label: tr('dashboard', 'Dashboard') },
            { id: 'complaints', icon: 'fa-clipboard-list', label: tr('complaintManagement', 'Complaints') },
            { id: 'verification', icon: 'fa-check-double', label: tr('verificationClosure', 'Verification') },
            { id: 'officers', icon: 'fa-users-cog', label: tr('officerManagement', 'Officers') },
            { id: 'map', icon: 'fa-map-marked-alt', label: tr('liveMapTracking', 'Live Map') },
            { id: 'communication', icon: 'fa-comments', label: tr('communication', 'Messages'), showDot: true },
            { id: 'reports', icon: 'fa-chart-pie', label: tr('reportsAnalytics', 'Reports') },
          ].map(item => (
            <div
              key={item.id}
              className={`menu-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
                if(isMobile) setSidebarMobileOpen(false);
              }}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
              {item.showDot && hasNewMessage && (
                <span className="badge-dot"></span>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="menu-item logout-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>{t('logout')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="header">
          <div className="user-info">
            {isMobile && !sidebarMobileOpen && (
              <button
                className="header-sidebar-toggle"
                onClick={openSidebar}
                aria-label="Open sidebar"
              >
                <i className="fas fa-bars"></i>
              </button>
            )}
            <div className="user-avatar">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div>
              <h3>{user?.fullName || tr('deptAdmin', 'Department Admin')}</h3>
              <p>
                {user?.department || tr('department', 'Department')}
                <span className="role-badge dept-admin">{tr('deptAdmin', 'Department Admin')}</span>
              </p>
            </div>
          </div>
          <div className="header-actions" ref={headerActionsRef}>
            <button 
              onClick={toggleLanguage}
              className="btn btn-sm btn-outline"
              style={{ padding: '5px 10px', borderRadius: '15px', fontWeight: 'bold', marginRight: '10px' }}
            >
              {language === 'english' ? 'اردو' : 'English'}
            </button>
            <button 
              className="btn btn-outline refresh-btn" 
              onClick={refreshAllData}
              disabled={isLoading}
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
              {t('refresh')}
            </button>
            <div className="notification-bell" ref={notificationRef} onClick={() => setShowNotifications(!showNotifications)}>
              <i className="fas fa-bell"></i>
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
              
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="dropdown-header">
                    <h4>{t('notifications')}</h4>
                  </div>
                  <div className="dropdown-content">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">{t('noNotifications')}</div>
                    ) : (
                      notifications.map((notif, index) => (
                        <div key={notif.id || notif._id || index} className="notification-item">
                          <div className="notification-icon">
                            <i className={`fas ${notif.type === 'alert' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                          </div>
                          <div className="notification-text">
                            <p className="notif-title">{notif.title}</p>
                            <p className="notif-message">{notif.message}</p>
                            <span className="notif-time">{new Date(notif.createdAt || notif.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="status-indicator">
              <div className="status-dot online"></div>
              <span>{t('online')}</span>
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        {/* <div className="menu-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <i className="fas fa-bars"></i>
        </div> */}

        {/* Dashboard Page */}
        {activePage === 'dashboard' && (
          <DashboardPage 
            stats={dashboardStats}
            complaints={complaints}
            officers={officers.slice(0, 3)}
            statsRef={dashboardStatsRef}
            recentRef={recentComplaintsRef}
            activeRef={activeOfficersRef}
            onViewComplaint={(complaint) => {
              setSelectedComplaint(complaint);
              setShowComplaintModal(true);
            }}
          />
        )}

        {/* Complaint Management Page */}
        {activePage === 'complaints' && (
          <ComplaintManagementPage
            complaints={complaints}
            filters={filters}
            onFilterChange={setFilters}
            setFiltersVersion={setFiltersVersion}
            filterBarRef={filterBarRef}
            complaintsTableRef={complaintsTableRef}
            onViewComplaint={(complaint) => {
              setSelectedComplaint(complaint);
              setShowComplaintModal(true);
            }}
            onAssignOfficer={(complaint) => {
              setSelectedComplaint(complaint);
              setShowAssignmentModal(true);
            }}
            onComplaintAction={handleComplaintAction}
          />
        )}

        {/* Officer Management Page */}
        {activePage === 'officers' && (
          <OfficerManagementPage
            officers={officers}
            complaints={complaints}
            createBtnRef={createOfficerBtnRef}
            officersTableRef={officersTableRef}
            onAssignComplaint={(complaint) => {
              setSelectedComplaint(complaint);
              setShowAssignmentModal(true);
            }}
            onCreateOfficer={async ({ fullName, email, password, wageType }) => {
              await dataService.createOfficer({ fullName, email, password, wageType });
              await loadOfficers();
            }}
            onChat={null}
          />
        )}

        {/* Live Map Tracking Page */}
        {activePage === 'map' && (
          <MapTrackingPage
            complaints={complaints}
            officers={officers}
            tourRef={mapContainerRef}
            onViewComplaint={(complaint) => {
              setSelectedComplaint(complaint);
              setShowComplaintModal(true);
            }}
          />
        )}

        {/* Verification & Closure Page */}
        {activePage === 'verification' && (
          <VerificationPage
            complaints={complaints}
            tourRef={verificationTableRef}
            onVerifyComplaint={handleComplaintAction}
            onViewComplaint={(complaint) => {
              setSelectedComplaint(complaint);
              setShowComplaintModal(true);
            }}
          />
        )}

        {/* Communication Page */}
        {activePage === 'communication' && (
          <CommunicationPage
            recentMessages={recentMessages}
            complaints={complaints}
            officers={officers}
            lastSeenMessageAt={lastSeenMessageAt}
            tourRef={commsListRef}
            onOpenDirectChat={(senderId) => {
              const found = officers.find(o => String(o?._id) === String(senderId));
              if (found) {
                setDirectChatRecipient({ ...found, role: 'field-officer' });
              }
            }}
          />
        )}

        {/* Reports & Analytics Page */}
        {activePage === 'reports' && (
          <ReportsPage
            stats={dashboardStats}
            complaints={complaints}
            officers={officers}
            tourRef={chartsContainerRef}
          />
        )}
      </div>

      {/* Complaint Details Modal */}
      {showComplaintModal && selectedComplaint && (
        <ComplaintDetailsModal
          complaint={selectedComplaint}
          departments={departments}
          onClose={() => setShowComplaintModal(false)}
          onAction={handleComplaintAction}
          onAssignOfficer={async () => {
            setShowComplaintModal(false);
            try {
              const list = await dataService.getAvailableOfficersForComplaint(selectedComplaint._id);
              setAssignmentCandidates(list);
            } catch (_) {
              setAssignmentCandidates([]);
            }
            setShowAssignmentModal(true);
          }}
        />
      )}

      {/* Officer Assignment Modal */}
      {showAssignmentModal && selectedComplaint && (
        <OfficerAssignmentModal
          complaint={selectedComplaint}
          officers={assignmentCandidates.length ? assignmentCandidates : officers}
          onClose={() => setShowAssignmentModal(false)}
          onAssign={handleOfficerAssignment}
        />
      )}

      {/* Completion Success Popup */}
      {showCompletionPopup && completedComplaint && (
        <CompletionPopup
          complaint={completedComplaint}
          onClose={() => {
            setShowCompletionPopup(false);
            setCompletedComplaint(null);
          }}
        />
      )}

      {directChatRecipient && user && (
        <DirectChatModal
          recipient={directChatRecipient}
          currentUser={user}
          onClose={() => setDirectChatRecipient(null)}
        />
      )}

      {/* Tour Language Selection Modal */}
      {showTourLangModal && (
        <div className="tour-modal-overlay">
          <div className="tour-modal">
            <div className="tour-modal-icon">
              <i className="fas fa-map-signs"></i>
            </div>
            <h2>Quick Guide</h2>
            <p>Welcome to your new dashboard! Would you like a quick professional tour to help you get started? Choose your language below.</p>
            <div className="lang-options">
              <button type="button" className="lang-btn" onClick={() => startTour('english')}>
                <i className="fas fa-globe-americas"></i>
                <span>English</span>
                <span>International</span>
              </button>
              <button type="button" className="lang-btn" onClick={() => startTour('urdu')}>
                <i className="fas fa-language"></i>
                <span>اردو</span>
                <span>مقامی زبان</span>
              </button>
            </div>
            <button type="button" className="tour-skip-link" onClick={() => {
              setShowTourLangModal(false);
              localStorage.setItem(`deptAdminTourSeen_${activePage}`, 'true');
            }}>
              Skip tour for now
            </button>
          </div>
        </div>
      )}

      {/* Notification Popup (Center Modal) */}
      {showNotification && (
        <div className="notification-popup-overlay">
          <div className={`notification-popup active ${notificationType}`}>
            <div className={`notification-icon ${notificationType}`}>
              <i className={`fas ${
                notificationType === 'success' ? 'fa-check-circle' : 
                notificationType === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
              }`}></i>
            </div>
            <div className="notification-content">
              <h3 className="notification-title">
                {notificationType === 'success' ? (t('success') || 'Success') : 
                 notificationType === 'error' ? (t('error') || 'Error') : (t('info') || 'Info')}
              </h3>
              <div className="notification-message">{notificationMessage}</div>
            </div>
            <button 
              className={`notification-close-btn ${notificationType}`}
              onClick={() => setShowNotification(false)}
            >
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Guided Tour Overlay */}
      {tourOpen && (
        <div className="tour-overlay">
          <div className="tour-dim" onClick={closeTour} />
          {tourRect && (
            <div 
              className="tour-highlight"
              style={{
                top: `${tourRect.top}px`,
                left: `${tourRect.left}px`,
                width: `${tourRect.width}px`,
                height: `${tourRect.height}px`
              }}
            />
          )}
          <div 
            className="tour-tooltip"
            style={{ 
              top: `${tourTooltipPos.top}px`, 
              left: `${tourTooltipPos.left}px`
            }}
          >
            <div className="tour-step-indicator">
              Step {tourIndex + 1} of {tourSteps.length}
            </div>
            <div className="tour-title">{tourSteps[tourIndex]?.title}</div>
            <div className="tour-body">{tourSteps[tourIndex]?.body}</div>
            <div className="tour-actions">
              <button className="tour-btn ghost" onClick={closeTour}>
                {language === 'urdu' ? 'چھوڑیں' : 'Skip'}
              </button>
              <div className="tour-actions-right">
                <button 
                  className="tour-btn ghost" 
                  onClick={prevTour}
                  disabled={tourIndex === 0}
                >
                  {language === 'urdu' ? 'پیچھے' : 'Back'}
                </button>
                <button className="tour-btn primary" onClick={nextTour}>
                  {tourIndex === tourSteps.length - 1 
                    ? (language === 'urdu' ? 'ختم کریں' : 'Finish') 
                    : (language === 'urdu' ? 'اگلا' : 'Next')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dashboard Page Component
const DashboardPage = ({ stats, complaints, officers, onViewComplaint, statsRef, recentRef, activeRef }) => {
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const v = t(key);
    if (!v || v === key) return fallback;
    return v;
  };
  const overdueCount = Array.isArray(complaints) ? complaints.filter(c => c.dueDate && new Date(c.dueDate) < new Date() && !['resolved','completed'].includes(c.status)).length : 0;
  const resolvedToday = Array.isArray(complaints) ? complaints.filter(c => {
    if (!c.updatedAt) return false;
    const d = new Date(c.updatedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString() && (c.status === 'resolved' || c.status === 'completed');
  }).length : 0;
  return (
  <div className="page-content active">
    <h2 className="form-title">{t('deptAdminDashboard')}</h2>
    
    <div className="dashboard-cards" ref={statsRef}>
      {[
        { value: stats.totalComplaints, title: t('totalComplaints'), icon: 'fa-clipboard-list', type: 'total' },
        { value: stats.pendingComplaints, title: t('pending'), icon: 'fa-clock', type: 'pending' },
        { value: stats.inProgressComplaints, title: t('inProgress'), icon: 'fa-spinner', type: 'progress' },
        { value: resolvedToday || stats.resolvedComplaints, title: resolvedToday ? (t('resolved') + ' ' + tr('today', 'Today')) : t('resolved'), icon: 'fa-check-circle', type: 'resolved' },
        { value: overdueCount, title: tr('overdueOnly', 'Overdue'), icon: 'fa-exclamation-triangle', type: 'danger' },
      ].map(card => (
        <div key={card.type} className="card">
          <div className="card-body">
            <div className={`card-icon ${card.type}`}>
              <i className={`fas ${card.icon}`}></i>
            </div>
            <div className="card-info">
              <div className="card-value">{card.value}</div>
              <div className="card-title">{card.title}</div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="dashboard-grid">
      <div className="recent-complaints" ref={recentRef}>
        <h3>{t('recentComplaints')}</h3>
        <div className="complaints-list">
          {complaints.map(complaint => (
            <div key={complaint._id} className="complaint-item" onClick={() => onViewComplaint(complaint)}>
              <div className="complaint-info">
                <div className="complaint-id">{complaint.complaintId}</div>
                <div className="complaint-category">{complaint.category}</div>
              </div>
              <div className="complaint-status">
                <span className={`status-badge status-${complaint.status}`}>
                  {complaint.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="active-officers" ref={activeRef}>
        <h3>{t('activeOfficers')}</h3>
        <div className="officers-list">
          {officers.map(officer => (
            <div key={officer._id} className="officer-item">
              <div className="officer-avatar">
                {officer.fullName?.charAt(0) || 'O'}
              </div>
              <div className="officer-info">
                <div className="officer-name">{officer.fullName}</div>
                <div className="officer-status">
                  <div className="status-dot online"></div>
                  <span>{t('active')}</span>
                </div>
              </div>
              <div className="officer-stats">
                <div className="stat-value">{officer.activeComplaints || 0}</div>
                <div className="stat-label">{t('active')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};

// Complaint Management Page Component
const ComplaintManagementPage = ({ complaints, filters, onFilterChange, onViewComplaint, onAssignOfficer, onComplaintAction, setFiltersVersion, filterBarRef, complaintsTableRef }) => {
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const v = t(key);
    if (!v || v === key) return fallback;
    return v;
  };
  const [sortBy, setSortBy] = React.useState({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const handleSort = (key) => {
    setSortBy(prev => {
      const dir = prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc';
      return { key, dir };
    });
  };
  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
    setPage(1);
  };
  const isOverdue = (complaint) => {
    if (!complaint.dueDate) return false;
    return new Date(complaint.dueDate) < new Date();
  };

  // Helper for translated status
  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return t('pending');
      case 'in-progress': 
      case 'progress': return t('inProgress');
      case 'resolved': return t('resolved');
      case 'completed': return t('completed');
      case 'rejected': return t('rejected');
      default: return status;
    }
  };

  // Helper for translated priority
  const getPriorityText = (priority) => {
    switch(priority) {
      case 'low': return t('priorityLow');
      case 'medium': return t('priorityMedium');
      case 'high': return t('priorityHigh');
      case 'critical': return t('priorityCritical');
      default: return priority;
    }
  };

  const availableCategories = React.useMemo(() => {
    const set = new Set();
    (complaints || []).forEach((c) => {
      if (c?.category) set.add(c.category);
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [complaints]);

  const sorted = React.useMemo(() => {
    if (!Array.isArray(complaints)) return [];
    const arr = [...complaints];
    const { key, dir } = sortBy;
    arr.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const na = av ? (new Date(av).toString() !== 'Invalid Date' ? new Date(av).getTime() : String(av).toLowerCase()) : '';
      const nb = bv ? (new Date(bv).toString() !== 'Invalid Date' ? new Date(bv).getTime() : String(bv).toLowerCase()) : '';
      if (na < nb) return dir === 'asc' ? -1 : 1;
      if (na > nb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [complaints, sortBy]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return (
    <div className="page-content active">
      <h2 className="form-title">{t('complaintManagement')}</h2>
      
      <div className="filters" ref={filterBarRef}>
        <div className="filter-group">
          <label className="filter-label">{t('searchPlaceholder')}</label>
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
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
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
            <option value="unassigned">{tr('unassigned', 'Unassigned')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="under-review">{tr('underReview', 'Under Review')}</option>
            <option value="in-progress">{t('inProgress')}</option>
            <option value="resolved">{t('resolved')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="rejected">{t('rejected')}</option>
          </select>
        </div>
        <button className="action-btn" title={tr('advanced', 'Advanced')} onClick={() => setShowAdvanced(v => !v)} style={{alignSelf: 'flex-end'}}>
          <i className="fas fa-sliders-h"></i>
        </button>
      </div>

      {showAdvanced && (
      <div className="filters" style={{ marginTop: 0 }}>
        <div className="filter-group">
          <label className="filter-label">{tr('fromDate', 'From Date')}</label>
          <input
            type="date"
            className="filter-input"
            value={filters.fromDate}
            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">{tr('toDate', 'To Date')}</label>
          <input
            type="date"
            className="filter-input"
            value={filters.toDate}
            onChange={(e) => handleFilterChange('toDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">{tr('area', 'Area')}</label>
          <input
            type="text"
            className="filter-input"
            placeholder={tr('area', 'Area')}
            value={filters.area}
            onChange={(e) => handleFilterChange('area', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">{tr('region', 'Region')}</label>
          <input
            type="text"
            className="filter-input"
            placeholder={tr('region', 'Region')}
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">{t('priority')}</label>
          <select 
            className="filter-select" 
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="all">{t('allPriorities')}</option>
            <option value="low">{t('priorityLow')}</option>
            <option value="medium">{t('priorityMedium')}</option>
            <option value="high">{t('priorityHigh')}</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">{tr('overdueOnly', 'Overdue Only')}</label>
          <input
            type="checkbox"
            className="filter-checkbox"
            checked={!!filters.overdueOnly}
            onChange={(e) => handleFilterChange('overdueOnly', e.target.checked)}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="action-btn" title={tr('applyFilters', 'Apply Filters')} onClick={() => setFiltersVersion(v => v + 1)}>
            <i className="fas fa-filter"></i>
          </button>
          <button className="action-btn" title={tr('resetFilters', 'Reset Filters')} onClick={() => { onFilterChange({ search:'', category:'all', status:'all', priority:'all', officer:'all', fromDate:'', toDate:'', area:'', region:'', overdueOnly:false }); setFiltersVersion(v => v + 1); }}>
            <i className="fas fa-undo"></i>
          </button>
        </div>
      </div>
      )}

      <div className="complaints-table table-responsive" ref={complaintsTableRef}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('complaintId')} aria-sort={sortBy.key==='complaintId'?sortBy.dir:'none'}>{t('complaintId')}</th>
              <th onClick={() => handleSort('category')} aria-sort={sortBy.key==='category'?sortBy.dir:'none'}>{t('category')}</th>
              <th onClick={() => handleSort('citizenName')} aria-sort={sortBy.key==='citizenName'?sortBy.dir:'none'}>{t('citizen')}</th>
              <th onClick={() => handleSort('status')} aria-sort={sortBy.key==='status'?sortBy.dir:'none'}>{t('status')}</th>
              <th onClick={() => handleSort('priority')} aria-sort={sortBy.key==='priority'?sortBy.dir:'none'}>{t('priority')}</th>
              <th>{t('assignedTo')}</th>
              <th onClick={() => handleSort('dueDate')} aria-sort={sortBy.key==='dueDate'?sortBy.dir:'none'}>{tr('dueDate', 'Due Date')}</th>
              <th onClick={() => handleSort('createdAt')} aria-sort={sortBy.key==='createdAt'?sortBy.dir:'none'}>{t('created')}</th>
              <th>{tr('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(complaint => (
              <tr key={complaint._id} style={{ backgroundColor: isOverdue(complaint) ? '#fff0f0' : undefined }}>
                <td>{complaint.complaintId}</td>
                <td>{complaint.category}</td>
                <td>{complaint.citizenName}</td>
                <td>
                  <span className={`status-badge status-${complaint.status}`}>
                    {getStatusText(complaint.status)}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge priority-${complaint.priority}`}>
                    {getPriorityText(complaint.priority)}
                  </span>
                </td>
                <td>{complaint.assignedTo?.fullName || t('unassigned')}</td>
                <td>{complaint.dueDate ? new Date(complaint.dueDate).toLocaleDateString() : '-'}</td>
                <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons" title={tr('actions', 'Actions')}>
                    <button 
                      className="action-btn view-details"
                      title={t('viewDetails')}
                      onClick={() => onViewComplaint(complaint)}
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    {!complaint.assignedTo && (
                      <button 
                        className="action-btn assign"
                        title={t('assignOfficer')}
                        onClick={() => onAssignOfficer(complaint)}
                      >
                        <i className="fas fa-user-plus"></i>
                      </button>
                    )}
                    <button 
                      className="action-btn priority"
                      title={t('markHighPriority') || 'Mark High Priority'}
                      onClick={() => onComplaintAction(complaint._id, 'priority', { priority: 'high' })}
                    >
                      <i className="fas fa-exclamation"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 12 }}>
          <div>
            <span>{tr('showing', 'Showing')} {(page-1)*pageSize + 1}-{Math.min(page*pageSize, total)} {tr('of', 'of')} {total}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <label>{tr('perPage', 'Per page')}</label>
            <select className="filter-select" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }}>
              {[10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="action-btn" title={tr('previous', 'Previous')} onClick={()=> setPage(p => Math.max(1, p-1))} disabled={page===1}><i className="fas fa-chevron-left"></i></button>
            <span>{page}/{pageCount}</span>
            <button className="action-btn" title={tr('next', 'Next')} onClick={()=> setPage(p => Math.min(pageCount, p+1))} disabled={page===pageCount}><i className="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Officer Management Page Component
const OfficerManagementPage = ({ officers, complaints, onAssignComplaint, onCreateOfficer, onChat, createBtnRef, officersTableRef }) => {
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const v = t(key);
    if (!v || v === key) return fallback;
    return v;
  };
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordRequirements, setPasswordRequirements] = React.useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [wageType, setWageType] = React.useState('Monthly');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const pass = String(password || '');
    setPasswordRequirements({
      length: pass.length >= 6,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /\d/.test(pass),
      special: /[^a-zA-Z0-9]/.test(pass)
    });
  }, [password]);

  const meetsPasswordRequirements =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (!meetsPasswordRequirements) {
        throw new Error(t('passwordDoesNotMeetRequirements') || 'Password does not meet requirements');
      }
      await onCreateOfficer({ fullName, email, password, wageType });
      setFullName('');
      setEmail('');
      setPassword('');
      setWageType('Monthly');
    } catch (err) {
      setError(err?.message || t('failedToCreateOfficer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-content active">
      <h2 className="form-title">{t('officerManagement')}</h2>

      <div className="complaints-filters" style={{ marginBottom: 20 }} ref={createBtnRef}>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <input className="filter-input" placeholder={t('fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="filter-input" type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="da-password-field">
            <input className="filter-input" type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="da-password-requirements">
              <div className="da-password-requirements-title">{t('passwordRequirements') || 'Password Requirements'}</div>
              <div className={`da-req-item ${passwordRequirements.length ? 'met' : ''}`}>
                <i className={`fas ${passwordRequirements.length ? 'fa-check-circle' : 'fa-circle'}`}></i>
                <span>{t('min6Chars') || 'Minimum 6 characters'}</span>
              </div>
              <div className="da-req-row">
                <div className={`da-req-item ${passwordRequirements.uppercase ? 'met' : ''}`}>
                  <i className={`fas ${passwordRequirements.uppercase ? 'fa-check-circle' : 'fa-circle'}`}></i>
                  <span>{t('uppercase') || 'Uppercase'}</span>
                </div>
                <div className={`da-req-item ${passwordRequirements.lowercase ? 'met' : ''}`}>
                  <i className={`fas ${passwordRequirements.lowercase ? 'fa-check-circle' : 'fa-circle'}`}></i>
                  <span>{t('lowercase') || 'Lowercase'}</span>
                </div>
              </div>
              <div className="da-req-row">
                <div className={`da-req-item ${passwordRequirements.number ? 'met' : ''}`}>
                  <i className={`fas ${passwordRequirements.number ? 'fa-check-circle' : 'fa-circle'}`}></i>
                  <span>{t('number') || 'Number'}</span>
                </div>
                <div className={`da-req-item ${passwordRequirements.special ? 'met' : ''}`}>
                  <i className={`fas ${passwordRequirements.special ? 'fa-check-circle' : 'fa-circle'}`}></i>
                  <span>{t('specialChar') || 'Special Char'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="wage-select-wrapper" style={{ position: 'relative' }}>
            <select 
              className="filter-select" 
              value={wageType} 
              onChange={(e) => setWageType(e.target.value)}
              style={{ width: '100%', appearance: 'none', paddingRight: '30px' }}
            >
              <option value="Monthly">{tr('monthly', 'Monthly Wage')}</option>
              <option value="Weekly">{tr('weekly', 'Weekly Wage')}</option>
              <option value="Hourly">{tr('hourly', 'Hourly Wage')}</option>
            </select>
            <i className="fas fa-chevron-down" style={{ 
              position: 'absolute', 
              right: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#666',
              pointerEvents: 'none',
              fontSize: '0.8rem'
            }}></i>
          </div>

          <button className="btn btn-success" type="submit" disabled={isSubmitting}>{isSubmitting ? t('creating') : t('registerFieldOfficer')}</button>
        </form>
        {error && <div className="status-badge status-pending">{error}</div>}
      </div>

      <div className="officers-grid" ref={officersTableRef}>
        {officers.map(officer => (
          <div key={officer._id} className="officer-card">
            <div className="officer-header">
              <div className="officer-avatar">
                {officer.fullName?.charAt(0) || 'O'}
              </div>
              <div className="officer-info">
                <h3>{officer.fullName}</h3>
                <p>{officer.email}</p>
                <p className="officer-wage" style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                  <i className="fas fa-money-bill-wave"></i> {officer.wageType || 'Monthly'}
                </p>
                <div className="officer-status">
                  <div className="status-dot online"></div>
                  <span>{t('active')}</span>
                </div>
              </div>
            </div>

            <div className="officer-stats">
              <div className="stat-item">
                <div className="stat-value">{officer.activeComplaints || 0}</div>
                <div className="stat-label">{t('active')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{officer.resolvedThisMonth || 0}</div>
                <div className="stat-label">{t('resolvedLabel')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{officer.avgResolutionTime || 0}h</div>
                <div className="stat-label">{t('avgTime')}</div>
              </div>
            </div>

            <div className="officer-actions">
              <button className="btn btn-primary">
                <i className="fas fa-eye"></i> {t('viewDetails')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Live Map Tracking Page Component
const MapTrackingPage = ({ complaints, officers, onViewComplaint, tourRef }) => {
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [filters, setFilters] = useState({
    category: 'all',
    officer: 'all'
  });

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const L = window.L;
      if (!L) return;

      // Default center (Lahore)
      mapInstanceRef.current = L.map(mapRef.current).setView([31.5204, 74.3587], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Filter and Add Complaint Markers
    complaints.forEach(c => {
      // Apply filters
      if (filters.category !== 'all' && c.category !== filters.category) return;
      if (filters.officer !== 'all' && c.assignedTo?._id !== filters.officer && c.assignedTo?.user?._id !== filters.officer) return;

      // Get coordinates
      const lat = c.location?.lat || (c.location?.coordinates ? c.location.coordinates[1] : null);
      const lng = c.location?.lng || (c.location?.coordinates ? c.location.coordinates[0] : null);

      if (lat && lng) {
        let color = '#f59e0b'; // pending - orange
        if (c.status === 'progress' || c.status === 'in-progress') color = '#3b82f6'; // blue
        if (c.status === 'resolved') color = '#10b981'; // green

        const marker = L.circleMarker([lat, lng], {
          radius: 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">${c.category}</h4>
            <p style="margin: 0 0 5px 0; color: #666;"><strong>ID:</strong> ${c.complaintId}</p>
            <p style="margin: 0 0 5px 0; color: #666;"><strong>Status:</strong> ${c.status}</p>
            <button class="btn-view-details" style="
              background: #1E3A8A; color: white; border: none; 
              padding: 5px 10px; border-radius: 4px; cursor: pointer; 
              font-size: 12px; width: 100%; margin-top: 5px;">
              View Details
            </button>
          </div>
        `;

        // Add click listener to button
        const btn = popupContent.querySelector('.btn-view-details');
        if (btn) {
          btn.addEventListener('click', () => onViewComplaint(c));
        }

        marker.bindPopup(popupContent);
      }
    });

    // Add Officer Markers
    officers.forEach(o => {
      if (filters.officer !== 'all' && o._id !== filters.officer && o.user?._id !== filters.officer) return;

      // Assuming officer has currentLocation or location field
      // Checking both structure possibilities
      const location = o.currentLocation || o.location;
      const lat = location?.lat || (location?.coordinates ? location.coordinates[1] : null);
      const lng = location?.lng || (location?.coordinates ? location.coordinates[0] : null);

      if (lat && lng) {
        const officerIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            background-color: #1E3A8A;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          "><i class="fas fa-user-shield" style="color: white; font-size: 14px;"></i></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker([lat, lng], { icon: officerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="text-align: center;">
              <strong>${o.fullName}</strong><br/>
              <small>${o.department}</small><br/>
              <span style="color: #28a745;">${o.activeComplaints || 0} Active Tasks</span>
            </div>
          `);
      }
    });

  }, [complaints, officers, filters, onViewComplaint]);

  return (
  <div className="page-content active">
    <h2 className="form-title">{t('liveMapTracking')}</h2>
    
    <div className="map-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <div className="map-controls" style={{ padding: '15px', background: 'white', borderRadius: '8px', marginBottom: '15px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="map-filters" style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="filter-select" 
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">{t('allCategories')}</option>
            <option value="Water Supply">{t('waterSupply') || 'Water Supply'}</option>
            <option value="Electricity">{t('electricity') || 'Electricity'}</option>
            <option value="Sanitation">{t('sanitation') || 'Sanitation'}</option>
            <option value="Roads">{t('roads') || 'Roads'}</option>
          </select>
          <select 
            className="filter-select"
            value={filters.officer}
            onChange={(e) => setFilters(prev => ({ ...prev, officer: e.target.value }))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="all">{t('allOfficers')}</option>
                {(officers || []).map(officer => (
                  <option key={officer._id} value={officer._id}>{officer.fullName}</option>
                ))}
          </select>
        </div>
        <div className="map-legend" style={{ display: 'flex', gap: '15px', marginLeft: 'auto' }}>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <span>{t('pending')}</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
            <span>{t('inProgress')}</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
            <span>{t('resolvedLabel')}</span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#1E3A8A', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></div>
            <span>{t('officer')}</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={(el) => { mapRef.current = el; tourRef.current = el; }} 
        className="map-view" 
        style={{ flex: 1, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 1 }}
      ></div>
    </div>
  </div>
  );
};

// Verification Page Component
const VerificationPage = ({ complaints, onVerifyComplaint, onViewComplaint, tourRef }) => {
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const v = t(key);
    if (!v || v === key) return fallback;
    return v;
  };
  return (
  <div className="page-content active">
    <h2 className="form-title">{t('verificationClosure')}</h2>
    
    <div className="verification-list" ref={tourRef}>
      {complaints.filter(c => c.status === 'resolved').length === 0 ? (
        <div className="no-data-message" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <i className="fas fa-check-circle" style={{ fontSize: '48px', marginBottom: '15px', color: '#ccc' }}></i>
          <p style={{ fontSize: '1.1rem' }}>{tr('noPendingVerifications', 'No pending verifications')}</p>
        </div>
      ) : (
        complaints.filter(c => c.status === 'resolved').map(complaint => (
          <div key={complaint._id} className="verification-item">
          <div className="verification-header">
            <div className="complaint-info">
              <h3>{complaint.complaintId}</h3>
              <p>{complaint.description}</p>
              <div className="complaint-meta">
                <span className="category">{complaint.category}</span>
                <span className="priority">{complaint.priority}</span>
                <span className="officer">{t('officer')}: {complaint.assignedTo?.fullName}</span>
              </div>
            </div>
            <div className="verification-status">
              <span className="status-badge status-resolved">{t('resolvedLabel')}</span>
            </div>
          </div>
          
          <div className="verification-content">
            <div className="evidence-section">
              <h4>{t('evidenceSubmitted')}</h4>
              <div className="evidence-gallery">
                {complaint.evidence?.map((evidence, index) => (
                  <div key={index} className="evidence-item">
                    <div className="evidence-preview">
                      <i className="fas fa-image"></i>
                    </div>
                    <div className="evidence-info">
                      <div className="evidence-description">{evidence.description}</div>
                      <div className="evidence-date">{new Date(evidence.uploadedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="resolution-details">
              <h4>{t('resolutionDetails')}</h4>
              <p>{complaint.resolutionDetails || t('noDetailsProvided')}</p>
            </div>
          </div>
          
          <div className="verification-actions">
            <button 
              className="btn btn-success"
              onClick={() => onVerifyComplaint(complaint._id, 'verify', { verified: true })}
            >
              <i className="fas fa-check"></i> {t('approve')}
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => onVerifyComplaint(complaint._id, 'reject', { verified: false })}
            >
              <i className="fas fa-times"></i> {t('reject')}
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => onViewComplaint(complaint)}
            >
              <i className="fas fa-eye"></i> {t('viewDetails')}
            </button>
          </div>
        </div>
      )))}
    </div>
  </div>
  );
};

// Communication Page Component
const CommunicationPage = ({ recentMessages, complaints, officers, lastSeenMessageAt, onOpenDirectChat, tourRef }) => {
  const { t } = useLanguage();
  return (
  <div className="page-content active">
    <h2 className="form-title">{t('communicationCenter')}</h2>
    
    <div className="communication-grid" ref={tourRef}>
      <div className="messages-section">
        <h3>{t('recentMessages')}</h3>
        <div className="messages-list">
          {recentMessages.length === 0 ? (
            <div className="no-messages">{t('noMessages')}</div>
          ) : (
            recentMessages.map(message => (
              <div 
                key={message._id} 
                className={`message-item clickable ${new Date(message.createdAt).getTime() > lastSeenMessageAt ? 'new' : ''}`}
                onClick={() => {
                  if (message.senderId && typeof onOpenDirectChat === 'function') {
                    onOpenDirectChat(message.senderId);
                  }
                }}
              >
                <div className="message-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="message-content">
                  <div className="message-title">{message.title}</div>
                  <div className="message-text">{message.message}</div>
                  <div className="message-time">{new Date(message.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="escalation-section">
        <h3>{t('escalationQueue')}</h3>
        <div className="escalation-list">
          {complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').map(complaint => (
            <div key={complaint._id} className="escalation-item">
              <div className="escalation-info">
                <div className="complaint-id">{complaint.complaintId}</div>
                <div className="escalation-reason">{t('highPriorityOverdue')}</div>
              </div>
              <button className="btn btn-warning">
                <i className="fas fa-arrow-up"></i> {t('escalate')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};

// Reports Page Component
const ReportsPage = ({ stats, complaints, officers, tourRef }) => {
  const { t } = useLanguage();
  
  // Prepare data for charts
  const statusData = [
    { name: t('pending'), value: stats.pendingComplaints || 0, color: '#ff4d4f' },
    { name: t('inProgress'), value: stats.inProgressComplaints || 0, color: '#1890ff' },
    { name: t('resolved'), value: stats.resolvedComplaints || 0, color: '#52c41a' },
    { name: t('completed'), value: stats.completedComplaints || 0, color: '#faad14' }
  ].filter(item => item.value > 0);

  // Category data
  const categoryCount = complaints.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});
  
  const categoryData = Object.keys(categoryCount).map(cat => ({
    name: cat,
    value: categoryCount[cat]
  }));

  // Officer Performance Data
  const officerPerformanceData = officers.map(officer => ({
    name: officer.fullName,
    resolved: officer.resolvedThisMonth || 0,
    active: officer.activeComplaints || 0
  }));

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(26, 42, 108); // Primary Color
    doc.text(t('departmentReport'), 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${t('generatedOn')}: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    
    // Summary Stats
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(t('summaryStatistics'), 14, 35);
    
    const summaryData = [
      [t('totalComplaints'), stats.totalComplaints],
      [t('pending'), stats.pendingComplaints],
      [t('inProgress'), stats.inProgressComplaints],
      [t('resolved'), stats.resolvedComplaints],
      [t('avgResolutionTime'), `${stats.avgResolutionTime}h`]
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [[t('metric'), t('value')]],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [26, 42, 108] },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });
    
    // Detailed Complaints List
    doc.text(t('detailedComplaintList'), 14, doc.lastAutoTable.finalY + 15);
    
    const complaintsData = complaints.map(c => [
      c.complaintId,
      c.category,
      c.status,
      c.priority,
      c.assignedTo?.fullName || t('unassigned'),
      new Date(c.createdAt).toLocaleDateString()
    ]);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [[t('id'), t('category'), t('status'), t('priority'), t('assignedTo'), t('date')]],
      body: complaintsData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`department_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Complaints Report');
    
    // Header
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Description', key: 'description', width: 50 }
    ];
    
    // Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2A6C' } };
    });
    
    complaints.forEach(c => {
      const row = worksheet.addRow({
        id: c.complaintId,
        title: c.title,
        category: c.category,
        status: c.status,
        priority: c.priority,
        assignedTo: c.assignedTo?.fullName || 'Unassigned',
        date: new Date(c.createdAt).toLocaleDateString(),
        description: c.description
      });

      const statusCell = row.getCell('status');
      let argbColor = 'FFFFFFFF';
      let fontColor = 'FF000000';

      switch(c.status?.toLowerCase()) {
        case 'pending': 
          argbColor = 'FFFF4D4F'; // Red
          fontColor = 'FFFFFFFF'; // White
          break;
        case 'in-progress':
        case 'progress':
          argbColor = 'FF1890FF'; // Blue
          fontColor = 'FFFFFFFF'; // White
          break;
        case 'resolved': 
          argbColor = 'FF52C41A'; // Green
          fontColor = 'FFFFFFFF'; // White
          break;
        case 'completed': 
          argbColor = 'FFFAAD14'; // Yellow
          fontColor = 'FF000000'; // Black
          break;
        default: 
          argbColor = 'FFFFFFFF';
      }

      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: argbColor }
      };
      
      statusCell.font = {
        color: { argb: fontColor },
        bold: true
      };
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `complaints_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };

  return (
    <div className="page-content active">
      <div className="reports-header">
        <h2 className="form-title">{t('reportsAnalytics')}</h2>
        <div className="report-buttons">
          <button className="btn btn-primary" onClick={handleGeneratePDF}>
            <i className="fas fa-file-pdf"></i> {t('pdfReport')}
          </button>
          <button className="btn btn-success" onClick={handleGenerateExcel}>
            <i className="fas fa-file-excel"></i> {t('excelReport')}
          </button>
        </div>
      </div>
      
      <div className="analytics-dashboard" ref={tourRef}>
        {/* Status Distribution Chart */}
        <div className="chart-card">
          <h3>{t('complaintStatusDistribution')}</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Trends Chart */}
        <div className="chart-card">
          <h3>{t('complaintsByCategory')}</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#1E3A8A" name={t('complaints')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Officer Performance Chart */}
        <div className="chart-card full-width">
          <h3>{t('officerPerformance')}</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={officerPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="resolved" fill="#52c41a" name={t('resolvedThisMonth')} />
                <Bar dataKey="active" fill="#1890ff" name={t('activeComplaints')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Complaint Details Modal Component
const ComplaintDetailsModal = ({ complaint, departments, onClose, onAction, onAssignOfficer }) => {
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const v = t(key);
    if (!v || v === key) return fallback;
    return v;
  };
  const getPriorityText = (priority) => {
    switch(priority) {
      case 'low': return t('priorityLow');
      case 'medium': return t('priorityMedium');
      case 'high': return t('priorityHigh');
      case 'critical': return t('priorityCritical');
      default: return priority;
    }
  };
  const [dueDateInput, setDueDateInput] = React.useState(complaint.dueDate ? new Date(complaint.dueDate).toISOString().slice(0,10) : '');
  const [rerouteDepartmentId, setRerouteDepartmentId] = React.useState('');
  const [rerouteReason, setRerouteReason] = React.useState('');
  const normalizedStatus = String(complaint.status || '').toLowerCase();
  const isResolved = normalizedStatus === 'resolved' || normalizedStatus === 'completed';
  const isInProgress = normalizedStatus === 'in-progress' || normalizedStatus === 'progress';
  const isAssigned = Boolean(complaint.assignedTo);
  const isVerified = Boolean(complaint.verified);

  let workflowIndex = 0;
  if (isVerified) workflowIndex = 1;
  if (isAssigned) workflowIndex = 2;
  if (isInProgress) workflowIndex = 3;
  if (isResolved) workflowIndex = 4;

  const workflowSteps = [
    { key: 'submitted', label: tr('submitted', 'Submitted') },
    { key: 'verified', label: tr('verified', 'Verified') },
    { key: 'assigned', label: tr('assigned', 'Assigned') },
    { key: 'inProgress', label: t('inProgress') },
    { key: 'resolved', label: t('resolved') }
  ];
  return (
  <div className="modal-overlay active">
    <div className="modal modal-lg">
      <div className="modal-header">
        <h3 className="modal-title">{t('complaintDetails')} - {complaint.complaintId}</h3>
        <button className="close-modal" onClick={onClose}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="workflow-timeline">
          <div className="workflow-title">{tr('complaintWorkflow', 'Complaint Workflow Timeline')}</div>
          <div className="workflow-steps">
            {workflowSteps.map((step, idx) => (
              <div
                key={step.key}
                className={`workflow-step ${idx < workflowIndex ? 'done' : ''} ${idx === workflowIndex ? 'active' : ''}`}
              >
                <div className="workflow-node">
                  <div className="workflow-dot"></div>
                  {idx < workflowSteps.length - 1 && (
                    <div className={`workflow-connector ${idx < workflowIndex ? 'done' : ''}`}></div>
                  )}
                </div>
                <div className="workflow-label">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="complaint-details-grid">
          <div className="detail-section">
            <h4>{t('complaintInformation')}</h4>
            <div className="detail-item">
              <label>{t('category')}:</label>
              <span>{complaint.category}</span>
            </div>
            <div className="detail-item">
              <label>{t('priority')}:</label>
              <span className={`priority-badge priority-${complaint.priority}`}>
                {getPriorityText(complaint.priority)}
              </span>
            </div>
            <div className="detail-item">
              <label>{t('status')}:</label>
              <span className={`status-badge status-${complaint.status}`}>
                {complaint.status}
              </span>
            </div>
            <div className="detail-item">
              <label>{t('description')}:</label>
              <p>{complaint.description}</p>
            </div>
          </div>
          
          <div className="detail-section">
            <h4>{t('citizenInformation')}</h4>
            <div className="detail-item">
              <label>{t('fullName')}:</label>
              <span>{complaint.citizenName}</span>
            </div>
            <div className="detail-item">
              <label>{t('contact')}:</label>
              <span>{complaint.contactNumber}</span>
            </div>
            <div className="detail-item">
              <label>{t('email')}:</label>
              <span>{complaint.email}</span>
            </div>
          </div>
          
          <div className="detail-section">
            <h4>{t('assignment')}</h4>
            <div className="detail-item">
              <label>{t('assignedTo')}:</label>
              <span>{complaint.assignedTo?.fullName || t('unassigned')}</span>
            </div>
            {complaint.assignedTo && (
              <div className="detail-item">
                <label>Officer Email:</label>
                <span>{complaint.assignedTo.email}</span>
              </div>
            )}
            <div className="detail-item">
              <label>{t('assignedDate')}:</label>
              <span>{complaint.assignedDate ? new Date(complaint.assignedDate).toLocaleString() : t('notAssigned')}</span>
            </div>
          </div>

          {complaint.feedback && (
            <div className="detail-section full-width" style={{ marginTop: '20px', background: '#f0f9ff', padding: '15px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              <h4 style={{ color: '#0369a1' }}><i className="fas fa-comment-dots"></i> {t('citizenFeedback') || 'Citizen Feedback'}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                <div className="feedback-stars" style={{ fontSize: '1.2rem', color: '#f1c40f' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <i key={star} className={`${complaint.feedback.rating >= star ? 'fas' : 'far'} fa-star`}></i>
                  ))}
                </div>
                <div className="feedback-sentiment" style={{ 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem',
                  background: complaint.feedback.sentiment === 'positive' ? '#dcfce7' : complaint.feedback.sentiment === 'negative' ? '#fee2e2' : '#f1f5f9',
                  color: complaint.feedback.sentiment === 'positive' ? '#166534' : complaint.feedback.sentiment === 'negative' ? '#991b1b' : '#475569'
                }}>
                  {String(complaint.feedback.sentiment || 'neutral').toUpperCase()}
                  {typeof complaint.feedback.sentimentScore === 'number' ? ` (${complaint.feedback.sentimentScore.toFixed(2)})` : ''}
                </div>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#334155' }}>"{complaint.feedback.comment}"</p>
            </div>
          )}
        </div>

        {complaint.timeline && complaint.timeline.length > 0 && (
          <div className="detail-section full-width" style={{ marginTop: '20px' }}>
            <h4>{tr('trackingHistory', 'Tracking & Action History')}</h4>
            <div className="tracking-timeline">
              {complaint.timeline.map((event, idx) => (
                <div key={idx} className="tracking-event">
                  <div className="event-time">{new Date(event.at).toLocaleString()}</div>
                  <div className="event-marker"></div>
                  <div className="event-content">
                    <div className="event-message">{event.message}</div>
                    <div className="event-by">By: {event.byRole || 'System'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          {(!complaint.assignedTo || isResolved) && (
            <button className={`btn ${isResolved ? 'btn-danger' : 'btn-primary'}`} onClick={onAssignOfficer}>
              <i className={`fas ${isResolved ? 'fa-redo' : 'fa-user-plus'}`}></i> {isResolved ? (t('reopenAndReassign') || 'Reopen & Reassign') : t('assignOfficer')}
            </button>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              className="form-control"
              value={rerouteDepartmentId}
              onChange={(e) => setRerouteDepartmentId(e.target.value)}
              style={{ minWidth: 220 }}
            >
              <option value="">{tr('rerouteTo', 'Reroute to department')}</option>
              {(departments || [])
                .filter(d => String(d?._id || '') !== String(complaint.departmentId || ''))
                .map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
            </select>
            <input
              className="filter-input"
              value={rerouteReason}
              onChange={(e) => setRerouteReason(e.target.value)}
              placeholder={tr('reasonOptional', 'Reason (optional)')}
              style={{ minWidth: 220 }}
            />
            <button
              className="btn btn-danger"
              onClick={() => onAction(complaint._id, 'reroute', { departmentId: rerouteDepartmentId, reason: rerouteReason })}
              disabled={!rerouteDepartmentId || isResolved}
              title={isResolved ? tr('notAllowedAfterClose', 'Not allowed after closure') : ''}
            >
              <i className="fas fa-random"></i> {tr('reroute', 'Reroute')}
            </button>
          </div>
          <button 
            className="btn btn-warning"
            onClick={() => onAction(complaint._id, 'priority', { priority: 'high' })}
          >
            <i className="fas fa-exclamation"></i> {t('markHighPriority')}
          </button>
          <button 
            className="btn btn-info"
            onClick={() => onAction(complaint._id, 'review', {})}
          >
            <i className="fas fa-eye"></i> {t('markUnderReview')}
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              className="filter-input"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
            />
            <button
              className="btn btn-outline"
              onClick={() => onAction(complaint._id, 'due-date', { dueDate: dueDateInput })}
              disabled={!dueDateInput}
            >
              <i className="fas fa-calendar-alt"></i> {tr('setDueDate', 'Set Due Date')}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

// Officer Assignment Modal Component
const OfficerAssignmentModal = ({ complaint, officers, onClose, onAssign }) => {
  const { t } = useLanguage();
  const [selectedOfficer, setSelectedOfficer] = React.useState('');

  const handleAssign = () => {
    if (selectedOfficer) {
      onAssign(complaint._id, selectedOfficer);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal modal-md">
        <div className="modal-header">
          <h3 className="modal-title">{t('assignOfficer')} - {complaint.complaintId}</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="assignment-info">
            <div className="info-card">
              <label>Category</label>
              <span>{complaint.category}</span>
            </div>
            <div className="info-card">
              <label>Priority</label>
              <span className={`priority-badge priority-${complaint.priority}`}>{complaint.priority}</span>
            </div>
          </div>
          
          <div className="officer-selection-list">
            <label className="section-label">Select Field Officer for Assignment</label>
            <div className="officer-cards-container">
              {(officers || []).map(officer => (
                <div 
                  key={officer._id} 
                  className={`officer-select-card ${selectedOfficer === (officer.user?._id || officer._id) ? 'selected' : ''}`}
                  onClick={() => setSelectedOfficer(officer.user?._id || officer._id)}
                >
                  <div className="officer-select-avatar">
                    {officer.fullName?.charAt(0)}
                  </div>
                  <div className="officer-select-info">
                    <div className="name">{officer.fullName}</div>
                    <div className="load-stats">
                      <span className="load-badge">
                        <i className="fas fa-tasks"></i> {officer.activeComplaints || 0} Active
                      </span>
                      <span className="performance-badge">
                        <i className="fas fa-check-circle"></i> {officer.resolvedThisMonth || 0} Resolved
                      </span>
                    </div>
                  </div>
                  <div className="select-indicator">
                    <i className="fas fa-check-circle"></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button className="btn btn-primary btn-full" onClick={handleAssign} disabled={!selectedOfficer}>
              <i className="fas fa-user-check"></i> Confirm Assignment
            </button>
            <button className="btn btn-outline btn-full" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Completion Success Popup Component
const CompletionPopup = ({ complaint, onClose }) => {
  const { t } = useLanguage();
  return (
    <div className="modal-overlay active completion-popup">
      <div className="modal completion-modal">
        <div className="completion-content">
          <div className="completion-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2 className="completion-title">{t('complaintCompletedSuccess')}</h2>
          <div className="completion-details">
            <div className="complaint-info">
              <h3>{complaint.complaintId}</h3>
              <p>{complaint.description}</p>
              <div className="complaint-meta">
                <span className="category">{complaint.category}</span>
                <span className="priority">{complaint.priority}</span>
                <span className="status">{t('status')}: <strong>{t('resolvedLabel')}</strong></span>
              </div>
            </div>
            <div className="completion-message">
              <p>{t('complaintVerifiedMessage')}</p>
            </div>
          </div>
          <div className="completion-actions">
            <button className="btn btn-success btn-large" onClick={onClose}>
              <i className="fas fa-thumbs-up"></i> {t('greatJob')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAdminDashboard;
