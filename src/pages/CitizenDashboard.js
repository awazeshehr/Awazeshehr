import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import dataService from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';
import ComplaintChatPanel from '../components/ComplaintChatPanel';
import { smartRewrite } from '../utils/smartRewriter';
import './CitizenDashboard.css';

const API_BASE_URL = dataService.apiBaseUrl;
const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${SERVER_URL}${url}`;
};

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 992);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    const onResize = () => {
      const nextIsMobile = window.innerWidth <= 992;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setSidebarMobileOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setChatMessages([
      {
        text: t('botGreeting'),
        sender: 'bot',
        quickReplies: [
          t('quickReplySubmit'),
          t('quickReplyStatus'),
          t('quickReplyServices')
        ]
      }
    ]);
  }, [t]);
  const [newMessage, setNewMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('success');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const selectedComplaintRef = useRef(null);

  useEffect(() => {
    selectedComplaintRef.current = selectedComplaint;
  }, [selectedComplaint]);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    unreadNotifications: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cnic: '',
    address: {
      street: '',
      city: '',
      postalCode: ''
    }
  });
  const [settings, setSettings] = useState({
    notifications: true,
    theme: 'light',
    language: 'english'
  });
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fileInputRef = useRef(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [addressPreview, setAddressPreview] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [areaType, setAreaType] = useState('Urban');
  const [sector, setSector] = useState('');
  const [ruralJurisdiction, setRuralJurisdiction] = useState('');
  
  // New State for Dynamic Hierarchy & Department Selection
  const [departments, setDepartments] = useState([]);
  const [availableSectors, setAvailableSectors] = useState([]);
  const [availableJurisdictions, setAvailableJurisdictions] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [availableServices, setAvailableServices] = useState([]);
  const [routingRecommendation, setRoutingRecommendation] = useState(null);
  const [isRoutingAnalyzing, setIsRoutingAnalyzing] = useState(false);
  const [departmentManuallySelected, setDepartmentManuallySelected] = useState(false);

  // Fetch initial data (Departments) and Sectors/Jurisdictions based on areaType
  useEffect(() => {
    const fetchHierarchyData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Departments
        const depRes = await fetch(`${dataService.apiBaseUrl}/complaints/data/departments`, { headers });
        const depData = await depRes.json();
        if (depData.success) {
          setDepartments(depData.departments);
        }

        // Fetch Sectors (Urban)
        const secRes = await fetch(`${dataService.apiBaseUrl}/complaints/data/sectors`, { headers });
        const secData = await secRes.json();
        if (secData.success) {
          setAvailableSectors(secData.sectors);
        }

        // Fetch Jurisdictions (Rural)
        const jurRes = await fetch(`${dataService.apiBaseUrl}/complaints/data/jurisdictions`, { headers });
        const jurData = await jurRes.json();
        if (jurData.success) {
          setAvailableJurisdictions(jurData.jurisdictions);
        }
      } catch (error) {
        console.error('Error fetching hierarchy data:', error);
      }
    };

    fetchHierarchyData();
  }, []);

  // Update available services when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      const dep = departments.find(d => d._id === selectedDepartmentId);
      if (dep) {
        setAvailableServices(dep.servicesOffered || []);
        setSelectedService(''); // Reset service selection
      }
    } else {
      setAvailableServices([]);
      setSelectedService('');
    }
  }, [selectedDepartmentId, departments]);

  useEffect(() => {
    const text = String(description || '').trim();
    if (!text) {
      setRoutingRecommendation(null);
      setIsRoutingAnalyzing(false);
      if (!departmentManuallySelected) setSelectedDepartmentId('');
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setIsRoutingAnalyzing(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${dataService.apiBaseUrl}/nlp/recommend-routing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ complaint_text: text })
        });
        const data = await res.json();
        if (!res.ok) return;
        setRoutingRecommendation(data);
        const recId = data?.recommendedDepartment?._id ? String(data.recommendedDepartment._id) : '';
        if (recId && !departmentManuallySelected) {
          setSelectedDepartmentId(recId);
        }
      } catch (e) {
      } finally {
        setIsRoutingAnalyzing(false);
      }
    }, 700);

    return () => clearTimeout(handle);
  }, [description, departmentManuallySelected]);

  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    if (!evidenceFiles || evidenceFiles.length === 0) {
      showNotificationMessage('Please select at least one file', 'error');
      return;
    }

    setIsUploadingEvidence(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      // Description is optional/auto-generated by backend now
      
      for (let i = 0; i < evidenceFiles.length; i++) {
        formData.append('evidence', evidenceFiles[i]);
      }

      const response = await fetch(`${dataService.apiBaseUrl}/complaints/${selectedComplaint._id}/citizen-evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showNotificationMessage('Evidence added successfully');
        // Update local state
        setSelectedComplaint(prev => ({
          ...prev,
          evidence: data.complaint.evidence
        }));
        // Reset form
        setEvidenceFiles([]);
        setShowEvidenceForm(false);
      } else {
        showNotificationMessage(data.message || 'Failed to add evidence', 'error');
      }
    } catch (error) {
      console.error('Error adding evidence:', error);
      showNotificationMessage('Error uploading evidence', 'error');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  // Check authentication and load user data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/role-selection');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'citizen') {
        navigate('/role-selection');
        return;
      }
      setUser(parsedUser);
      setProfileData({
        fullName: parsedUser.fullName || '',
        email: parsedUser.email || '',
        phone: parsedUser.phone || '',
        cnic: parsedUser.cnic || '',
        address: parsedUser.address || {
          street: '',
          city: '',
          postalCode: ''
        }
      });
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/role-selection');
    }
  }, [navigate]);

  // Initialize socket for real-time updates
  useEffect(() => {
    if (!user) return;
    
    const token = localStorage.getItem('token');
    const socket = io(SERVER_URL, {
      auth: { token: `Bearer ${token}` }
    });
    
    socket.on('complaintUpdate', (data) => {
      loadDashboardData();
      loadComplaints();
      
      // Refresh selected complaint details if it is currently open
      if (data && data.complaintId && selectedComplaintRef.current && 
         (selectedComplaintRef.current._id === data.complaintId || selectedComplaintRef.current.id === data.complaintId)) {
        refreshComplaintDetails(data.complaintId);
      }
    });
    
    socket.on('notificationUpdate', () => {
      loadNotifications();
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Load dashboard data based on active page
  useEffect(() => {
    if (user) {
      switch (activePage) {
        case 'dashboard':
          loadDashboardData();
          break;
        case 'my-complaints':
          loadComplaints();
          break;
        case 'notifications':
          loadNotifications();
          break;
        case 'profile':
          loadProfile();
          break;
        case 'settings':
          loadSettings();
          break;
        default:
          break;
      }
    }
  }, [activePage, user]);

  // Initialize map when component mounts
  useEffect(() => {
    if (activePage === 'submit-complaint' && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [activePage]);

  const initializeMap = () => {
    const L = window.L;
    if (L && mapRef.current) {
      // Set default location to Karachi
      const defaultLocation = [24.8607, 67.0011];
      
      mapInstanceRef.current = L.map(mapRef.current).setView(defaultLocation, 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
      
      // Add marker
      markerRef.current = L.marker(defaultLocation, { draggable: true })
        .addTo(mapInstanceRef.current)
        .bindPopup('Drag to adjust complaint location')
        .openPopup();
      
      // Add click event to map to move marker and update address
      mapInstanceRef.current.on('click', async function(e) {
        markerRef.current.setLatLng(e.latlng);
        const addr = await getAddressFromCoordinates(e.latlng.lat, e.latlng.lng);
        setAddressPreview(addr);
      });

      // Update address preview when marker drag ends
      markerRef.current.on('dragend', async function() {
        const { lat, lng } = markerRef.current.getLatLng();
        const addr = await getAddressFromCoordinates(lat, lng);
        setAddressPreview(addr);
      });
      // Initialize address preview
      (async () => {
        const addr = await getAddressFromCoordinates(defaultLocation[0], defaultLocation[1]);
        setAddressPreview(addr);
      })();
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const complaintsResponse = await fetch(`${dataService.apiBaseUrl}/complaints/my-complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const complaintsData = await complaintsResponse.json();

      if (complaintsData.success) {
        setComplaints(complaintsData.complaints || []);
        
        // Calculate stats from complaints
        const currentComplaints = complaintsData.complaints || [];
        const stats = {
          total: currentComplaints.length,
          pending: currentComplaints.filter(c => (c.status || '').toLowerCase() === 'pending').length,
          inProgress: currentComplaints.filter(c => {
            const s = (c.status || '').toLowerCase();
            return s === 'in-progress' || s === 'progress';
          }).length,
          resolved: currentComplaints.filter(c => (c.status || '').toLowerCase() === 'resolved').length,
          unreadNotifications: dashboardStats.unreadNotifications
        };
        console.log('Dashboard Stats Updated:', stats);
        setDashboardStats(stats);
      } else {
        console.warn('Failed to load complaints for stats:', complaintsData.message);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showNotificationMessage('Error loading dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshComplaintDetails = async (complaintId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/complaints/${complaintId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedComplaint(data.complaint);
      }
    } catch (error) {
      console.error('Error refreshing complaint details:', error);
    }
  };

  const loadComplaints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/complaints/my-complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
      showNotificationMessage('Error loading complaints', 'error');
    }
  };

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        // Update unread count
        const unreadCount = data.notifications.filter(n => !n.isRead).length;
        setDashboardStats(prev => ({
          ...prev,
          unreadNotifications: unreadCount
        }));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      showNotificationMessage('Error loading notifications', 'error');
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const updatedUser = data.user;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setProfileData({
          fullName: updatedUser.fullName || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          cnic: updatedUser.cnic || '',
          address: updatedUser.address || {
            street: '',
            city: '',
            postalCode: ''
          }
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showNotificationMessage('Error loading profile data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    setIsLoading(false);
  };

  const showNotificationMessage = (message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 15);
            markerRef.current.setLatLng([lat, lng]);
            showNotificationMessage('Location updated successfully!');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          showNotificationMessage('Unable to get your location. Please make sure location services are enabled.', 'error');
        }
      );
    } else {
      showNotificationMessage('Geolocation is not supported by your browser.', 'error');
    }
  };

  const handleRewriteDescription = async () => {
    if (!description || !description.trim()) {
      showNotificationMessage(t('fillAllFields'), 'error');
      return;
    }
    
    setIsRewriting(true);
    
    // Simulate processing time for "thinking" effect
    setTimeout(() => {
      const improved = smartRewrite(description);
      setDescription(improved);
      setIsRewriting(false);
      showNotificationMessage('Description enhanced successfully', 'success');
    }, 1000);
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const form = new FormData(e.target);
      
      if (!markerRef.current) {
        showNotificationMessage('Please set a location for your complaint', 'error');
        return;
      }

      if (areaType === 'Urban' && !sector) {
        showNotificationMessage('Please select the Sector', 'error');
        setIsLoading(false);
        return;
      }
      
      if (areaType === 'Rural' && !ruralJurisdiction) {
        showNotificationMessage('Please select the Rural Jurisdiction', 'error');
        setIsLoading(false);
        return;
      }
      
      const lat = markerRef.current.getLatLng().lat;
      const lng = markerRef.current.getLatLng().lng;
      const address = await getAddressFromCoordinates(lat, lng);

      const submissionData = new FormData();
      // submissionData.append('category', form.get('category')); // Removed category
      if (selectedDepartmentId) submissionData.append('departmentId', selectedDepartmentId);
      submissionData.append('service', selectedService || 'General');
      submissionData.append('description', form.get('description'));
      
      submissionData.append('location', JSON.stringify({
        lat,
        lng,
        address,
        areaType,
        sector,
        ruralJurisdiction
      }));

      // Append files
      if (submissionFiles && submissionFiles.length > 0) {
        submissionFiles.forEach(file => {
          submissionData.append('media', file);
        });
      }

      const response = await fetch(`${dataService.apiBaseUrl}/complaints/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submissionData
      });

      const data = await response.json();

      if (data.success) {
        // Add new complaint to state
        setComplaints(prev => [data.complaint, ...prev]);
        
        // Update dashboard stats
        setDashboardStats(prev => ({
          ...prev,
          totalComplaints: (prev.totalComplaints || 0) + 1,
          pendingComplaints: (prev.pendingComplaints || 0) + 1
        }));

        // Show success modal
        setSubmittedComplaint(data.complaint);
        setShowSuccessModal(true);
        
        // Reset form
        e.target.reset();
        setSubmissionFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setDescription(''); // Also reset description state
        setAreaType('Urban');
        setSector('');
        setRuralJurisdiction('');
        
      } else {
        showNotificationMessage(data.message, 'error');
      }

    } catch (error) {
      console.error('Error submitting complaint:', error);
      showNotificationMessage('Failed to submit complaint. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: {
          'User-Agent': 'AwazEShehrWeb/1.0',
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      return data.display_name || 'Location not specified';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Location not specified';
    }
  };

  const getCoordinatesFromQuery = async (query) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'AwazEShehrWeb/1.0',
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon), address: display_name };
      }
      return null;
    } catch (error) {
      console.error('Error searching address:', error);
      return null;
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showNotificationMessage('Geolocation is not supported by your browser', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], 16);
        const addr = await getAddressFromCoordinates(latitude, longitude);
        setAddressPreview(addr);
      }
    }, () => {
      showNotificationMessage('Unable to retrieve your location', 'error');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    const result = await getCoordinatesFromQuery(locationQuery.trim());
    if (result && mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([result.lat, result.lng]);
      mapInstanceRef.current.setView([result.lat, result.lng], 16);
      setAddressPreview(result.address || '');
    } else {
      showNotificationMessage('Location not found. Try a different search.', 'error');
    }
  };

  const handleViewComplaint = async (complaintId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/complaints/${complaintId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        showNotificationMessage('Session expired. Please log in again.', 'error');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/role-selection');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSelectedComplaint(data.complaint);
        setShowComplaintModal(true);
        setShowEvidenceForm(false);
      } else {
        showNotificationMessage(data.message, 'error');
      }
    } catch (error) {
      console.error('Error fetching complaint details:', error);
      showNotificationMessage('Failed to load complaint details.', 'error');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${dataService.apiBaseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        showNotificationMessage('Profile updated successfully!');
        // Update user in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        showNotificationMessage(data.message, 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotificationMessage('Failed to update profile.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsSave = async () => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
      showNotificationMessage('Settings saved successfully!');
      
      // Apply theme
      if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotificationMessage('Failed to save settings.', 'error');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${dataService.apiBaseUrl}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          (notif._id === notificationId || notif.id === notificationId) ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    const nid = notification.id || notification._id;
    if (!notification.isRead && nid) {
      try {
        await markNotificationAsRead(nid);
        setDashboardStats(prev => ({
          ...prev,
          unreadNotifications: Math.max(0, prev.unreadNotifications - 1)
        }));
      } catch {}
    }
    if (notification.relatedTo === 'complaint' && notification.relatedId) {
      await handleViewComplaint(notification.relatedId);
      setShowComplaintModal(true);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      text: newMessage,
      sender: 'user'
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate bot response
    setTimeout(() => {
      generateBotResponse(newMessage);
    }, 1000);
  };

  const handleQuickReply = (reply) => {
    const userMessage = {
      text: reply,
      sender: 'user'
    };

    setChatMessages(prev => [...prev, userMessage]);
    generateBotResponse(reply);
  };

  const generateBotResponse = (userMessage) => {
    let response = '';
    
    // Logic matched with mobile app
    userMessage = userMessage.toLowerCase();
    
    // Check against translated quick reply texts and keywords
    const isSubmitQuery = userMessage.includes('submit') || 
                         userMessage.includes('شکایت') ||
                         userMessage.includes(t('quickReplySubmit').toLowerCase());

    const isStatusQuery = userMessage.includes('status') || 
                         userMessage.includes('check') || 
                         userMessage.includes('حیثیت') ||
                         userMessage.includes(t('quickReplyStatus').toLowerCase());

    const isServiceQuery = userMessage.includes('service') || 
                          userMessage.includes('available') || 
                          userMessage.includes('خدمات') ||
                          userMessage.includes(t('quickReplyServices').toLowerCase());

    // Check if message contains a complaint ID
    const foundComplaint = complaints.find(c => userMessage.includes(c.complaintId.toLowerCase()));

    if (foundComplaint) {
      response = `${t('complaintId')}: ${foundComplaint.complaintId}\n${t('status')}: ${foundComplaint.status}\n${t('category')}: ${foundComplaint.category}`;
    } else if (isSubmitQuery) {
      response = t('botSubmitResponse');
    } else if (isStatusQuery) {
      response = t('botStatusResponse');
    } else if (isServiceQuery) {
      response = t('botServiceResponse');
    } else {
      response = t('botDefaultResponse');
    }

    const botMessage = {
      text: response,
      sender: 'bot'
      // No quick replies in follow-up messages to match mobile app behavior
    };

    setChatMessages(prev => [...prev, botMessage]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userSettings');
    navigate('/role-selection');
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'status-badge status-pending',
      'assigned': 'status-badge status-pending',
      'in-progress': 'status-badge status-progress',
      'resolved': 'status-badge status-resolved',
      'rejected': 'status-badge status-rejected'
    };
    
    const statusText = {
      'pending': t('pending'),
      'assigned': 'Assigned',
      'in-progress': t('inProgress'),
      'resolved': t('resolved'),
      'rejected': t('rejected')
    };

    return <span className={statusClasses[status]}>{statusText[status]}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading && !user) {
    return (
      <div className="loader-bg">
        <div className="loader-content">
          <div className="loader-spinner">
            <i className="fas fa-cog"></i>
          </div>
          <h2 className="loader-title">{t('loading')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="header-top">
            <div className="app-branding">
              <h2>{t('appTitle')}</h2>
              <p>{t('citizenDashboard')}</p>
            </div>
            <button 
              className="internal-toggle-btn" 
              onClick={() => {
                if (isMobile) {
                  setSidebarMobileOpen(false);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              aria-label={isMobile ? 'Close sidebar' : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
            >
              <i className={`fas ${isMobile ? 'fa-times' : (sidebarCollapsed ? 'fa-bars' : 'fa-times')}`}></i>
            </button>
          </div>
        </div>
        
        

        <div className="sidebar-menu">
          {[
            { id: 'dashboard', icon: 'fa-home', label: t('dashboard') },
            { id: 'submit-complaint', icon: 'fa-plus-circle', label: t('submitComplaint') },
            { id: 'my-complaints', icon: 'fa-list', label: t('myComplaints') },
            { id: 'notifications', icon: 'fa-bell', label: t('notifications') },
            { id: 'profile', icon: 'fa-user', label: t('profile') },
            { id: 'settings', icon: 'fa-cog', label: t('settings') },
            { id: 'logout', icon: 'fa-sign-out-alt', label: t('logout') }
          ].map(item => (
            <div
              key={item.id}
              className={`menu-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'logout') {
                  handleLogout();
                } else {
                  setActivePage(item.id);
                }
                if (isMobile) setSidebarMobileOpen(false);
              }}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </div>
          ))}
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
                onClick={() => setSidebarMobileOpen(true)}
                aria-label="Open sidebar"
              >
                <i className="fas fa-bars"></i>
              </button>
            )}
            <div className="user-avatar">
              {user?.fullName?.split(' ').map(n => n[0]).join('') || 'US'}
            </div>
            <div>
              <h3>{user?.fullName || t('user')}</h3>
              <p>{t('citizen')}</p>
            </div>
          </div>
          <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <div className="language-toggle" onClick={toggleLanguage} style={{cursor: 'pointer', fontWeight: 'bold', padding: '5px 10px', background: 'var(--light-bg)', borderRadius: '5px'}}>
              {language === 'english' ? 'اردو' : 'English'}
            </div>
            <div className="notification-bell" onClick={() => setActivePage('notifications')}>
              <i className="fas fa-bell"></i>
              {dashboardStats.unreadNotifications > 0 && (
                <span className="notification-badge">{dashboardStats.unreadNotifications}</span>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Page */}
        {activePage === 'dashboard' && (
          <div className="page-content active">
            <h2 className="form-title">{t('Dashboard Overview')}</h2>
            
            <div className="dashboard-cards">
              {[
                { value: dashboardStats?.total || 0, title: t('totalComplaints'), icon: 'fa-clipboard-list', type: 'total' },
                { value: dashboardStats?.pending || 0, title: t('pending'), icon: 'fa-clock', type: 'pending' },
                { value: dashboardStats?.inProgress || 0, title: t('inProgress'), icon: 'fa-spinner', type: 'progress' },
                { value: dashboardStats?.resolved || 0, title: t('resolved'), icon: 'fa-check-circle', type: 'resolved' }
              ].map(card => (
                <div key={card.type} className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-value">{card.value}</div>
                      <div className="card-title">{card.title}</div>
                    </div>
                    <div className={`card-icon ${card.type}`}>
                      <i className={`fas ${card.icon}`}></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="complaints-list">
              <h2 className="form-title">{t('recentComplaints')}</h2>
              
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>{t('complaintId')}</th>
                      <th>{t('category')}</th>
                      <th>{t('date')}</th>
                      <th>{t('status')}</th>
                      <th>{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.slice(0, 5).map(complaint => (
                      <tr key={complaint._id}>
                        <td>{complaint.complaintId}</td>
                        <td className="category-cell">{complaint.category}</td>
                        <td>{formatDate(complaint.createdAt)}</td>
                        <td>{getStatusBadge(complaint.status)}</td>
                        <td>
                          <button 
                            className="action-btn view-details"
                            onClick={() => handleViewComplaint(complaint._id)}
                          >
                            {t('viewDetails')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {complaints.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                          {t('noComplaints')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Submit Complaint Page */}
        {activePage === 'submit-complaint' && (
          <div className="page-content active">
            <div className="submit-complaint-header">
              <div className="header-content">
                <h2 className="form-title gradient-text">{t('submitYourComplaint')}</h2>
                <p className="form-subtitle">{t('submitComplaintSubtitle')}</p>
              </div>
              <div className="header-illustration">
                <i className="fas fa-hands-helping"></i>
              </div>
            </div>
            
            <div className="complaint-form premium-form">
              <form onSubmit={handleComplaintSubmit}>
                
                {/* Step 1: Description */}
                <div className="form-section animated-input">
                  <div className="section-header">
                    <div className="section-number">1</div>
                    <div className="section-info">
                      <h3 className="section-title">{t('describeIssueTitle')}</h3>
                      <p className="section-subtitle">{t('describeIssueDesc')}</p>
                    </div>
                  </div>
                  <div className="premium-input-wrapper">
                    <textarea 
                      className="form-control premium-textarea" 
                      name="description"
                      placeholder={t('describeIssuePlaceholder')}
                      rows="6"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                    <div className="input-decoration"></div>
                    <button 
                      type="button"
                      className="ai-rewrite-btn"
                      onClick={handleRewriteDescription}
                      disabled={isRewriting || !description.trim()}
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'linear-gradient(135deg, #6e8efb, #a777e3)',
                        border: 'none',
                        borderRadius: '20px',
                        color: 'white',
                        padding: '5px 15px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        zIndex: 2
                      }}
                    >
                      {isRewriting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          <span>{t('rewriting')}</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic"></i>
                          <span>{t('rewriteWithAI')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 2: Department & Service Selection */}
                <div className="form-section animated-input">
                  <div className="section-header">
                    <div className="section-number">2</div>
                    <div className="section-info">
                      <h3 className="section-title">{t('selectDepartmentTitle') || 'Department & Service'}</h3>
                      <p className="section-subtitle">{t('selectDepartmentDesc') || 'Select a department, or use the recommended one based on your complaint'}</p>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '8px', color: '#4a5568' }}>{t('department') || 'Department'} ({t('optional') || 'Optional'})</label>
                    <div style={{ marginBottom: 10, color: '#4a5568', fontSize: '0.95rem' }}>
                      {isRoutingAnalyzing ? (t('analyzing') || 'Analyzing complaint…') : (
                        routingRecommendation?.recommendedDepartment?.name
                          ? `${t('recommendation') || 'Recommendation'}: ${routingRecommendation.recommendedDepartment.name}`
                          : (t('recommendation') || 'Recommendation') + ': -'
                      )}
                    </div>
                    <select 
                      className="form-control"
                      value={selectedDepartmentId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedDepartmentId(v);
                        setDepartmentManuallySelected(Boolean(v));
                      }}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                    >
                      <option value="">{t('autoRoute') || 'Auto-route (Recommended)'}</option>
                      {departments.map(dep => (
                        <option key={dep._id} value={dep._id}>
                          {dep.name}
                          {routingRecommendation?.recommendedDepartment?._id && String(dep._id) === String(routingRecommendation.recommendedDepartment._id) ? ` (${t('recommended') || 'Recommended'})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDepartmentId && (
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '8px', color: '#4a5568' }}>{t('service') || 'Service'}</label>
                      <select 
                        className="form-control"
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                      >
                        <option value="">{t('selectService') || 'Select Service'}</option>
                        {availableServices.length > 0 ? (
                          availableServices.map((service, index) => (
                            <option key={index} value={service}>{service}</option>
                          ))
                        ) : (
                          <option value="General">{t('generalInquiry') || 'General Inquiry'}</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>
                
                {/* Step 3: Upload Media */}
                <div className="form-section animated-input">
                  <div className="section-header">
                    <div className="section-number">3</div>
                    <div className="section-info">
                      <h3 className="section-title">{t('addEvidenceTitle')}</h3>
                      <p className="section-subtitle">{t('addEvidenceDesc')}</p>
                    </div>
                  </div>
                  <div className="file-upload premium-upload">
                    <div className="upload-icon-wrapper">
                      <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <h4>{t('dragDrop')}</h4>
                    <p>{t('browse')}</p>
                    <span className="upload-hint">{t('supportedFormats')}</span>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      multiple 
                      accept="image/*,video/*" 
                      onChange={(e) => setSubmissionFiles(Array.from(e.target.files))}
                    />
                    {submissionFiles.length > 0 && (
                      <div className="selected-files-count" style={{marginTop: '10px', color: '#4CAF50', fontWeight: 'bold'}}>
                        <i className="fas fa-check"></i> {submissionFiles.length} files selected
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Step 4: Location */}
                <div className="form-section animated-input">
                  <div className="section-header">
                    <div className="section-number">4</div>
                    <div className="section-info">
                      <h3 className="section-title">{t('setLocationTitle')}</h3>
                      <p className="section-subtitle">{t('setLocationDesc')}</p>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '20px', padding: '0 5px' }}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '10px', color: '#4a5568' }}>{t('areaType') || 'Area Type'}</label>
                      <div className="area-type-options" style={{ display: 'flex', gap: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px 15px', background: areaType === 'Urban' ? '#ebf8ff' : '#f7fafc', border: `1px solid ${areaType === 'Urban' ? '#4299e1' : '#e2e8f0'}`, borderRadius: '8px', transition: 'all 0.2s' }}>
                          <input 
                            type="radio" 
                            name="areaType" 
                            value="Urban" 
                            checked={areaType === 'Urban'} 
                            onChange={(e) => setAreaType(e.target.value)} 
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ fontWeight: areaType === 'Urban' ? '600' : 'normal', color: areaType === 'Urban' ? '#2b6cb0' : '#4a5568' }}>Urban (Islamabad Sectors)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px 15px', background: areaType === 'Rural' ? '#ebf8ff' : '#f7fafc', border: `1px solid ${areaType === 'Rural' ? '#4299e1' : '#e2e8f0'}`, borderRadius: '8px', transition: 'all 0.2s' }}>
                          <input 
                            type="radio" 
                            name="areaType" 
                            value="Rural" 
                            checked={areaType === 'Rural'} 
                            onChange={(e) => setAreaType(e.target.value)} 
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ fontWeight: areaType === 'Rural' ? '600' : 'normal', color: areaType === 'Rural' ? '#2b6cb0' : '#4a5568' }}>Rural (Jurisdictions)</span>
                        </label>
                      </div>
                    </div>

                    {areaType === 'Urban' && (
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '8px', color: '#4a5568' }}>{t('sector') || 'Sector'}</label>
                        <select 
                          className="form-control" 
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                        >
                          <option value="">{t('selectSector') || 'Select Sector'}</option>
                          {availableSectors.map(sec => (
                            <option key={sec._id} value={sec.name}>{sec.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {areaType === 'Rural' && (
                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '8px', color: '#4a5568' }}>{t('ruralJurisdiction') || 'Rural Jurisdiction'}</label>
                        <select 
                          className="form-control" 
                          value={ruralJurisdiction}
                          onChange={(e) => setRuralJurisdiction(e.target.value)}
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                        >
                          <option value="">{t('selectJurisdiction') || 'Select Jurisdiction'}</option>
                          {availableJurisdictions.map(jur => (
                            <option key={jur._id} value={jur.name}>{jur.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="location-search-wrapper">
                    <div className="search-input-group">
                      <i className="fas fa-search search-icon"></i>
                      <input 
                        type="text" 
                        className="location-search-input"
                        placeholder={t('searchLocationPlaceholder')}
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation(e)}
                      />
                      <button 
                        type="button" 
                        className="location-btn search-btn"
                        onClick={handleSearchLocation}
                        style={{ marginRight: '8px', backgroundColor: '#4a5568', color: 'white' }}
                      >
                        <i className="fas fa-search"></i>
                      </button>
                      <button 
                        type="button" 
                        className="location-btn use-location"
                        onClick={handleUseMyLocation}
                      >
                        <i className="fas fa-crosshairs"></i>
                        <span>{t('useMyLocation')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="map-wrapper">
                    <div className="map-container premium-map" ref={mapRef}></div>
                    {addressPreview && (
                      <div className="address-preview premium-address">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{addressPreview}</span>
                      </div>
                    )}
                    <div className="map-hint">
                      <i className="fas fa-info-circle"></i>
                      <span>{t('mapInstruction')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="form-group submit-group">
                  <button type="submit" className="btn btn-primary premium-submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="btn-spinner"></span>
                        <span>{t('processing')}</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        <span>{t('submitComplaintBtn')}</span>
                        <i className="fas fa-arrow-right btn-arrow"></i>
                      </>
                    )}
                  </button>
                  <p className="submit-note">
                    <i className="fas fa-shield-alt"></i>
                    {t('securityNote')}
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* My Complaints Page */}
        {activePage === 'my-complaints' && (
          <div className="page-content active">
            <h2 className="form-title">{t('myComplaints')}</h2>
            
            <div className="complaints-list">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>{t('complaintId')}</th>
                      <th>{t('category')}</th>
                      <th>{t('date')}</th>
                      <th>{t('status')}</th>
                      <th>{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map(complaint => (
                      <tr key={complaint._id}>
                        <td>{complaint.complaintId}</td>
                        <td className="category-cell">{complaint.category}</td>
                        <td>{formatDate(complaint.createdAt)}</td>
                        <td>{getStatusBadge(complaint.status)}</td>
                        <td>
                          <button 
                            className="action-btn view-details"
                            onClick={() => handleViewComplaint(complaint._id)}
                          >
                            {t('viewDetails')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {complaints.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                          {t('noComplaints')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Page */}
        {activePage === 'confirmation' && complaints.length > 0 && (
          <div className="page-content active">
            <div className="confirmation-page">
              <div className="confirmation-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h2 className="confirmation-title">{t('complaintSuccessTitle')}</h2>
              <div className="complaint-id">
                {t('complaintIdLabel')} {complaints[0]?.complaintId}
              </div>
              
              <div className="confirmation-details">
                <div className="detail-item">
                  <div className="detail-label">{t('category')}</div>
                  <div className="detail-value">
                    {complaints[0]?.category}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('submittedOnLabel')}</div>
                  <div className="detail-value">
                    {formatDate(complaints[0]?.createdAt)}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('status')}</div>
                  <div className="detail-value">
                    <span className="status-badge status-pending">{t('pending')}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('estimatedResolutionLabel')}</div>
                  <div className="detail-value">{t('businessDays')}</div>
                </div>
              </div>
              
              <div className="confirmation-actions">
                <button 
                  className="btn btn-outline"
                  onClick={() => setActivePage('dashboard')}
                >
                  <i className="fas fa-home"></i> {t('backToDashboardBtn')}
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActivePage('my-complaints')}
                >
                  <i className="fas fa-search"></i> {t('trackStatus')}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setActivePage('submit-complaint')}
                >
                  <i className="fas fa-plus"></i> {t('submitAnotherBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Page */}
        {activePage === 'notifications' && (
          <div className="page-content active">
            <h2 className="form-title">{t('notifications')}</h2>
            <div className="notifications-list">
              {notifications.map(notification => (
                <div 
                  key={notification._id || notification.id} 
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="notification-icon">
                    <i className={`fas fa-${
                      notification.type === 'success' ? 'check-circle' :
                      notification.type === 'warning' ? 'exclamation-triangle' :
                      notification.type === 'error' ? 'times-circle' : 'info-circle'
                    }`}></i>
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!notification.isRead && <div className="unread-indicator"></div>}
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <i className="fas fa-bell-slash" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                  <p>{t('noNotifications')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Page */}
        {activePage === 'profile' && user && (
          <div className="page-content active">
            <h2 className="form-title">{t('profileSettings')}</h2>
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
                  <small className="form-text">{t('emailReadOnly')}</small>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('phone')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileData.phone}
                    readOnly
                    disabled
                  />
                  <small className="form-text">{t('phoneReadOnly') || 'Phone number cannot be changed'}</small>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('cnic')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileData.cnic}
                    readOnly
                    disabled
                  />
                  <small className="form-text">{t('cnicReadOnly') || 'CNIC cannot be changed'}</small>
                </div>
                
                <h3 style={{ marginTop: '30px', marginBottom: '20px' }}>{t('addressInfo')}</h3>
                
                <div className="form-group">
                  <label className="form-label">{t('streetAddress')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileData.address.street}
                    onChange={(e) => setProfileData({
                      ...profileData, 
                      address: {...profileData.address, street: e.target.value}
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('city')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileData.address.city}
                    onChange={(e) => setProfileData({
                      ...profileData, 
                      address: {...profileData.address, city: e.target.value}
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('postalCode')}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profileData.address.postalCode}
                    onChange={(e) => setProfileData({
                      ...profileData, 
                      address: {...profileData.address, postalCode: e.target.value}
                    })}
                  />
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
        )}

        {/* Settings Page */}
        {activePage === 'settings' && (
          <div className="page-content active">
            <h2 className="form-title">{t('appSettings')}</h2>
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
              <div className="form-group">
                <label className="form-label">{t('language')}</label>
                <select 
                  className="form-control" 
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                >
                  <option value="english">{t('english')}</option>
                  <option value="urdu">{t('urdu')}</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleSettingsSave}>
                <i className="fas fa-save"></i> {t('saveSettings')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {showComplaintModal && selectedComplaint && (
        <div 
          className="modal-overlay active"
          onClick={() => setShowComplaintModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Complaint Details</h3>
              <button 
                className="close-modal"
                onClick={() => setShowComplaintModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="complaint-details">
                <div className="detail-item">
                  <div className="detail-label">Complaint ID</div>
                  <div className="detail-value">{selectedComplaint.complaintId}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Category</div>
                  <div className="detail-value">{selectedComplaint.category}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                </div>
                {selectedComplaint.assignedTo && (
                  <div className="detail-item">
                    <div className="detail-label">Assigned Officer</div>
                    <div className="detail-value">
                      {selectedComplaint.assignedTo.fullName}
                      {selectedComplaint.assignedTo.email ? ` (${selectedComplaint.assignedTo.email}` : ''}
                      {selectedComplaint.assignedTo.phone ? `${selectedComplaint.assignedTo.email ? ', ' : ' ('}${selectedComplaint.assignedTo.phone})` : (selectedComplaint.assignedTo.email ? ')' : '')}
                    </div>
                  </div>
                )}
                {selectedComplaint.status === 'in-progress' && Array.isArray(selectedComplaint.checkIns) && selectedComplaint.checkIns.length > 0 && (
                  <div className="detail-item">
                    <div className="detail-label">Officer Live Location</div>
                    <div className="detail-value">
                      {selectedComplaint.checkIns[selectedComplaint.checkIns.length - 1].location?.address || 
                        `${selectedComplaint.checkIns[selectedComplaint.checkIns.length - 1].location?.lat}, ${selectedComplaint.checkIns[selectedComplaint.checkIns.length - 1].location?.lng}`}
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <div className="detail-label">Date Submitted</div>
                  <div className="detail-value">
                    {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Last Updated</div>
                  <div className="detail-value">
                    {new Date(selectedComplaint.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Description</div>
                  <div className="detail-value">{selectedComplaint.description}</div>
                </div>
                {selectedComplaint.remarks && (
                  <div className="detail-item">
                    <div className="detail-label">Remarks</div>
                    <div className="detail-value">{selectedComplaint.remarks}</div>
                  </div>
                )}
                {selectedComplaint.resolutionDetails && (
                  <div className="detail-item">
                    <div className="detail-label">Resolution Details</div>
                    <div className="detail-value">{selectedComplaint.resolutionDetails}</div>
                  </div>
                )}
              {/* Feedback Form for resolved complaints */}
              {selectedComplaint.status === 'resolved' && (
                <div style={{ marginTop: '20px' }}>
                  <h4 className="form-title" style={{ marginBottom: '10px' }}>Rate Resolution</h4>
                  <div className="form-group">
                    <label className="form-label">Rating (1-5)</label>
                    <select 
                      className="form-control" 
                      value={feedback.rating}
                      onChange={(e) => setFeedback({ ...feedback, rating: Number(e.target.value) })}
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Comment</label>
                    <textarea 
                      className="form-control"
                      rows="3"
                      value={feedback.comment}
                      onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                      placeholder="Share your experience..."
                    />
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${dataService.apiBaseUrl}/complaints/${selectedComplaint._id || selectedComplaint.id}/feedback`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ rating: feedback.rating, comment: feedback.comment })
                        });
                        const data = await res.json();
                        if (data.success) {
                          showNotificationMessage('Thanks for your feedback!');
                        } else {
                          showNotificationMessage(data.message || 'Failed to submit feedback', 'error');
                        }
                      } catch (err) {
                        showNotificationMessage('Failed to submit feedback', 'error');
                      }
                    }}
                  >
                    <i className="fas fa-star"></i> Submit Feedback
                  </button>
                </div>
              )}
              </div>
              
              {/* Unified Media Gallery */}
              {(
                (selectedComplaint.media && selectedComplaint.media.length > 0) || 
                (selectedComplaint.evidence && selectedComplaint.evidence.length > 0)
              ) && (
                <>
                  <h4 style={{ marginTop: '25px' }}>Media Attachments</h4>
                  <div className="media-gallery" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {/* Initial Complaint Media */}
                    {selectedComplaint.media && selectedComplaint.media.map((media, index) => (
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
                    {selectedComplaint.evidence && selectedComplaint.evidence.flatMap((ev, i) => 
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

              {selectedComplaint.evidence && selectedComplaint.evidence.length > 0 && (
                <>
                  <h4 style={{ marginTop: '25px' }}>Updates Log</h4>
                  <div className="evidence-list">
                    {selectedComplaint.evidence.map((ev, i) => (
                      <div key={i} className="evidence-item" style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                          <p style={{ fontWeight: 'bold', margin: 0 }}>{ev.description}</p>
                          <small style={{ color: '#6c757d' }}>{new Date(ev.uploadedAt).toLocaleString()}</small>
                        </div>
                        {ev.files && ev.files.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            <i className="fas fa-paperclip"></i> {ev.files.length} file(s) attached
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Add Evidence Section */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
                {!showEvidenceForm ? (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowEvidenceForm(true)}
                    style={{ width: '100%', marginBottom: '10px' }}
                  >
                    <i className="fas fa-plus-circle"></i> Add More Evidence
                  </button>
                ) : (
                  <div className="add-evidence-form" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '15px' }}>Add New Evidence</h4>
                    <form onSubmit={handleEvidenceSubmit}>
                      <div className="form-group">
                        <label className="form-label">Files (Images/Videos)</label>
                        <input
                          type="file"
                          className="form-control"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => setEvidenceFiles(Array.from(e.target.files))}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={isUploadingEvidence}
                        >
                          {isUploadingEvidence ? (
                            <><i className="fas fa-spinner fa-spin"></i> Uploading...</>
                          ) : (
                            <><i className="fas fa-upload"></i> Upload Evidence</>
                          )}
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline"
                          onClick={() => {
                            setShowEvidenceForm(false);
                            setEvidenceFiles([]);
                          }}
                          disabled={isUploadingEvidence}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-info"
                  onClick={() => { setShowComplaintModal(false); setShowChatPanel(true); }}
                >
                  <i className="fas fa-comments"></i> Chat with Field Officer
                </button>
              </div>
            </div>
          </div>
        </div>
  )}

      {/* Notification Toast or Popup */}
      {showNotification && (
        notificationType === 'error' ? (
          <div className="notification-popup-overlay">
            <div className="notification-popup active">
              <div className="notification-icon error">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="notification-content">
                <h3 className="notification-title">Error</h3>
                <div className="notification-message">{notificationMessage}</div>
              </div>
              <button 
                className="notification-close-btn"
                onClick={() => setShowNotification(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className={`notification-toast active ${notificationType}`}>
            <div className="notification-icon">
              <i className={`fas ${notificationType === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
            </div>
            <div className="notification-content">
              <div className="notification-message">{notificationMessage}</div>
            </div>
            <button 
              className="notification-close"
              onClick={() => setShowNotification(false)}
            >
              &times;
            </button>
          </div>
        )
      )}

      {/* Success Modal */}
      {showSuccessModal && submittedComplaint && (
        <div className="success-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-animation">
              <div className="success-checkmark">
                <div className="check-icon">
                  <span className="icon-line line-tip"></span>
                  <span className="icon-line line-long"></span>
                  <div className="icon-circle"></div>
                  <div className="icon-fix"></div>
                </div>
              </div>
            </div>
            
            <h2 className="success-title">Complaint Submitted Successfully!</h2>
            <p className="success-subtitle">Your complaint has been registered and will be reviewed shortly</p>
            
            <div className="success-details">
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Complaint ID</span>
                  <span className="detail-value">{submittedComplaint.complaintId}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-th-large"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{submittedComplaint.category}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Status</span>
                  <span className="detail-value status-pending">Pending Review</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Expected Resolution</span>
                  <span className="detail-value">3-5 Business Days</span>
                </div>
              </div>
            </div>
            
            <div className="success-info">
              <i className="fas fa-info-circle"></i>
              <p>You will receive notifications about the progress of your complaint. You can track the status anytime from your dashboard.</p>
            </div>
            
            <div className="success-actions">
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActivePage('dashboard');
                }}
              >
                <i className="fas fa-home"></i>
                Go to Dashboard
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActivePage('my-complaints');
                }}
              >
                <i className="fas fa-list"></i>
                View My Complaints
              </button>
            </div>
            
            <button 
              className="modal-close"
              onClick={() => setShowSuccessModal(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <div className="chatbot-container">
        <div 
          className="chatbot-button"
          onClick={() => setShowChatbot(!showChatbot)}
        >
          <i className="fas fa-robot"></i>
        </div>
        
        <div className={`chatbot-window ${showChatbot ? 'active' : ''}`}>
          <div className="chatbot-header">
            <div className="chatbot-title">
              <i className="fas fa-robot"></i>
              <span>Awaz e Shehr Assistant</span>
            </div>
            <button 
              className="chatbot-close"
              onClick={() => setShowChatbot(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="chatbot-messages">
            {chatMessages.map((message, index) => (
              <div key={index} className={`message ${message.sender}-message`}>
                {message.text}
                {message.quickReplies && (
                  <div className="quick-replies">
                    {message.quickReplies.map((reply, replyIndex) => (
                      <div
                        key={replyIndex}
                        className="quick-reply"
                        onClick={() => handleQuickReply(reply)}
                      >
                        {reply}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="chatbot-send" onClick={handleSendMessage}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      {showChatPanel && selectedComplaint && (
        <ComplaintChatPanel
          complaint={selectedComplaint}
          role="citizen"
          onClose={() => setShowChatPanel(false)}
        />
      )}
    </div>
  </div>
  );
};

export default CitizenDashboard;
