import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import dataService from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';
import ComplaintChatPanel from '../components/ComplaintChatPanel';
import { smartRewrite } from '../utils/smartRewriter';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import './CitizenDashboard.css';

const API_BASE_URL = dataService.apiBaseUrl;
const SERVER_URL = window.location.hostname.includes('vercel.app') 
  ? 'https://backend-ui1u.onrender.com' 
  : API_BASE_URL.replace(/\/api\/?$/, '');
const BRAND_LOGO_URL = `${process.env.PUBLIC_URL}/awazeshehr.jpeg`;

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${SERVER_URL}${url}`;
};

const CITIZEN_COMPLAINT_DRAFT_KEY = 'citizenComplaintDraft:v1';
const CITIZEN_COMPLAINT_TOUR_SEEN_KEY = 'citizenComplaintTourSeen:v1';

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage, setLanguage } = useLanguage();
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
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: t('botGreeting'),
        sender: 'bot',
        quickReplies: [
          t('quickReplySubmit'),
          t('quickReplyStatus'),
          t('quickReplyTrack'),
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
  const [hoverRating, setHoverRating] = useState(0);
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
  const stepElsRef = useRef({});
  const geocodeSearchAbortRef = useRef(null);
  const reverseGeocodeAbortRef = useRef(null);
  const geocodeSearchCacheRef = useRef(new Map());
  const reverseGeocodeCacheRef = useRef(new Map());
  const reverseGeocodeDebounceRef = useRef(null);
  const mapInitAttemptRef = useRef(0);
  const suggestAbortRef = useRef(null);
  const suggestDebounceRef = useRef(null);
  const stepperRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapWrapperRef = useRef(null);
  const submitButtonRef = useRef(null);
  const draftRestoredRef = useRef(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [addressPreview, setAddressPreview] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isLocationSuggesting, setIsLocationSuggesting] = useState(false);
  const [mapState, setMapState] = useState({ status: 'idle', message: '' });
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourRect, setTourRect] = useState(null);
  const [tourTooltipPos, setTourTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteDone, setRewriteDone] = useState(false);
  const [draftBanner, setDraftBanner] = useState('');
  const [areaType, setAreaType] = useState('Urban');
  const [sector, setSector] = useState('');
  const [subsectorId, setSubsectorId] = useState('');
  const [ruralJurisdiction, setRuralJurisdiction] = useState('');
  
  // New State for Dynamic Hierarchy & Department Selection
  const [departments, setDepartments] = useState([]);
  const [availableSectors, setAvailableSectors] = useState([]);
  const [availableSubsectors, setAvailableSubsectors] = useState([]);
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

  useEffect(() => {
    const loadSubsectors = async () => {
      if (areaType !== 'Urban') {
        setAvailableSubsectors([]);
        setSubsectorId('');
        return;
      }
      const sectorName = String(sector || '').trim();
      if (!sectorName) {
        setAvailableSubsectors([]);
        setSubsectorId('');
        return;
      }
      const sectorDoc = (availableSectors || []).find(s => String(s?.name || '').trim() === sectorName);
      if (!sectorDoc?._id) {
        setAvailableSubsectors([]);
        setSubsectorId('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`${dataService.apiBaseUrl}/complaints/data/sectors/${sectorDoc._id}/subsectors`, { headers });
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setAvailableSubsectors(Array.isArray(data.subsectors) ? data.subsectors : []);
        } else {
          setAvailableSubsectors([]);
        }
      } catch {
        setAvailableSubsectors([]);
      }
    };

    loadSubsectors();
  }, [areaType, sector, availableSectors]);

  // Update available services when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      const dep = departments.find(d => d._id === selectedDepartmentId);
      if (dep) {
        const nextServices = dep.servicesOffered || [];
        setAvailableServices(nextServices);
        if (selectedService && nextServices.includes(selectedService)) return;
        setSelectedService('');
      }
    } else {
      setAvailableServices([]);
      setSelectedService('');
    }
  }, [selectedDepartmentId, departments, selectedService]);

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

  const showNotificationMessage = useCallback((message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  }, []);

  const refreshComplaintDetails = useCallback(async (complaintId) => {
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
  }, []);

  const loadComplaints = useCallback(async () => {
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
  }, [showNotificationMessage]);

  const loadNotifications = useCallback(async () => {
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
  }, [showNotificationMessage]);

  const loadProfile = useCallback(async () => {
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
  }, [showNotificationMessage]);

  const loadSettings = useCallback(async () => {
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      
      // Apply theme on load
      if (parsedSettings.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
    setIsLoading(false);
  }, []);

  const loadDashboardData = useCallback(async () => {
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
  }, [dashboardStats.unreadNotifications, showNotificationMessage]);

  const getAddressFromCoordinates = useCallback(async (lat, lng) => {
    try {
      const key = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
      const cached = reverseGeocodeCacheRef.current.get(key);
      if (cached) return cached;

      const token = localStorage.getItem('token');
      if (reverseGeocodeAbortRef.current) reverseGeocodeAbortRef.current.abort();
      const controller = new AbortController();
      reverseGeocodeAbortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const res = await fetch(
          `${dataService.apiBaseUrl}/complaints/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
          { headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal }
        );
        const data = await res.json().catch(() => null);
        const addr = res.ok && data?.success && typeof data.address === 'string' ? data.address : '';
        if (addr) reverseGeocodeCacheRef.current.set(key, addr);
        return addr || 'Location not specified';
      } finally {
        window.clearTimeout(timeout);
      }
    } catch (error) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`);
        const data = await response.json().catch(() => null);
        return data?.display_name || 'Location not specified';
      } catch {
        return 'Location not specified';
      }
    }
  }, []);

  const updateAddressPreviewFromLatLng = useCallback((lat, lng) => {
    if (reverseGeocodeDebounceRef.current) {
      window.clearTimeout(reverseGeocodeDebounceRef.current);
      reverseGeocodeDebounceRef.current = null;
    }
    reverseGeocodeDebounceRef.current = window.setTimeout(async () => {
      const addr = await getAddressFromCoordinates(lat, lng);
      if (addr && addr !== 'Location not specified') {
        setAddressPreview(addr);
      }
    }, 220);
  }, [getAddressFromCoordinates]);

  const initializeMap = useCallback(() => {
    const L = window.L;
    if (L && mapRef.current) {
      const defaultLocation = [33.6844, 73.0479];
      
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
        updateAddressPreviewFromLatLng(e.latlng.lat, e.latlng.lng);
      });

      // Update address preview when marker drag ends
      markerRef.current.on('dragend', async function() {
        const { lat, lng } = markerRef.current.getLatLng();
        updateAddressPreviewFromLatLng(lat, lng);
      });
      setAddressPreview('');
      setMapState({ status: 'ready', message: '' });
      window.setTimeout(() => {
        try {
          mapInstanceRef.current?.invalidateSize?.();
        } catch {}
      }, 120);
      window.setTimeout(() => {
        try {
          mapInstanceRef.current?.invalidateSize?.();
        } catch {}
      }, 700);
    }
  }, [updateAddressPreviewFromLatLng]);

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
  }, [user, loadDashboardData, loadComplaints, loadNotifications, refreshComplaintDetails]);

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
  }, [activePage, user, loadDashboardData, loadComplaints, loadNotifications, loadProfile, loadSettings]);

  // Initialize map when component mounts
  useEffect(() => {
    if (activePage !== 'submit-complaint') return;
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      window.setTimeout(() => {
        try {
          mapInstanceRef.current?.invalidateSize?.();
        } catch {}
      }, 120);
      return;
    }

    setMapState({ status: 'loading', message: '' });
    mapInitAttemptRef.current += 1;
    const attemptId = mapInitAttemptRef.current;

    let tries = 0;
    const tick = () => {
      if (attemptId !== mapInitAttemptRef.current) return;
      if (mapInstanceRef.current) return;

      const L = window.L;
      if (L) {
        try {
          initializeMap();
        } catch {
          setMapState({ status: 'error', message: 'Map failed to initialize' });
        }
        return;
      }

      tries += 1;
      if (tries >= 25) {
        setMapState({ status: 'error', message: 'Map library not loaded' });
        return;
      }
      window.setTimeout(tick, 180);
    };

    tick();
  }, [activePage, initializeMap]);

  useEffect(() => {
    if (activePage !== 'submit-complaint') return;
    if (!mapInstanceRef.current) return;
    window.setTimeout(() => {
      try {
        mapInstanceRef.current?.invalidateSize?.();
      } catch {}
    }, 180);
  }, [activePage, sidebarCollapsed, sidebarMobileOpen]);

  useEffect(() => {
    if (activePage !== 'submit-complaint') return;

    const q = String(locationQuery || '').trim();
    if (q.length < 3) {
      if (suggestAbortRef.current) suggestAbortRef.current.abort();
      if (suggestDebounceRef.current) window.clearTimeout(suggestDebounceRef.current);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setIsLocationSuggesting(false);
      return;
    }

    if (suggestAbortRef.current) suggestAbortRef.current.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;
    if (suggestDebounceRef.current) window.clearTimeout(suggestDebounceRef.current);

    suggestDebounceRef.current = window.setTimeout(async () => {
      setIsLocationSuggesting(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${dataService.apiBaseUrl}/complaints/geocode/search?q=${encodeURIComponent(q)}&limit=5`,
          { headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal }
        );
        const data = await res.json().catch(() => null);
        const results = Array.isArray(data?.results) ? data.results : [];
        setLocationSuggestions(results);
        setShowLocationSuggestions(true);
      } catch {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      } finally {
        setIsLocationSuggesting(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(suggestDebounceRef.current);
    };
  }, [activePage, locationQuery]);

  // Restore draft only once when entering the submit page
  useEffect(() => {
    if (activePage !== 'submit-complaint') return;
    
    // Use a ref to ensure we only restore once per session/navigation
    if (draftRestoredRef.current) return;

    try {
      const raw = localStorage.getItem(CITIZEN_COMPLAINT_DRAFT_KEY);
      if (!raw) {
        draftRestoredRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw);

      if (typeof parsed?.description === 'string' && !description) setDescription(parsed.description);
      if (typeof parsed?.selectedDepartmentId === 'string' && !selectedDepartmentId) setSelectedDepartmentId(parsed.selectedDepartmentId);
      if (typeof parsed?.selectedService === 'string' && !selectedService) setSelectedService(parsed.selectedService);
      if (typeof parsed?.areaType === 'string') setAreaType(parsed.areaType);
      if (typeof parsed?.sector === 'string' && !sector) setSector(parsed.sector);
      if (typeof parsed?.subsectorId === 'string' && !subsectorId) setSubsectorId(parsed.subsectorId);
      if (typeof parsed?.ruralJurisdiction === 'string' && !ruralJurisdiction) setRuralJurisdiction(parsed.ruralJurisdiction);
      if (typeof parsed?.locationQuery === 'string' && !locationQuery) setLocationQuery(parsed.locationQuery);

      setDraftBanner(t('Draft restored') || 'Draft restored');
      window.setTimeout(() => setDraftBanner(''), 2500);
      draftRestoredRef.current = true;
    } catch (e) {
      console.error('Error restoring draft:', e);
      draftRestoredRef.current = true;
    }
  }, [activePage, t]); // Removed description and other dependencies that caused re-triggering on clear/delete

  useEffect(() => {
    if (activePage !== 'submit-complaint') return;
    try {
      const payload = {
        description,
        selectedDepartmentId,
        selectedService,
        areaType,
        sector,
        subsectorId,
        ruralJurisdiction,
        locationQuery
      };
      localStorage.setItem(CITIZEN_COMPLAINT_DRAFT_KEY, JSON.stringify(payload));
    } catch {
    }
  }, [
    activePage,
    areaType,
    description,
    locationQuery,
    ruralJurisdiction,
    sector,
    subsectorId,
    selectedDepartmentId,
    selectedService
  ]);

  const handleRewriteDescription = async () => {
    if (!description || !description.trim()) return;
    
    setIsRewriting(true);
    
    // Simulate processing time for "thinking" effect
    setTimeout(() => {
      const improved = smartRewrite(description);
      setDescription(improved);
      setIsRewriting(false);
      setRewriteDone(true);
      window.setTimeout(() => setRewriteDone(false), 1500);
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

      if (areaType === 'Urban' && !subsectorId) {
        showNotificationMessage('Please select the Subsector', 'error');
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
      const selectedSubsector = (availableSubsectors || []).find(s => String(s?._id || '') === String(subsectorId || ''));

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
        subsector: selectedSubsector?.name ? String(selectedSubsector.name) : '',
        subsectorId: subsectorId || undefined,
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
          total: (prev.total || 0) + 1,
          pending: (prev.pending || 0) + 1
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
        setSubsectorId('');
        setAvailableSubsectors([]);
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

  const getCoordinatesFromQuery = async (query) => {
    try {
      const q = String(query || '').trim();
      if (!q) return null;

      const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m) {
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, address: '' };
      }

      const cacheKey = q.toLowerCase();
      const cached = geocodeSearchCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const token = localStorage.getItem('token');
      if (geocodeSearchAbortRef.current) geocodeSearchAbortRef.current.abort();
      const controller = new AbortController();
      geocodeSearchAbortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const res = await fetch(
          `${dataService.apiBaseUrl}/complaints/geocode/search?q=${encodeURIComponent(q)}&limit=1`,
          { headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal }
        );
        const data = await res.json().catch(() => null);
        const first = Array.isArray(data?.results) ? data.results[0] : null;
        if (res.ok && data?.success && first && Number.isFinite(first.lat) && Number.isFinite(first.lng)) {
          const out = { lat: Number(first.lat), lng: Number(first.lng), address: String(first.address || '') };
          geocodeSearchCacheRef.current.set(cacheKey, out);
          return out;
        }
      } finally {
        window.clearTimeout(timeout);
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=pk&q=${encodeURIComponent(q)}`);
      const data2 = await response.json().catch(() => null);
      if (Array.isArray(data2) && data2.length > 0) {
        const { lat, lon, display_name } = data2[0];
        const out = { lat: parseFloat(lat), lng: parseFloat(lon), address: display_name };
        geocodeSearchCacheRef.current.set(cacheKey, out);
        return out;
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
        updateAddressPreviewFromLatLng(latitude, longitude);
      }
    }, () => {
      showNotificationMessage('Unable to retrieve your location', 'error');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const handlePickSuggestion = useCallback((s) => {
    const lat = Number(s?.lat);
    const lng = Number(s?.lng);
    const address = String(s?.address || '').trim();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 16);
    }
    if (address) {
      setAddressPreview(address);
    } else {
      updateAddressPreviewFromLatLng(lat, lng);
    }
    setLocationQuery(address || `${lat}, ${lng}`);
    setShowLocationSuggestions(false);
  }, [updateAddressPreviewFromLatLng]);

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    if (locationSuggestions.length > 0 && showLocationSuggestions) {
      handlePickSuggestion(locationSuggestions[0]);
      return;
    }
    const result = await getCoordinatesFromQuery(locationQuery.trim());
    if (result && mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([result.lat, result.lng]);
      mapInstanceRef.current.setView([result.lat, result.lng], 16);
      if (result.address) {
        setAddressPreview(result.address);
      } else {
        updateAddressPreviewFromLatLng(result.lat, result.lng);
      }
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
      
      // Update Language context if changed in settings
      if (settings.language !== language) {
        setLanguage(settings.language);
        localStorage.setItem('language', settings.language);
      }

      // Apply theme
      if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }

      setNotificationType('success');
      setNotificationMessage('Settings saved successfully!');
      setShowNotification(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotificationType('error');
      setNotificationMessage('Failed to save settings.');
      setShowNotification(true);
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

  const createChatId = useCallback(() => `${Date.now()}-${Math.random().toString(16).slice(2)}`, []);

  const extractComplaintIdFromText = useCallback((input) => {
    const text = String(input || '').replace(/#/g, ' ').trim();
    const m1 = text.match(/\b\d{3}-\d{2}-\d{3,}\b/i);
    if (m1) return m1[0];
    const m2 = text.match(/\b[A-Z]{2,4}\/[A-Z]{2,4}\/\d{4}\/\d+\b/i);
    if (m2) return m2[0];
    const m3 = text.match(/\bKHI\/GEN\/\d{4}\/\d+\b/i);
    if (m3) return m3[0];
    return null;
  }, []);

  const formatStatusForChat = useCallback((status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return t('pending');
    if (s === 'assigned') return 'Assigned';
    if (s === 'in-progress' || s === 'progress') return t('inProgress');
    if (s === 'resolved' || s === 'completed') return t('resolved');
    if (s === 'rejected') return t('rejected');
    return status || '';
  }, [t]);

  const fetchComplaintTracking = useCallback(async (complaintId) => {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${dataService.apiBaseUrl}/complaints/track/${encodeURIComponent(complaintId)}`, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return null;
    return data?.complaint || null;
  }, []);

  const updateBotMessage = useCallback((botMessageId, next) => {
    setChatMessages(prev => prev.map(m => (m.id === botMessageId ? { ...m, ...next } : m)));
  }, []);

  const generateBotResponse = useCallback(async (userInput, botMessageId) => {
    let response = '';
    const raw = String(userInput || '');
    const lowerMsg = raw.toLowerCase();

    const isSubmitQuery =
      lowerMsg.includes('submit') ||
      lowerMsg.includes('report') ||
      lowerMsg.includes('issue') ||
      lowerMsg.includes('شکایت') ||
      lowerMsg.includes(String(t('quickReplySubmit') || '').toLowerCase());

    const isStatusQuery =
      lowerMsg.includes('status') ||
      lowerMsg.includes('check') ||
      lowerMsg.includes('حیثیت') ||
      lowerMsg.includes(String(t('quickReplyStatus') || '').toLowerCase());

    const isTrackQuery =
      lowerMsg.includes('track') ||
      lowerMsg.includes('complaint id') ||
      lowerMsg.includes('آئی') ||
      lowerMsg.includes(String(t('quickReplyTrack') || '').toLowerCase());

    const isServiceQuery =
      lowerMsg.includes('service') ||
      lowerMsg.includes('available') ||
      lowerMsg.includes('خدمات') ||
      lowerMsg.includes(String(t('quickReplyServices') || '').toLowerCase());

    const extractedId = extractComplaintIdFromText(raw);
    if (extractedId) {
      const normalized = extractedId.replace(/^#/, '').trim();
      const local = (complaints || []).find(c => String(c?.complaintId || '').toLowerCase() === normalized.toLowerCase());
      const tracked = local
        ? {
            complaintId: local.complaintId,
            status: local.status,
            category: local.category,
            updatedAt: local.updatedAt || local.createdAt
          }
        : await fetchComplaintTracking(normalized);

      if (tracked) {
        const updatedAt = tracked.updatedAt ? new Date(tracked.updatedAt).toLocaleString() : '';
        response =
          `${t('complaintId')}: ${tracked.complaintId}\n` +
          `${t('status')}: ${formatStatusForChat(tracked.status)}\n` +
          `${t('category')}: ${tracked.category || '-'}` +
          (updatedAt ? `\nLast Updated: ${updatedAt}` : '');
      } else {
        response = t('botTrackNotFound') || "I couldn't find a complaint with that ID. Please double-check and try again.";
      }
    } else if (isTrackQuery || isStatusQuery) {
      response = t('botTrackPrompt') || 'Send your Complaint ID (e.g., 123-26-001) and I will check the latest status.';
    } else if (isSubmitQuery) {
      response = t('botSubmitResponse');
    } else if (isServiceQuery) {
      response = t('botServiceResponse');
    } else {
      response = t('botDefaultResponse');
    }

    updateBotMessage(botMessageId, { text: response, sender: 'bot' });
  }, [complaints, extractComplaintIdFromText, fetchComplaintTracking, formatStatusForChat, t, updateBotMessage]);

  const handleSendMessage = () => {
    const text = String(newMessage || '').trim();
    if (!text) return;

    const userMessage = {
      id: createChatId(),
      text: text,
      sender: 'user'
    };

    const botMessageId = createChatId();
    const typingText = (t('Typing...') || 'Typing...') + '';
    const botTyping = { id: botMessageId, text: typingText, sender: 'bot' };

    setChatMessages(prev => [...prev, userMessage, botTyping]);
    setNewMessage('');

    setTimeout(() => {
      generateBotResponse(text, botMessageId);
    }, 250);
  };

  const handleQuickReply = (reply) => {
    const text = String(reply || '').trim();
    if (!text) return;

    const userMessage = {
      id: createChatId(),
      text: text,
      sender: 'user'
    };

    const botMessageId = createChatId();
    const typingText = (t('Typing...') || 'Typing...') + '';
    const botTyping = { id: botMessageId, text: typingText, sender: 'bot' };

    setChatMessages(prev => [...prev, userMessage, botTyping]);
    generateBotResponse(text, botMessageId);
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
      'assigned': t('assigned') || 'Assigned',
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

  const complaintsTrendData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      months.push({ key, month: label, total: 0 });
    }

    const bucketByKey = new Map(months.map(m => [m.key, m]));
    for (const c of complaints || []) {
      const createdAt = c?.createdAt ? new Date(c.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      bucket.total += 1;
    }

    return months;
  }, [complaints]);

  const submitComplaintSteps = useMemo(() => {
    const desc = String(description || '').trim();
    const step1Done = desc.length >= 20;

    const step2Done =
      !selectedDepartmentId ||
      (Boolean(selectedDepartmentId) && String(selectedService || '').trim().length > 0);

    const step3Done = (submissionFiles || []).length > 0;
    const step4Done = areaType === 'Urban'
      ? (String(addressPreview || '').trim().length > 0 && !!sector && !!subsectorId)
      : (String(addressPreview || '').trim().length > 0 && !!ruralJurisdiction);

    const selectedDepartmentName = selectedDepartmentId
      ? (departments.find(d => String(d._id) === String(selectedDepartmentId))?.name || '')
      : '';

    const areaMeta = areaType === 'Urban'
      ? (sector
          ? (subsectorId
              ? (() => {
                  const sub = (availableSubsectors || []).find(s => String(s?._id || '') === String(subsectorId));
                  return sub?.name ? `Urban • ${sector} • ${sub.name}` : `Urban • ${sector}`;
                })()
              : `Urban • ${sector}`)
          : 'Urban')
      : (ruralJurisdiction ? `Rural • ${ruralJurisdiction}` : 'Rural');

    const addrShort = String(addressPreview || '').trim()
      ? String(addressPreview).split(',').slice(0, 2).join(',').trim()
      : '';

    return [
      {
        id: 1,
        label: t('describeIssueTitle'),
        icon: 'fa-pen',
        done: step1Done,
        meta: desc.length > 0 ? `${Math.min(desc.length, 20)}/20` : (t('Add details') || 'Add details')
      },
      {
        id: 2,
        label: t('department') || 'Department',
        icon: 'fa-building',
        done: step2Done,
        meta: selectedDepartmentId
          ? (String(selectedService || '').trim()
              ? (selectedDepartmentName ? `${selectedDepartmentName} • ${selectedService}` : (t('Service selected') || 'Service selected'))
              : (t('Select service') || 'Select service'))
          : (t('Auto-route') || 'Auto-route')
      },
      {
        id: 3,
        label: t('addEvidenceTitle'),
        icon: 'fa-paperclip',
        done: step3Done,
        optional: true,
        meta: step3Done ? `${(submissionFiles || []).length} ${t('files') || 'files'}` : (t('Optional') || 'Optional')
      },
      {
        id: 4,
        label: t('setLocationTitle'),
        icon: 'fa-map-marker-alt',
        done: step4Done,
        meta: step4Done
          ? (addrShort ? `${areaMeta} • ${addrShort}` : areaMeta)
          : (t('Pin location') || 'Pin location')
      }
    ];
  }, [
    addressPreview,
    areaType,
    departments,
    description,
    ruralJurisdiction,
    sector,
    subsectorId,
    availableSubsectors,
    selectedDepartmentId,
    selectedService,
    submissionFiles,
    t
  ]);

  const submitComplaintProgress = useMemo(() => {
    const required = submitComplaintSteps.filter(s => !s.optional);
    const total = required.length;
    const doneCount = required.filter(s => s.done).length;
    return total > 0 ? Math.round((doneCount / total) * 100) : 0;
  }, [submitComplaintSteps]);

  const nextIncompleteStep = useMemo(() => {
    return submitComplaintSteps.find(s => !s.optional && !s.done) || null;
  }, [submitComplaintSteps]);

  const scrollToStep = useCallback((id) => {
    const el = stepElsRef.current?.[id];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleGoToNextIncomplete = useCallback(() => {
    const next = submitComplaintSteps.find(s => !s.optional && !s.done);
    if (next) {
      scrollToStep(next.id);
      return;
    }
    scrollToStep(99);
  }, [scrollToStep, submitComplaintSteps]);

  const handleClearDraft = useCallback(() => {
    setDescription('');
    setSelectedDepartmentId('');
    setSelectedService('');
    setSubmissionFiles([]);
    setLocationQuery('');
    setSector('');
    setSubsectorId('');
    setAvailableSubsectors([]);
    setRuralJurisdiction('');
    setDepartmentManuallySelected(false);
    setRoutingRecommendation(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      const defaultLocation = [33.6844, 73.0479];
      if (mapInstanceRef.current && typeof mapInstanceRef.current.setView === 'function') {
        mapInstanceRef.current.setView(defaultLocation, 13);
      }
      if (markerRef.current && typeof markerRef.current.setLatLng === 'function') {
        markerRef.current.setLatLng(defaultLocation);
      }
    } catch {
    }
    setAddressPreview('');

    try {
      localStorage.removeItem(CITIZEN_COMPLAINT_DRAFT_KEY);
    } catch {
    }

    setDraftBanner(t('Draft cleared') || 'Draft cleared');
    window.setTimeout(() => setDraftBanner(''), 1800);
    scrollToStep(1);
  }, [scrollToStep, t]);

  const tourSteps = useMemo(() => {
    return [
      {
        key: 'stepper',
        title: t('Guided Tour') || 'Guided Tour',
        body: t('This tour will guide you through complaint submission step-by-step.') || 'This tour will guide you through complaint submission step-by-step.',
        getEl: () => stepperRef.current
      },
      {
        key: 'desc',
        title: t('Describe the Issue') || 'Describe the Issue',
        body: t('Write at least 1–2 lines so we can understand your issue clearly. You can also use Rewrite with AI.') || 'Write at least 1–2 lines so we can understand your issue clearly. You can also use Rewrite with AI.',
        getEl: () => stepElsRef.current?.[1] || null
      },
      {
        key: 'dept',
        title: t('Department & Service') || 'Department & Service',
        body: t('You can keep Auto-route, or select a Department and then a Service.') || 'You can keep Auto-route, or select a Department and then a Service.',
        getEl: () => stepElsRef.current?.[2] || null
      },
      {
        key: 'upload',
        title: t('Add Evidence') || 'Add Evidence',
        body: t('Upload photos/videos (optional) to support your complaint.') || 'Upload photos/videos (optional) to support your complaint.',
        getEl: () => stepElsRef.current?.[3] || null
      },
      {
        key: 'search',
        title: t('Search Location') || 'Search Location',
        body: t('Type an area/landmark and pick from the dropdown suggestions for faster results.') || 'Type an area/landmark and pick from the dropdown suggestions for faster results.',
        getEl: () => searchInputRef.current
      },
      {
        key: 'map',
        title: t('Pin Location') || 'Pin Location',
        body: t('Click on map or drag marker to set the exact location.') || 'Click on map or drag marker to set the exact location.',
        getEl: () => mapWrapperRef.current || mapRef.current
      },
      {
        key: 'submit',
        title: t('Submit') || 'Submit',
        body: t('When all required steps are complete, submit your complaint.') || 'When all required steps are complete, submit your complaint.',
        getEl: () => submitButtonRef.current || stepElsRef.current?.[99] || null
      }
    ];
  }, [t]);

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

    const tooltipWidth = Math.min(380, Math.max(260, Math.floor(window.innerWidth * 0.9)));
    const tooltipHeight = 170;
    const gap = 14;

    const preferBottom = rect.bottom + gap + tooltipHeight < window.innerHeight;
    const placement = preferBottom ? 'bottom' : 'top';
    const top = placement === 'bottom'
      ? Math.min(window.innerHeight - tooltipHeight - 16, rect.bottom + gap)
      : Math.max(16, rect.top - gap - tooltipHeight);

    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.min(window.innerWidth - tooltipWidth - 16, Math.max(16, centeredLeft));

    setTourTooltipPos({ top, left, placement });
  }, [tourIndex, tourOpen, tourSteps]);

  const openTour = useCallback(() => {
    setTourOpen(true);
    setTourIndex(0);
    window.setTimeout(() => {
      try {
        const el = tourSteps[0]?.getEl?.();
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      } catch {}
      window.setTimeout(() => computeTourLayout(), 120);
    }, 50);
  }, [computeTourLayout, tourSteps]);

  const closeTour = useCallback((markSeen) => {
    setTourOpen(false);
    setTourRect(null);
    if (markSeen) {
      try {
        localStorage.setItem(CITIZEN_COMPLAINT_TOUR_SEEN_KEY, '1');
      } catch {}
    }
  }, []);

  const nextTour = useCallback(() => {
    const next = Math.min(tourSteps.length - 1, tourIndex + 1);
    setTourIndex(next);
    window.setTimeout(() => {
      try {
        const el = tourSteps[next]?.getEl?.();
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      } catch {}
      window.setTimeout(() => computeTourLayout(), 120);
    }, 30);
  }, [computeTourLayout, tourIndex, tourSteps]);

  const prevTour = useCallback(() => {
    const prev = Math.max(0, tourIndex - 1);
    setTourIndex(prev);
    window.setTimeout(() => {
      try {
        const el = tourSteps[prev]?.getEl?.();
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      } catch {}
      window.setTimeout(() => computeTourLayout(), 120);
    }, 30);
  }, [computeTourLayout, tourIndex, tourSteps]);

  useEffect(() => {
    if (!tourOpen) return;
    computeTourLayout();
    const onResize = () => computeTourLayout();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [computeTourLayout, tourOpen]);

  useEffect(() => {
    if (activePage !== 'submit-complaint') return;
    if (tourOpen) return;
    try {
      const seen = localStorage.getItem(CITIZEN_COMPLAINT_TOUR_SEEN_KEY);
      if (seen) return;
    } catch {}
    window.setTimeout(() => openTour(), 350);
  }, [activePage, openTour, tourOpen]);

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
              <img className="app-logo" src={BRAND_LOGO_URL} alt={t('appTitle')} />
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
              aria-label={isMobile ? t('closeSidebar') || 'Close sidebar' : (sidebarCollapsed ? t('expandSidebar') || "Expand sidebar" : t('collapseSidebar') || "Collapse sidebar")}
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
      {isMobile && sidebarMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarMobileOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSidebarMobileOpen(false);
          }}
        />
      )}

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="header">
          <div className="user-info">
            {isMobile && !sidebarMobileOpen && (
              <button
                className="header-sidebar-toggle"
                onClick={() => setSidebarMobileOpen(true)}
                aria-label={t('openSidebar') || "Open sidebar"}
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
          <div className="header-actions">
            <button type="button" className="header-pill language-toggle" onClick={toggleLanguage}>
              {language === 'english' ? 'اردو' : 'English'}
            </button>
            <button type="button" className="header-pill notification-bell" onClick={() => setActivePage('notifications')} aria-label={t('notifications')}>
              <i className="fas fa-bell"></i>
              {dashboardStats.unreadNotifications > 0 && (
                <span className="notification-badge">{dashboardStats.unreadNotifications}</span>
              )}
            </button>
          </div>
        </div>

        {/* Dashboard Page */}
        {activePage === 'dashboard' && (
          <div className="page-content active">
            <div className="dashboard-hero">
              <div className="dashboard-hero-content">
                <div className="dashboard-hero-kicker">{t('citizenDashboard')}</div>
                <div className="dashboard-hero-title">
                  {user?.fullName ? `${user.fullName}` : t('user')}
                </div>
                <div className="dashboard-hero-subtitle">{t('dashboardOverview') || 'Dashboard Overview'}</div>
                <div className="dashboard-hero-actions">
                  <button type="button" className="hero-btn hero-primary" onClick={() => setActivePage('submit-complaint')}>
                    <i className="fas fa-plus-circle"></i>
                    <span>{t('submitComplaint')}</span>
                  </button>
                  <button type="button" className="hero-btn hero-secondary" onClick={() => setActivePage('my-complaints')}>
                    <i className="fas fa-list"></i>
                    <span>{t('myComplaints')}</span>
                  </button>
                </div>
              </div>
              <div className="dashboard-hero-metrics">
                <div className="metric-chip">
                  <div className="metric-chip-icon total"><i className="fas fa-clipboard-list"></i></div>
                  <div className="metric-chip-meta">
                    <div className="metric-chip-value">{dashboardStats?.total || 0}</div>
                    <div className="metric-chip-label">{t('totalComplaints')}</div>
                  </div>
                </div>
                <div className="metric-chip">
                  <div className="metric-chip-icon pending"><i className="fas fa-clock"></i></div>
                  <div className="metric-chip-meta">
                    <div className="metric-chip-value">{dashboardStats?.pending || 0}</div>
                    <div className="metric-chip-label">{t('pending')}</div>
                  </div>
                </div>
                <div className="metric-chip">
                  <div className="metric-chip-icon progress"><i className="fas fa-spinner"></i></div>
                  <div className="metric-chip-meta">
                    <div className="metric-chip-value">{dashboardStats?.inProgress || 0}</div>
                    <div className="metric-chip-label">{t('inProgress')}</div>
                  </div>
                </div>
                <div className="metric-chip">
                  <div className="metric-chip-icon resolved"><i className="fas fa-check-circle"></i></div>
                  <div className="metric-chip-meta">
                    <div className="metric-chip-value">{dashboardStats?.resolved || 0}</div>
                    <div className="metric-chip-label">{t('resolved')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-insights">
              <div className="insight-card">
                <div className="insight-card-header">
                  <div className="insight-card-title">{t('complaintsTrend') || 'Complaints Trend'}</div>
                  <div className="insight-card-subtitle">{t('last6Months') || 'Last 6 months'}</div>
                </div>
                <div className="insight-card-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={complaintsTrendData} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="citizenTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#667eea" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#667eea" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)'
                        }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#667eea" strokeWidth={3} fill="url(#citizenTrend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-card-header">
                  <div className="insight-card-title">{t('recentActivity') || 'Recent Activity'}</div>
                  <div className="insight-card-subtitle">{t('recentComplaints')}</div>
                </div>
                <div className="insight-card-body insight-mini-list">
                  {complaints.slice(0, 4).map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      className="mini-row"
                      onClick={() => handleViewComplaint(c._id)}
                    >
                      <div className="mini-row-left">
                        <div className="mini-row-title">{c.category}</div>
                        <div className="mini-row-sub">{formatDate(c.createdAt)}</div>
                      </div>
                      <div className="mini-row-right">
                        {getStatusBadge(c.status)}
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    </button>
                  ))}
                  {complaints.length === 0 && (
                    <div className="mini-empty">{t('noComplaints')}</div>
                  )}
                </div>
              </div>
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

            <div className="complaint-stepper" ref={stepperRef}>
              <div className="complaint-stepper-top">
                <div className="complaint-stepper-title">
                  {t('submitComplaint') || 'Submit Complaint'}
                  {nextIncompleteStep ? (
                    <span className="complaint-stepper-next">
                      {(t('Next') || 'Next') + ': '}{nextIncompleteStep.label}
                    </span>
                  ) : null}
                </div>
                <div className="complaint-stepper-actions">
                  <button type="button" className="stepper-action-btn" onClick={handleGoToNextIncomplete}>
                    <i className="fas fa-arrow-down"></i>
                    <span>{t('Next missing') || 'Next missing'}</span>
                  </button>
                  <button type="button" className="stepper-action-btn" onClick={openTour}>
                    <i className="fas fa-circle-question"></i>
                    <span>{t('Guide') || 'Guide'}</span>
                  </button>
                  <button type="button" className="stepper-action-btn danger" onClick={handleClearDraft}>
                    <i className="fas fa-trash"></i>
                    <span>{t('Clear') || 'Clear'}</span>
                  </button>
                  <div className="complaint-stepper-badge">{submitComplaintProgress}%</div>
                </div>
              </div>
              {draftBanner ? <div className="draft-banner">{draftBanner}</div> : null}
              <div className="complaint-stepper-bar">
                <div className="complaint-stepper-bar-fill" style={{ width: `${submitComplaintProgress}%` }} />
              </div>
              <div className="complaint-stepper-steps">
                {submitComplaintSteps.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`stepper-item ${s.done ? 'done' : ''}`}
                    onClick={() => scrollToStep(s.id)}
                  >
                    <div className="stepper-dot">
                      <i className={`fas ${s.done ? 'fa-check' : s.icon}`}></i>
                    </div>
                    <div className="stepper-meta">
                      <div className="stepper-label">
                        {s.label}
                        {s.optional ? <span className="stepper-optional">({t('optional') || 'Optional'})</span> : null}
                      </div>
                      <div className="stepper-sub">{s.meta}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="complaint-form premium-form">
              <form onSubmit={handleComplaintSubmit}>
                
                {/* Step 1: Description */}
                <div className="form-section animated-input" ref={(el) => { stepElsRef.current[1] = el; }}>
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
                    >
                      {isRewriting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          <span>{t('rewriting')}</span>
                        </>
                      ) : rewriteDone ? (
                        <>
                          <i className="fas fa-check"></i>
                          <span>{t('Updated') || 'Updated'}</span>
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
                <div className="form-section animated-input" ref={(el) => { stepElsRef.current[2] = el; }}>
                  <div className="section-header">
                    <div className="section-number">2</div>
                    <div className="section-info">
                      <h3 className="section-title">{t('selectDepartmentTitle') || 'Department & Service'}</h3>
                      <p className="section-subtitle">{t('selectDepartmentDesc') || 'Select a department, or use the recommended one based on your complaint'}</p>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">{t('department') || 'Department'} <span className="stepper-optional">({t('optional') || 'Optional'})</span></label>
                    <div className="routing-recommendation">
                      {isRoutingAnalyzing ? (t('analyzing') || 'Analyzing complaint…') : (
                        routingRecommendation?.recommendedDepartment?.name
                          ? `${t('recommendation') || 'Recommendation'}: ${routingRecommendation.recommendedDepartment.name}`
                          : (t('recommendation') || 'Recommendation') + ': -'
                      )}
                    </div>
                    <select 
                      className="premium-select"
                      value={selectedDepartmentId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedDepartmentId(v);
                        setDepartmentManuallySelected(Boolean(v));
                      }}
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
                    <div className="form-group">
                      <label className="form-label">{t('service') || 'Service'}</label>
                      <select 
                        className="premium-select"
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        required
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
                <div className="form-section animated-input" ref={(el) => { stepElsRef.current[3] = el; }}>
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
                      <div className="selected-files-count">
                        <i className="fas fa-check"></i> {submissionFiles.length} files selected
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Step 4: Location */}
                <div className="form-section animated-input" ref={(el) => { stepElsRef.current[4] = el; }}>
                  <div className="section-header">
                    <div className="section-number">4</div>
                    <div className="section-info">
                      <h3 className="section-title">{t('setLocationTitle')}</h3>
                      <p className="section-subtitle">{t('setLocationDesc')}</p>
                    </div>
                  </div>
                  
                  <div className="location-top">
                    <div className="form-group">
                      <label className="form-label">{t('areaType') || 'Area Type'}</label>
                      <div className="area-type-options">
                        <label className={`area-type-card ${areaType === 'Urban' ? 'active' : ''}`}>
                          <input 
                            type="radio" 
                            name="areaType" 
                            value="Urban" 
                            checked={areaType === 'Urban'} 
                            onChange={(e) => setAreaType(e.target.value)} 
                          />
                          <span>{t('urbanSectors') || 'Urban (Islamabad Sectors)'}</span>
                        </label>
                        <label className={`area-type-card ${areaType === 'Rural' ? 'active' : ''}`}>
                          <input 
                            type="radio" 
                            name="areaType" 
                            value="Rural" 
                            checked={areaType === 'Rural'} 
                            onChange={(e) => setAreaType(e.target.value)} 
                          />
                          <span>{t('ruralJurisdictions') || 'Rural (Jurisdictions)'}</span>
                        </label>
                      </div>
                    </div>

                    {areaType === 'Urban' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">{t('sector') || 'Sector'}</label>
                          <select
                            className="premium-select"
                            value={sector}
                            onChange={(e) => {
                              setSector(e.target.value);
                              setSubsectorId('');
                            }}
                          >
                            <option value="">{t('selectSector') || 'Select Sector'}</option>
                            {availableSectors.map(sec => (
                              <option key={sec._id} value={sec.name}>{sec.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('subsector') || 'Subsector'}</label>
                          <select
                            className="premium-select"
                            value={subsectorId}
                            onChange={(e) => setSubsectorId(e.target.value)}
                            disabled={!sector}
                          >
                            <option value="">{t('selectSubsector') || 'Select Subsector'}</option>
                            {availableSubsectors.map(sub => (
                              <option key={sub._id} value={sub._id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {areaType === 'Rural' && (
                      <div className="form-group">
                        <label className="form-label">{t('ruralJurisdiction') || 'Rural Jurisdiction'}</label>
                        <select 
                          className="premium-select"
                          value={ruralJurisdiction}
                          onChange={(e) => setRuralJurisdiction(e.target.value)}
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
                        ref={searchInputRef}
                        onFocus={() => setShowLocationSuggestions(true)}
                        onBlur={() => {
                          window.setTimeout(() => setShowLocationSuggestions(false), 180);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearchLocation(e);
                          if (e.key === 'Escape') setShowLocationSuggestions(false);
                        }}
                      />
                      {showLocationSuggestions && (isLocationSuggesting || locationSuggestions.length > 0) && (
                        <div className="location-suggest-dropdown">
                          {isLocationSuggesting && (
                            <div className="location-suggest-item muted">
                              <span>{t('Searching...') || 'Searching...'}</span>
                            </div>
                          )}
                          {!isLocationSuggesting && locationSuggestions.length === 0 && (
                            <div className="location-suggest-item muted">
                              <span>{t('No results') || 'No results'}</span>
                            </div>
                          )}
                          {locationSuggestions.map((s, idx) => (
                            <button
                              key={`${s?.lat}-${s?.lng}-${idx}`}
                              type="button"
                              className="location-suggest-item"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handlePickSuggestion(s)}
                            >
                              <div className="location-suggest-title">{String(s?.address || '').split(',')[0] || 'Location'}</div>
                              <div className="location-suggest-sub">{String(s?.address || '').trim()}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      <button 
                        type="button" 
                        className="location-btn search-btn"
                        onClick={handleSearchLocation}
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
                    <div ref={mapWrapperRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                    {mapState.status === 'loading' && (
                      <div className="map-overlay">
                        <div className="map-overlay-card">
                          <div className="map-overlay-title">{t('Loading map...') || 'Loading map...'}</div>
                          <div className="map-overlay-sub">{t('Please wait') || 'Please wait'}</div>
                        </div>
                      </div>
                    )}
                    {mapState.status === 'error' && (
                      <div className="map-overlay">
                        <div className="map-overlay-card">
                          <div className="map-overlay-title">{t('Map not loading') || 'Map not loading'}</div>
                          <div className="map-overlay-sub">{mapState.message || (t('Try again') || 'Try again')}</div>
                          <button
                            type="button"
                            className="map-retry-btn"
                            onClick={() => {
                              mapInitAttemptRef.current += 1;
                              setMapState({ status: 'loading', message: '' });
                              window.setTimeout(() => {
                                try {
                                  if (!mapInstanceRef.current && mapRef.current && window.L) initializeMap();
                                } catch {
                                  setMapState({ status: 'error', message: 'Map failed to initialize' });
                                }
                              }, 120);
                            }}
                          >
                            <i className="fas fa-rotate-right"></i>
                            <span>{t('Retry') || 'Retry'}</span>
                          </button>
                        </div>
                      </div>
                    )}
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
                
                <div className="form-group submit-group" ref={(el) => { stepElsRef.current[99] = el; }}>
                  <button ref={submitButtonRef} type="submit" className="btn btn-primary premium-submit" disabled={isLoading}>
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

            {tourOpen && (
              <div className="tour-overlay" role="dialog" aria-modal="true">
                <div className="tour-dim" />
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
                <div className="tour-tooltip" style={{ top: `${tourTooltipPos.top}px`, left: `${tourTooltipPos.left}px` }}>
                  <div className="tour-step">
                    {tourIndex + 1} / {tourSteps.length}
                  </div>
                  <div className="tour-title">{tourSteps[tourIndex]?.title}</div>
                  <div className="tour-body">{tourSteps[tourIndex]?.body}</div>
                  <div className="tour-actions">
                    <button type="button" className="tour-btn ghost" onClick={() => closeTour(true)}>
                      {t('Skip') || 'Skip'}
                    </button>
                    <div className="tour-actions-right">
                      <button type="button" className="tour-btn ghost" onClick={prevTour} disabled={tourIndex === 0}>
                        {t('Back') || 'Back'}
                      </button>
                      <button
                        type="button"
                        className="tour-btn primary"
                        onClick={() => {
                          if (tourIndex === tourSteps.length - 1) closeTour(true);
                          else nextTour();
                        }}
                      >
                        {tourIndex === tourSteps.length - 1 ? (t('Finish') || 'Finish') : (t('Next') || 'Next')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                      {new Date(notification.createdAt || notification.timestamp).toLocaleString()}
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
              <h3 className="modal-title">{t('complaintDetails') || 'Complaint Details'}</h3>
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
                  <div className="detail-label">{t('complaintId')}</div>
                  <div className="detail-value">{selectedComplaint.complaintId}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('category')}</div>
                  <div className="detail-value">{selectedComplaint.category}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('status')}</div>
                  <div className="detail-value">
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                </div>
                {selectedComplaint.assignedTo && (
                  <div className="detail-item">
                    <div className="detail-label">{t('assignedOfficer') || 'Assigned Officer'}</div>
                    <div className="detail-value">
                      {selectedComplaint.assignedTo.fullName}
                      {selectedComplaint.assignedTo.email ? ` (${selectedComplaint.assignedTo.email}` : ''}
                      {selectedComplaint.assignedTo.phone ? `${selectedComplaint.assignedTo.email ? ', ' : ' ('}${selectedComplaint.assignedTo.phone})` : (selectedComplaint.assignedTo.email ? ')' : '')}
                    </div>
                  </div>
                )}
                {selectedComplaint.status === 'in-progress' && Array.isArray(selectedComplaint.checkIns) && selectedComplaint.checkIns.length > 0 && (
                  <div className="detail-item">
                    <div className="detail-label">{t('officerLiveLocation') || 'Officer Live Location'}</div>
                    <div className="detail-value">
                      {selectedComplaint.checkIns[selectedComplaint.checkIns.length - 1].location?.address || 
                        `${selectedComplaint.checkIns[selectedComplaint.checkIns.length - 1].location?.lat}, ${selectedComplaint.checkIns[selectedComplaint.checkIns.length - 1].location?.lng}`}
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <div className="detail-label">{t('dateSubmitted') || 'Date Submitted'}</div>
                  <div className="detail-value">
                    {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('lastUpdated') || 'Last Updated'}</div>
                  <div className="detail-value">
                    {new Date(selectedComplaint.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">{t('description') || 'Description'}</div>
                  <div className="detail-value">{selectedComplaint.description}</div>
                </div>
                {selectedComplaint.remarks && (
                  <div className="detail-item">
                    <div className="detail-label">{t('remarks') || 'Remarks'}</div>
                    <div className="detail-value">{selectedComplaint.remarks}</div>
                  </div>
                )}
                {selectedComplaint.resolutionDetails && (
                  <div className="detail-item">
                    <div className="detail-label">{t('resolutionDetails') || 'Resolution Details'}</div>
                    <div className="detail-value">{selectedComplaint.resolutionDetails}</div>
                  </div>
                )}
              {/* Feedback Form for resolved complaints */}
              {selectedComplaint.status === 'resolved' && !(selectedComplaint.feedback && (selectedComplaint.feedback.rating != null || selectedComplaint.feedback.createdAt)) && (
                <div className="feedback-section-premium">
                  <h4 className="form-title">{t('rateResolution') || 'Rate Resolution'}</h4>
                  
                  <div className="form-group">
                    <label className="form-label">{t('howWasExperience') || 'How was your experience?'}</label>
                    <div className="star-rating-wrapper">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`${(hoverRating || feedback.rating) >= star ? 'fas' : 'far'} fa-star star-icon`}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setFeedback({ ...feedback, rating: star })}
                        ></i>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('comment') || 'Your Feedback'}</label>
                    <div className="premium-input-wrapper">
                      <textarea 
                        className="form-control premium-textarea"
                        rows="4"
                        value={feedback.comment}
                        onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                        placeholder={t('shareExperiencePlaceholder') || "Share your experience with us..."}
                      ></textarea>
                      <div className="input-decoration"></div>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary premium-submit"
                    type="button"
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
                          setNotificationType('success');
                          setNotificationMessage(t('thanksFeedback') || 'Thanks for your feedback!');
                          setShowNotification(true);
                          setSelectedComplaint(prev => ({
                            ...(prev || {}),
                            feedback: data.feedback || data?.complaint?.feedback || {
                              rating: feedback.rating,
                              comment: feedback.comment,
                              createdAt: new Date().toISOString()
                            }
                          }));
                          if (selectedComplaint?._id) {
                            refreshComplaintDetails(selectedComplaint._id);
                          }
                          setFeedback({ rating: 5, comment: '' });
                        } else {
                          showNotificationMessage(data.message || t('failedFeedback') || 'Failed to submit feedback', 'error');
                        }
                      } catch (err) {
                        showNotificationMessage(t('failedFeedback') || 'Failed to submit feedback', 'error');
                      }
                    }}
                  >
                    <i className="fas fa-paper-plane"></i> {t('submitFeedbackBtn') || 'Submit Feedback'}
                  </button>
                </div>
              )}
              {selectedComplaint.status === 'resolved' && (selectedComplaint.feedback && (selectedComplaint.feedback.rating != null || selectedComplaint.feedback.createdAt)) && (
                <div className="feedback-section-premium">
                  <h4 className="form-title">{t('rateResolution') || 'Rate Resolution'}</h4>
                  <div style={{ color: '#64748b', fontWeight: 700 }}>
                    {t('feedbackAlreadySubmitted') || 'Feedback already submitted.'}
                  </div>
                </div>
              )}
              </div>
              
              {/* Unified Media Gallery */}
              {(
                (selectedComplaint.media && selectedComplaint.media.length > 0) || 
                (selectedComplaint.evidence && selectedComplaint.evidence.length > 0)
              ) && (
                <>
                  <h4 style={{ marginTop: '25px' }}>{t('mediaAttachments') || 'Media Attachments'}</h4>
                  <div className="media-gallery" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {/* Initial Complaint Media */}
                    {selectedComplaint.media && selectedComplaint.media.map((media, index) => (
                      <div key={`initial-${index}`} className="media-item">
                        <a href={getImageUrl(media.url)} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={getImageUrl(media.url)} 
                            alt={`${t('complaintMedia') || 'Complaint Media'} ${index + 1}`} 
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
                              alt={`${t('evidence') || 'Evidence'} ${i+1}-${j+1}`} 
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
                  <h4 style={{ marginTop: '25px' }}>{t('updatesLog') || 'Updates Log'}</h4>
                  <div className="evidence-list">
                    {selectedComplaint.evidence.map((ev, i) => (
                      <div key={i} className="evidence-item" style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                          <p style={{ fontWeight: 'bold', margin: 0 }}>{ev.description}</p>
                          <small style={{ color: '#6c757d' }}>{new Date(ev.uploadedAt).toLocaleString()}</small>
                        </div>
                        {ev.files && ev.files.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            <i className="fas fa-paperclip"></i> {ev.files.length} {t('fileAttached') || 'file(s) attached'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ marginTop: '20px' }}>
                <button
                  className="btn btn-info"
                  onClick={() => { setShowComplaintModal(false); setShowChatPanel(true); }}
                >
                  <i className="fas fa-comments"></i> {t('chatWithOfficer') || 'Chat with Field Officer'}
                </button>
              </div>
            </div>
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
            
            <h2 className="success-title">{t('complaintSuccessTitle') || 'Complaint Submitted Successfully!'}</h2>
            <p className="success-subtitle">{t('complaintSuccessSubtitle') || 'Your complaint has been registered and will be reviewed shortly'}</p>
            
            <div className="success-details">
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('complaintId')}</span>
                  <span className="detail-value">{submittedComplaint.complaintId}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-th-large"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('category')}</span>
                  <span className="detail-value">{submittedComplaint.category}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('status')}</span>
                  <span className="detail-value status-pending">{t('pendingReview') || 'Pending Review'}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="detail-content">
                  <span className="detail-label">{t('expectedResolution') || 'Expected Resolution'}</span>
                  <span className="detail-value">{t('businessDays')}</span>
                </div>
              </div>
            </div>
            
            <div className="success-footer">
              <i className="fas fa-info-circle"></i>
              <p>{t('successFooterText') || 'You will receive notifications about the progress of your complaint. You can track the status anytime from your dashboard.'}</p>
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
                {t('goToDashboard') || 'Go to Dashboard'}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActivePage('my-complaints');
                }}
              >
                <i className="fas fa-list"></i>
                {t('viewMyComplaints') || 'View My Complaints'}
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
              <span>{t('botTitle') || 'Awaz e Shehr Assistant'}</span>
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
              placeholder={t('chatbotPlaceholder') || "Type your message here..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="chatbot-send" onClick={handleSendMessage}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
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
  );
};
export default CitizenDashboard;
