import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import dataService from '../services/dataService';
import { useLanguage } from '../contexts/LanguageContext';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [deps, setDeps] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [newDep, setNewDep] = useState({ name: '', location: '', jurisdiction: '', servicesOffered: '', areaTypes: ['Urban'], sectors: [], ruralJurisdictions: [] });
  const [newDepLocationValidated, setNewDepLocationValidated] = useState(false);
  const [newDepLocationValidatedText, setNewDepLocationValidatedText] = useState('');
  const [newDepLocationValidating, setNewDepLocationValidating] = useState(false);
  const [newUser, setNewUser] = useState({ role: 'dept-admin', fullName: '', email: '', password: '', departmentId: '', areaType: 'Urban' });
  const [users, setUsers] = useState({ admins: [], officers: [], citizens: [] });
  const [trends, setTrends] = useState([]);
  const [perf, setPerf] = useState([]);
  const [filters, setFilters] = useState({ status: '', department: '' });
  const [saCreateStatus, setSaCreateStatus] = useState('');
  const [saCreateError, setSaCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activePage, setActivePage] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [urbanSectors, setUrbanSectors] = useState([]);
  const [ruralJurisdictions, setRuralJurisdictions] = useState([]);
  const [newSector, setNewSector] = useState({ name: '' });
  const [newJurisdiction, setNewJurisdiction] = useState({ name: '' });
  const [routingPolicies, setRoutingPolicies] = useState([]);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    category: '',
    areaType: 'Any',
    sector: '',
    ruralJurisdiction: '',
    priority: 100,
    allowedPriorities: [],
    keywords: '',
    maxOpenComplaints: '',
    daysOfWeek: [],
    startTime: '',
    endTime: '',
    actionType: 'route',
    departmentId: '',
    note: ''
  });
  const [categoryMappings, setCategoryMappings] = useState([]);
  const [newMapping, setNewMapping] = useState({ categoryName: '', departmentId: '' });
  const [policies, setPolicies] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDep, setEditingDep] = useState(null);
  const [editDepLocationValidated, setEditDepLocationValidated] = useState(false);
  const [editDepLocationValidatedText, setEditDepLocationValidatedText] = useState('');
  const [editDepLocationValidating, setEditDepLocationValidating] = useState(false);
  const [coverageNormalizationRan, setCoverageNormalizationRan] = useState(false);
  const [hierarchyTab, setHierarchyTab] = useState('urban');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [routingSearch, setRoutingSearch] = useState('');
  const [complaintsFilterMode, setComplaintsFilterMode] = useState('urban');
  const [filterUrbanSector, setFilterUrbanSector] = useState('');
  const [filterRuralJurisdiction, setFilterRuralJurisdiction] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [rerouteRequests, setRerouteRequests] = useState([]);
  const [rerouteApproveTarget, setRerouteApproveTarget] = useState({});
  const [routingSim, setRoutingSim] = useState({ category: '', areaType: 'Urban', sector: '', ruralJurisdiction: '', service: '', priority: 'medium', text: '' });

  const showModal = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalOpen(true);
  };

  const normalizeKey = (v) => String(v || '').trim().toLowerCase();
  const parseTimeToMinutes = (timeStr) => {
    const raw = String(timeStr || '').trim();
    if (!raw) return null;
    const parts = raw.split(':');
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  };

  const depCovers = (dep, areaType, sector, ruralJurisdiction) => {
    const types = Array.isArray(dep?.areaTypes) ? dep.areaTypes : [];
    if (!types.includes(areaType)) return false;
    if (areaType === 'Urban') {
      const s = String(sector || '').trim();
      if (!s) return true;
      return Array.isArray(dep?.sectors) && dep.sectors.some(x => normalizeKey(x) === normalizeKey(s));
    }
    const r = String(ruralJurisdiction || '').trim();
    if (!r) return true;
    return Array.isArray(dep?.ruralJurisdictions) && dep.ruralJurisdictions.some(x => normalizeKey(x) === normalizeKey(r));
  };

  const depOffersService = (dep, service) => {
    const s = String(service || '').trim();
    if (!s) return true;
    const list = Array.isArray(dep?.servicesOffered) ? dep.servicesOffered : [];
    return list.some(x => normalizeKey(x) === normalizeKey(s));
  };

  const serviceOptions = React.useMemo(() => {
    const set = new Set();
    (deps || []).forEach(d => {
      (d?.servicesOffered || []).forEach(s => {
        const v = String(s || '').trim();
        if (v) set.add(v);
      });
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [deps]);

  const buildJurisdictionText = (areaTypes, sectors, ruralAreas) => {
    const types = Array.isArray(areaTypes) ? areaTypes : [];
    const parts = [];
    if (types.includes('Urban')) {
      const s = Array.isArray(sectors) ? sectors.filter(Boolean) : [];
      parts.push(`Urban: ${s.length ? s.join(', ') : 'Select sectors'}`);
    }
    if (types.includes('Rural')) {
      const r = Array.isArray(ruralAreas) ? ruralAreas.filter(Boolean) : [];
      parts.push(`Rural: ${r.length ? r.join(', ') : 'Select rural jurisdictions'}`);
    }
    return parts.join(' | ');
  };

  const isCoverageReady = (dep) => {
    const types = Array.isArray(dep?.areaTypes) ? dep.areaTypes : [];
    if (types.length === 0) return false;
    if (types.includes('Urban') && (!Array.isArray(dep?.sectors) || dep.sectors.length === 0)) return false;
    if (types.includes('Rural') && (!Array.isArray(dep?.ruralJurisdictions) || dep.ruralJurisdictions.length === 0)) return false;
    return true;
  };

  const routingSimulation = React.useMemo(() => {
    const category = String(routingSim.category || '').trim();
    const areaType = String(routingSim.areaType || 'Urban');
    const sector = String(routingSim.sector || '').trim();
    const ruralJurisdiction = String(routingSim.ruralJurisdiction || '').trim();
    const service = String(routingSim.service || '').trim();
    const priority = String(routingSim.priority || '').trim().toLowerCase();
    const text = String(routingSim.text || '').trim();
    const categoryKey = normalizeKey(category);

    if (!category) {
      return { ok: false, message: 'Select a category', candidates: [], selection: null };
    }

    const activeDeps = (deps || []).filter(d => d && d.isActive !== false);
    const candidates = activeDeps
      .filter(d => depCovers(d, areaType, sector, ruralJurisdiction))
      .filter(d => depOffersService(d, service));

    const openCountsByDepId = new Map();
    (complaints || []).forEach(c => {
      const s = String(c?.status || '').toLowerCase();
      if (s !== 'pending' && s !== 'in-progress') return;
      const id = String(c?.departmentId?._id || c?.departmentId || '');
      if (!id) return;
      openCountsByDepId.set(id, (openCountsByDepId.get(id) || 0) + 1);
    });

    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const day = now.getDay();

    const matchesKeywords = (keywords, input) => {
      if (!Array.isArray(keywords) || keywords.length === 0) return true;
      const hay = String(input || '').toLowerCase();
      return keywords.some(k => hay.includes(String(k || '').toLowerCase()));
    };

    const withinTimeWindow = (tw) => {
      if (!tw) return true;
      const days = Array.isArray(tw.daysOfWeek) ? tw.daysOfWeek : [];
      if (days.length > 0 && !days.includes(day)) return false;
      const start = typeof tw.startMinutes === 'number' ? tw.startMinutes : null;
      const end = typeof tw.endMinutes === 'number' ? tw.endMinutes : null;
      if (start == null || end == null) return true;
      if (start <= end) return minutesNow >= start && minutesNow <= end;
      return minutesNow >= start || minutesNow <= end;
    };

    const policies = (routingPolicies || []).filter(p => p && p.enabled !== false);
    const matchingPolicies = policies
      .filter(p => normalizeKey(p?.match?.categoryKey || p?.match?.categoryName) === categoryKey)
      .filter(p => {
        const at = String(p?.match?.areaType || 'Any');
        return at === 'Any' || at === areaType;
      })
      .filter(p => {
        if (areaType === 'Urban') {
          const ps = String(p?.match?.sector || '').trim();
          if (!ps) return true;
          return normalizeKey(ps) === normalizeKey(sector);
        }
        const pr = String(p?.match?.ruralJurisdiction || '').trim();
        if (!pr) return true;
        return normalizeKey(pr) === normalizeKey(ruralJurisdiction);
      })
      .filter(p => {
        const allowed = Array.isArray(p?.conditions?.allowedPriorities) ? p.conditions.allowedPriorities : [];
        if (allowed.length === 0) return true;
        if (!priority) return true;
        return allowed.includes(priority);
      })
      .filter(p => matchesKeywords(p?.conditions?.keywords, text))
      .filter(p => withinTimeWindow(p?.conditions?.timeWindow))
      .filter(p => {
        const maxOpen = typeof p?.conditions?.maxOpenComplaints === 'number' ? p.conditions.maxOpenComplaints : null;
        if (maxOpen == null) return true;
        const depId = p?.action?.departmentId?._id || p?.action?.departmentId;
        if (!depId) return true;
        const open = openCountsByDepId.get(String(depId)) || 0;
        return open <= maxOpen;
      })
      .sort((a, b) => {
        const ap = typeof a.priority === 'number' ? a.priority : 999;
        const bp = typeof b.priority === 'number' ? b.priority : 999;
        if (ap !== bp) return ap - bp;
        const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bt - at;
      });

    const pickFromPolicy = () => {
      for (const p of matchingPolicies) {
        const actionType = String(p?.action?.type || 'route');
        const dep = p?.action?.departmentId || null;

        if (actionType === 'route') {
          if (!dep) {
            return { ok: true, selection: null, message: `Matched policy, but department is missing (${p.name})`, reason: { type: 'policy-invalid', policy: p }, actionType };
          }
          if (!depCovers(dep, areaType, sector, ruralJurisdiction)) {
            return { ok: true, selection: null, message: `Matched policy, but ${dep.name} does not cover this area (${p.name})`, reason: { type: 'policy-invalid', policy: p, dep }, actionType };
          }
          if (!depOffersService(dep, service)) {
            return { ok: true, selection: null, message: `Matched policy, but ${dep.name} does not offer the selected service (${p.name})`, reason: { type: 'policy-invalid', policy: p, dep }, actionType };
          }
          return { ok: true, selection: dep, message: `Matched policy: ${p.name}`, reason: { type: 'policy', policy: p, dep }, actionType };
        }

        return { ok: true, selection: null, message: `Matched policy: ${p.name} (${actionType})`, reason: { type: 'policy', policy: p }, actionType };
      }
      return null;
    };

    const byPolicy = pickFromPolicy();
    if (byPolicy) return { ...byPolicy, candidates };

    const mapping = (categoryMappings || []).find(m => normalizeKey(m?.categoryKey || m?.categoryName) === categoryKey);
    if (mapping) {
      const mappedDepId = mapping?.departmentId?._id || mapping?.departmentId;
      const dep = activeDeps.find(d => String(d?._id || '') === String(mappedDepId || ''));
      if (!dep) {
        return { ok: true, selection: null, message: 'Category mapping exists, but the department is missing or inactive', reason: { type: 'mapping-invalid', mapping }, candidates };
      }
      if (!depCovers(dep, areaType, sector, ruralJurisdiction)) {
        return { ok: true, selection: null, message: `Category mapping points to ${dep.name}, but it does not cover this area`, reason: { type: 'mapping-invalid', mapping, dep }, candidates };
      }
      if (!depOffersService(dep, service)) {
        return { ok: true, selection: null, message: `Category mapping points to ${dep.name}, but it does not offer the selected service`, reason: { type: 'mapping-invalid', mapping, dep }, candidates };
      }
      return { ok: true, selection: dep, message: 'Matched category mapping', reason: { type: 'mapping', mapping, dep }, candidates };
    }

    if (candidates.length === 1) {
      return { ok: true, selection: candidates[0], message: 'Single department covers this area', reason: { type: 'coverage', dep: candidates[0] }, candidates };
    }
    if (candidates.length > 1) {
      const sorted = [...candidates].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      return { ok: true, selection: sorted[0], message: 'Multiple departments cover this area; showing first by name', reason: { type: 'coverage-multi', dep: sorted[0] }, candidates: sorted };
    }

    return { ok: true, selection: null, message: 'No active department covers this area/service', reason: { type: 'none' }, candidates: [] };
  }, [routingSim, deps, routingPolicies, categoryMappings, complaints]);

  const routingDiagnostics = React.useMemo(() => {
    const activeDeps = (deps || []).filter(d => d && d.isActive !== false);
    const depById = new Map(activeDeps.map(d => [String(d._id), d]));

    const invalidPolicies = (routingPolicies || []).map(p => {
      if (!p?._id) return null;
      const actionType = String(p?.action?.type || 'route');
      if (actionType !== 'route') return null;
      const depId = p?.action?.departmentId?._id || p?.action?.departmentId;
      const dep = depId ? depById.get(String(depId)) : null;
      const areaType = String(p?.match?.areaType || 'Any');
      const sector = String(p?.match?.sector || '').trim();
      const ruralJurisdiction = String(p?.match?.ruralJurisdiction || '').trim();
      const cat = p?.match?.categoryName || p?.match?.categoryKey || p?.name || 'Policy';

      if (!dep) {
        return { id: p._id, type: 'Missing department', message: `${cat} → missing/inactive department (${p.name})` };
      }
      if (areaType === 'Any') return null;
      if (!depCovers(dep, areaType, sector, ruralJurisdiction)) {
        const areaLabel = areaType === 'Urban' ? (sector || 'All sectors') : (ruralJurisdiction || 'All jurisdictions');
        return { id: p._id, type: 'Outside coverage', message: `${cat} → ${dep.name} does not cover ${areaType}: ${areaLabel} (${p.name})` };
      }
      return null;
    }).filter(Boolean);

    const invalidMappings = (categoryMappings || []).map(m => {
      if (!m?._id) return null;
      const depId = m?.departmentId?._id || m?.departmentId;
      const dep = depId ? depById.get(String(depId)) : null;
      if (!dep) {
        return { id: m._id, type: 'Missing department', message: `${m.categoryName} → missing/inactive department` };
      }
      return null;
    }).filter(Boolean);

    const urbanNames = (urbanSectors || []).map(s => String(s?.name || '').trim()).filter(Boolean);
    const ruralNames = (ruralJurisdictions || []).map(j => String(j?.name || '').trim()).filter(Boolean);

    const urbanGaps = urbanNames
      .filter(name => !activeDeps.some(d => depCovers(d, 'Urban', name, '')))
      .map(name => ({ name }));
    const ruralGaps = ruralNames
      .filter(name => !activeDeps.some(d => depCovers(d, 'Rural', '', name)))
      .map(name => ({ name }));

    const urbanOverlaps = urbanNames
      .map(name => {
        const covering = activeDeps.filter(d => depCovers(d, 'Urban', name, '')).map(d => d.name).sort((a, b) => String(a).localeCompare(String(b)));
        return covering.length > 1 ? { name, departments: covering } : null;
      })
      .filter(Boolean);
    const ruralOverlaps = ruralNames
      .map(name => {
        const covering = activeDeps.filter(d => depCovers(d, 'Rural', '', name)).map(d => d.name).sort((a, b) => String(a).localeCompare(String(b)));
        return covering.length > 1 ? { name, departments: covering } : null;
      })
      .filter(Boolean);

    return {
      urbanGaps,
      ruralGaps,
      urbanOverlaps,
      ruralOverlaps,
      invalidPolicies,
      invalidMappings
    };
  }, [deps, routingPolicies, categoryMappings, urbanSectors, ruralJurisdictions]);

  const validateIslamabadAddress = async (rawAddress, dep) => {
    const address = String(rawAddress || '').trim();
    if (!address) return { ok: false, message: 'Address is required' };

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await resp.json();
    const top = Array.isArray(data) ? data[0] : null;
    const displayName = String(top?.display_name || '').trim();
    const displayLower = displayName.toLowerCase();
    if (!displayName || !displayLower.includes('islamabad')) {
      return { ok: false, message: 'Address must be within Islamabad', displayName: displayName || '' };
    }

    return { ok: true, displayName };
  };

  const feedbackAnalytics = React.useMemo(() => {
    const feedbacks = (complaints || [])
      .map(c => c.feedback)
      .filter(f => f && typeof f.sentiment === 'string' && typeof f.sentimentScore === 'number');

    const total = feedbacks.length;
    const counts = feedbacks.reduce((acc, f) => {
      const k = String(f.sentiment || '').toLowerCase();
      if (k === 'positive' || k === 'negative' || k === 'neutral') acc[k] += 1;
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });

    const avgCompound = total
      ? feedbacks.reduce((sum, f) => sum + (typeof f.sentimentScore === 'number' ? f.sentimentScore : 0), 0) / total
      : 0;

    return {
      total,
      positivePercent: total ? Math.round((counts.positive / total) * 100) : 0,
      negativePercent: total ? Math.round((counts.negative / total) * 100) : 0,
      overallSatisfactionScore: total ? Math.round(((avgCompound + 1) / 2) * 100) : 0
    };
  }, [complaints]);

  const categorySuggestions = React.useMemo(() => {
    const base = [
      'Gas Leak',
      'Gas Supply Issue',
      'Pipeline Damage',
      'Meter Issue',
      'Billing Complaint',
      'Low Gas Pressure'
    ];
    const fromMappings = (categoryMappings || []).map(m => m?.categoryName).filter(Boolean);
    const set = new Set([...base, ...fromMappings].map(s => String(s).trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categoryMappings]);

  useEffect(() => {
    if (routingSim.category) return;
    if (!Array.isArray(categorySuggestions) || categorySuggestions.length === 0) return;
    setRoutingSim(prev => ({ ...prev, category: categorySuggestions[0] || '' }));
  }, [routingSim.category, categorySuggestions]);

  const urbanSectorNames = React.useMemo(() => {
    return (urbanSectors || []).map(s => s?.name).filter(Boolean);
  }, [urbanSectors]);

  const editSectorOptions = React.useMemo(() => {
    const set = new Set(urbanSectorNames);
    const current = Array.isArray(editingDep?.sectors) ? editingDep.sectors : [];
    current.forEach(v => set.add(v));
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [urbanSectorNames, editingDep]);

  useEffect(() => {
    if (coverageNormalizationRan) return;
    if (!Array.isArray(deps) || deps.length === 0) return;
    if (!Array.isArray(urbanSectorNames) || urbanSectorNames.length === 0) return;

    const hasG8InMaster = urbanSectorNames.some(s => String(s).trim().toLowerCase() === 'g-8');
    if (hasG8InMaster) {
      setCoverageNormalizationRan(true);
      return;
    }

    const depWithG8 = deps.find(d => Array.isArray(d?.sectors) && d.sectors.some(s => String(s).trim().toLowerCase() === 'g-8'));
    if (!depWithG8) {
      setCoverageNormalizationRan(true);
      return;
    }

    setCoverageNormalizationRan(true);
    (async () => {
      try {
        const cleanedSectors = (depWithG8.sectors || []).filter(s => String(s).trim().toLowerCase() !== 'g-8');
        await dataService.saUpdateDepartment(depWithG8._id, { sectors: cleanedSectors });
        await refreshDeps();
        showModal(t('success') || 'Success', `Removed deprecated sector G-8 from ${depWithG8.name}`);
      } catch (e) {
        showModal(t('error') || 'Error', e?.message || 'Failed to remove deprecated sector');
      }
    })();
  }, [coverageNormalizationRan, deps, urbanSectorNames]);

  useEffect(() => {
    const j = buildJurisdictionText(newDep.areaTypes, newDep.sectors, newDep.ruralJurisdictions);
    setNewDep(prev => (prev.jurisdiction === j ? prev : { ...prev, jurisdiction: j }));
  }, [newDep.areaTypes, newDep.sectors, newDep.ruralJurisdictions]);

  useEffect(() => {
    setNewDepLocationValidated(false);
    setNewDepLocationValidatedText('');
  }, [newDep.location, newDep.areaTypes, newDep.sectors, newDep.ruralJurisdictions]);

  useEffect(() => {
    if (!editingDep) return;
    const j = buildJurisdictionText(editingDep.areaTypes, editingDep.sectors, editingDep.ruralJurisdictions);
    setEditingDep(prev => (prev && prev.jurisdiction === j ? prev : (prev ? { ...prev, jurisdiction: j } : prev)));
  }, [editingDep?.areaTypes, editingDep?.sectors, editingDep?.ruralJurisdictions]);

  useEffect(() => {
    if (!editingDep) return;
    setEditDepLocationValidated(false);
    setEditDepLocationValidatedText('');
  }, [editingDep?.location, editingDep?.areaTypes, editingDep?.sectors, editingDep?.ruralJurisdictions]);

  useEffect(() => {
    if (activePage === 'overview') {
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        if (!mapInstanceRef.current && mapRef.current && window.L) {
          mapInstanceRef.current = window.L.map(mapRef.current).setView([31.5204, 74.3587], 11);
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);
        }

        if (mapInstanceRef.current) {
          // Clear existing markers
          mapInstanceRef.current.eachLayer((layer) => {
            if (layer instanceof window.L.Circle || layer instanceof window.L.CircleMarker) {
              mapInstanceRef.current.removeLayer(layer);
            }
          });

          // Add complaint markers
          let hasLocations = false;
          const bounds = window.L.latLngBounds();

          complaints.forEach(c => {
            const lat = c.location?.lat || (c.location?.coordinates ? c.location.coordinates[1] : null);
            const lng = c.location?.lng || (c.location?.coordinates ? c.location.coordinates[0] : null);

            if (lat && lng) {
              hasLocations = true;
              bounds.extend([lat, lng]);
              window.L.circle([lat, lng], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.3,
                radius: 800
              }).addTo(mapInstanceRef.current)
              .bindPopup(`<b>${c.category}</b><br>Status: ${c.status}<br>ID: ${c.complaintId}`);
            }
          });

          // If we have locations, fit bounds
          if (hasLocations) {
            mapInstanceRef.current.fitBounds(bounds);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    }
  }, [activePage, complaints]);

  useEffect(() => {
    refreshDeps();
    refreshComplaints();
    loadAnalytics();
    loadHierarchy();
    loadPolicies();
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    const onResize = () => {
      setIsMobile(window.innerWidth <= 576);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadHierarchy = async () => {
    try {
      // Load Urban Sectors
      const urban = await dataService.saListUrbanSectors();
      setUrbanSectors(urban.sectors || []);
      
      // Load Rural Jurisdictions
      const rural = await dataService.saListRuralJurisdictions();
      setRuralJurisdictions(rural.jurisdictions || []);
      
      const policies = await dataService.saListRoutingPolicies();
      setRoutingPolicies(policies.policies || []);

      const mappings = await dataService.saListCategoryMappings();
      setCategoryMappings(mappings.mappings || []);

      const rr = await dataService.saListRerouteRequests();
      setRerouteRequests(rr.requests || []);
    } catch (e) {
      console.error('Hierarchy load error:', e);
    }
  };

  const loadPolicies = async () => {
    try {
      const p = await dataService.saGetPolicies();
      setPolicies(p.policy || {});
    } catch (e) {}
  };

  const refreshDeps = async () => {
    try {
      const res = await dataService.saListDepartments();
      setDeps(res.departments || []);
    } catch (error) {
      console.error('Refresh deps error:', error);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) handleLogout();
    }
  };

  const refreshComplaints = async () => {
    try {
      const res = await dataService.saGetAllComplaints(filters);
      setComplaints(res.complaints || []);
    } catch (error) {
      console.error('Refresh complaints error:', error);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) handleLogout();
    }
  };

  const loadAnalytics = async () => {
    try {
      const t = await dataService.saComplaintTrends('daily');
      setTrends(t.series || []);
      const p = await dataService.saDepartmentPerformance();
      setPerf(p.performance || []);
    } catch (error) {
      console.error('Load analytics error:', error);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) handleLogout();
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    try {
      if (!isCoverageReady(newDep)) {
        throw new Error('Select operational area type and coverage before setting address');
      }
      if (!newDepLocationValidated) {
        throw new Error('Validate the Islamabad address before creating the department');
      }
      const payload = {
        ...newDep,
        servicesOffered: newDep.servicesOffered.split(',').map(s => s.trim()).filter(Boolean),
        sectors: newDep.areaTypes.includes('Urban') ? newDep.sectors : [],
        ruralJurisdictions: newDep.areaTypes.includes('Rural') ? newDep.ruralJurisdictions : []
      };
      await dataService.saCreateDepartment(payload);
      setNewDep({ name: '', location: '', jurisdiction: '', servicesOffered: '', areaTypes: ['Urban'], sectors: [], ruralJurisdictions: [] });
      setNewDepLocationValidated(false);
      setNewDepLocationValidatedText('');
      refreshDeps();
      showModal(t('success') || 'Success', t('departmentCreatedSuccessfully') || 'Department created successfully');
    } catch (error) {
      console.error('Create department error:', error);
      showModal(t('error') || 'Error', error.message);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) handleLogout();
    }
  };

  const createUrbanSector = async (e) => {
    e.preventDefault();
    try {
      if (!newSector.name.trim()) return;
      await dataService.saCreateUrbanSector(newSector);
      setNewSector({ name: '' });
      loadHierarchy();
      showModal(t('success') || 'Success', 'Sector created successfully');
    } catch (error) {
      showModal(t('error') || 'Error', error.message);
    }
  };

  const createRuralJurisdiction = async (e) => {
    e.preventDefault();
    try {
      if (!newJurisdiction.name.trim()) return;
      await dataService.saCreateRuralJurisdiction(newJurisdiction);
      setNewJurisdiction({ name: '' });
      loadHierarchy();
      showModal(t('success') || 'Success', 'Jurisdiction created successfully');
    } catch (error) {
      showModal(t('error') || 'Error', error.message);
    }
  };

  const updateUrbanSector = async (id, oldName) => {
    const newName = prompt(t('enterNewSectorName') || 'Enter new sector name:', oldName);
    if (newName && newName !== oldName) {
      try {
        await dataService.saUpdateUrbanSector(id, { name: newName });
        loadHierarchy();
        showModal(t('success') || 'Success', 'Sector updated successfully');
      } catch (error) {
        showModal(t('error') || 'Error', error.message);
      }
    }
  };

  const deleteUrbanSector = async (id) => {
    if (window.confirm(t('confirmDelete') || 'Are you sure you want to delete this sector?')) {
      try {
        await dataService.saDeleteUrbanSector(id);
        loadHierarchy();
        showModal(t('success') || 'Success', 'Sector deleted successfully');
      } catch (error) {
        showModal(t('error') || 'Error', error.message);
      }
    }
  };

  const updateRuralJurisdiction = async (id, oldName) => {
    const newName = prompt(t('enterNewJurisdictionName') || 'Enter new jurisdiction name:', oldName);
    if (newName && newName !== oldName) {
      try {
        await dataService.saUpdateRuralJurisdiction(id, { name: newName });
        loadHierarchy();
        showModal(t('success') || 'Success', 'Jurisdiction updated successfully');
      } catch (error) {
        showModal(t('error') || 'Error', error.message);
      }
    }
  };

  const deleteRuralJurisdiction = async (id) => {
    if (window.confirm(t('confirmDelete') || 'Are you sure you want to delete this jurisdiction?')) {
      try {
        await dataService.saDeleteRuralJurisdiction(id);
        loadHierarchy();
        showModal(t('success') || 'Success', 'Jurisdiction deleted successfully');
      } catch (error) {
        showModal(t('error') || 'Error', error.message);
      }
    }
  };

  const startEditDepartment = (dep) => {
    setEditingDep({
      ...dep,
      areaTypes: dep.areaTypes || [],
      sectors: dep.sectors || [],
      ruralJurisdictions: dep.ruralJurisdictions || [],
      servicesOffered: (dep.servicesOffered || []).join(', ')
    });
    setEditModalOpen(true);
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    try {
      if (!isCoverageReady(editingDep)) {
        throw new Error('Select operational area type and coverage before setting address');
      }
      if (!editDepLocationValidated) {
        throw new Error('Validate the Islamabad address before saving changes');
      }
      const payload = {
        name: editingDep.name,
        location: editingDep.location,
        jurisdiction: editingDep.jurisdiction,
        areaTypes: editingDep.areaTypes,
        sectors: editingDep.areaTypes.includes('Urban') ? editingDep.sectors : [],
        ruralJurisdictions: editingDep.areaTypes.includes('Rural') ? editingDep.ruralJurisdictions : [],
        servicesOffered: editingDep.servicesOffered.split(',').map(s => s.trim()).filter(Boolean)
      };
      await dataService.saUpdateDepartment(editingDep._id, payload);
      setEditModalOpen(false);
      setEditingDep(null);
      setEditDepLocationValidated(false);
      setEditDepLocationValidatedText('');
      refreshDeps();
      showModal(t('success') || 'Success', 'Department updated successfully');
    } catch (error) {
      showModal(t('error') || 'Error', error.message);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setSaCreateError('');
    setSaCreateStatus('');
    setCreating(true);
    try {
      const nameOk = /^[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF\u0600-\u06FF\s'.-]+$/.test((newUser.fullName || '').trim());
      if (!nameOk) {
        throw new Error(t('invalidName') || 'Invalid name');
      }
      if (!newUser.password || newUser.password.length < 6) {
        throw new Error(t('passwordTooShort') || 'Password must be at least 6 characters');
      }
      if (!newUser.departmentId) {
        throw new Error(t('departmentRequired') || 'Department is required');
      }
      const payload = {
        role: 'dept-admin',
        fullName: newUser.fullName,
        email: newUser.email,
        password: newUser.password,
        departmentId: newUser.departmentId,
        areaType: newUser.areaType,
        sector: newUser.sector,
        ruralJurisdiction: newUser.ruralJurisdiction
      };
      await dataService.saCreateUser(payload);
      setNewUser({ role: 'dept-admin', fullName: '', email: '', password: '', departmentId: '', areaType: 'Urban' });
      setSaCreateStatus(t('deptAdminCreated') || 'Department Admin created successfully');
      loadUsers();
    } catch (err) {
      setSaCreateError(err?.message || t('failedToCreateAdmin') || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const blockUser = async (role, id, block) => {
    try {
      await dataService.saBlockUser(role, id, block);
      loadUsers();
    } catch (error) {
      console.error('Block user error:', error);
      showModal(t('error') || 'Error', error.message);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) {
        handleLogout();
      }
    }
  };

  const resetPassword = async (role, id) => {
    const newPassword = prompt(t('setNewPassword'));
    if (!newPassword) return;
    try {
      await dataService.saResetPassword(role, id, newPassword);
      showModal(t('success') || 'Success', t('resetPasswordSuccess'));
    } catch (error) {
      console.error('Reset password error:', error);
      showModal(t('error') || 'Error', error.message);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/role-selection');
  };

  const toggleSidebar = () => {
    if (isMobile) setMenuOpen(!menuOpen);
    else setSidebarCollapsed(!sidebarCollapsed);
  };

  const searchLocationOnMap = async () => {
    const q = (mapSearchQuery || '').trim();
    if (!q || !mapInstanceRef.current) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const item = list[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        mapInstanceRef.current.setView([lat, lon], 12);
        window.L.marker([lat, lon]).addTo(mapInstanceRef.current).bindPopup(item.display_name);
      }
    } catch {}
  };

  const filteredDepartments = deps.filter(dep => {
    const q = (departmentSearch || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (dep.name || '').toLowerCase().includes(q) ||
      (dep.location || '').toLowerCase().includes(q) ||
      (dep.jurisdiction || '').toLowerCase().includes(q) ||
      Array.isArray(dep.categories) && dep.categories.some(c => (c || '').toLowerCase().includes(q))
    );
  });

  const filteredRoutingPolicies = routingPolicies.filter(p => {
    const q = (routingSearch || '').toLowerCase().trim();
    if (!q) return true;
    const depName = p.action?.departmentId?.name || p.action?.departmentId || '';
    return (
      (p.name || '').toLowerCase().includes(q) ||
      String(p.match?.categoryName || p.match?.categoryKey || '').toLowerCase().includes(q) ||
      String(p.priority || '').toLowerCase().includes(q) ||
      depName.toLowerCase().includes(q)
    );
  });

  const complaintsFiltered = complaints.filter(c => {
    const q = (complaintSearch || '').toLowerCase().trim();
    if (q) {
      const idStr = String(c.complaintId || c._id || '').toLowerCase();
      const cat = String(c.category || '').toLowerCase();
      const dept = String(c.department || '').toLowerCase();
      if (!(idStr.includes(q) || cat.includes(q) || dept.includes(q))) return false;
    }
    if (complaintsFilterMode === 'urban') {
      if (c.location?.areaType !== 'Urban') return false;
      if (filterUrbanSector) return c.location?.sector === filterUrbanSector;
      return true;
    }
    if (complaintsFilterMode === 'rural') {
      if (c.location?.areaType !== 'Rural') return false;
      if (filterRuralJurisdiction) return c.location?.ruralJurisdiction === filterRuralJurisdiction;
      return true;
    }
    if (complaintsFilterMode === 'department' && filterDepartmentId) {
      return String(c.department) === String(filterDepartmentId) || String(c.departmentId) === String(filterDepartmentId);
    }
    return true;
  });

  const groupComplaints = (mode) => {
    const map = new Map();
    complaints.forEach(c => {
      let key = 'unknown';
      let label = 'Unknown';
      if (mode === 'urban') {
        if (c.location?.areaType !== 'Urban') return;
        key = c.location?.sector || 'Unknown Sector';
        label = key;
      } else if (mode === 'rural') {
        if (c.location?.areaType !== 'Rural') return;
        key = c.location?.ruralJurisdiction || 'Unknown Jurisdiction';
        label = key;
      } else if (mode === 'department') {
        key = String(c.department || c.departmentId);
        label = c.department || deps.find(d => String(d._id) === String(c.departmentId))?.name || 'Unknown Department';
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key).items.push(c);
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, label: v.label, items: v.items }));
  };

  const loadUsers = async () => {
    try {
      const admins = await dataService.saListUsers('dept-admin');
      const officers = await dataService.saListUsers('field-officer');
      const citizens = await dataService.saListUsers('citizen');
      setUsers({ admins: admins.users || [], officers: officers.users || [], citizens: citizens.users || [] });
    } catch (error) {
      console.error('Load users error:', error);
      if (error.message === 'Token is not valid' || error.message.includes('authorization denied')) {
        handleLogout();
      }
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const reopenComplaint = async (id) => {
    try {
      await dataService.saReopenComplaint(id);
      refreshComplaints();
    } catch (error) {
      console.error('Reopen complaint error:', error);
      showModal(t('error') || 'Error', error.message);
    }
  };


  return (
    <div className="dashboard-container">
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobile && menuOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <div className="header-top">
            <div className="app-branding">
              <h2>Awaz e Shehr</h2>
              <p>Super Admin</p>
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
            { id: 'overview', icon: 'fa-tachometer-alt', labelKey: 'overview' },
            { id: 'hierarchy', icon: 'fa-sitemap', labelKey: 'hierarchy' },
            { id: 'departments', icon: 'fa-building', labelKey: 'departments' },
            { id: 'routing', icon: 'fa-random', labelKey: 'routing' },
            { id: 'policies', icon: 'fa-sliders-h', labelKey: 'policies' },
            { id: 'admin', icon: 'fa-user-shield', labelKey: 'adminRegistration' },
            { id: 'complaints', icon: 'fa-clipboard-list', labelKey: 'complaints' },
            { id: 'analytics', icon: 'fa-chart-bar', labelKey: 'analytics' },
            { id: 'users', icon: 'fa-users', labelKey: 'users' }
          ].map(item => (
            <div
              key={item.id}
              className={`menu-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={t(item.labelKey)}
              data-label={t(item.labelKey)}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{t(item.labelKey)}</span>
            </div>
          ))}
          <div className="menu-item" onClick={handleLogout} title={t('logout')} data-label={t('logout')}>
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

      

      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="header">
          <div className="user-info">
            <div className="user-avatar">{user?.fullName?.split(' ').map(n => n[0]).join('') || 'SA'}</div>
            <div>
              <h3>{user?.fullName || t('superAdmin')}</h3>
              <p>
                {t('systemAdministration')}
                <span className="role-badge super-admin">Super Admin</span>
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline btn-sm me-3" onClick={toggleLanguage}>
              {language === 'english' ? 'اردو' : 'English'}
            </button>
            <div className="status-indicator">
              <div className="status-dot online"></div>
              <span>{t('online')}</span>
            </div>
          </div>
        </div>



        {activePage === 'overview' && (
          <div className="page-content active">
            <h1 className="form-title">{t('superAdminOverview')}</h1>
            <div className="map-search">
              <div className="input-with-icon">
                <i className="fas fa-search input-icon"></i>
                <input className="sa-input map-search-input" placeholder={t('searchLocation') || 'Search location on map'} value={mapSearchQuery} onChange={e => setMapSearchQuery(e.target.value)} />
              </div>
              <button className="btn btn-info map-search-btn" onClick={searchLocationOnMap}>{t('search') || 'Search'}</button>
            </div>
            <div className="dashboard-cards">
              {[
                { value: complaints.length, title: t('totalComplaints'), icon: 'fa-clipboard-list', type: 'total' },
                { value: complaints.filter(c => c.status === 'pending').length, title: t('pending'), icon: 'fa-clock', type: 'pending' },
                { value: complaints.filter(c => c.status === 'in-progress').length, title: t('inProgress'), icon: 'fa-spinner', type: 'progress' },
                { value: complaints.filter(c => c.status === 'resolved').length, title: t('resolved'), icon: 'fa-check-circle', type: 'resolved' },
                { value: deps.length, title: t('departments'), icon: 'fa-building', type: 'departments' },
                { value: `${feedbackAnalytics.positivePercent}%`, title: t('positiveFeedback') || 'Positive Feedback', icon: 'fa-smile', type: 'positive' },
                { value: `${feedbackAnalytics.negativePercent}%`, title: t('negativeFeedback') || 'Negative Feedback', icon: 'fa-frown', type: 'negative' },
                { value: `${feedbackAnalytics.overallSatisfactionScore}%`, title: t('overallSatisfaction') || 'Overall Satisfaction', icon: 'fa-chart-line', type: 'satisfaction' }
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
            <div className="sa-grid" style={{ marginBottom: '20px' }}>
              <div className="sa-panel">
                <h4 className="section-subtitle">{t('complaintDistribution')}</h4>
                <p style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>
                  {t('mapDescription') || "Red areas indicate high complaint volume"}
                </p>
                <div className="map-wrapper" style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                  <div ref={mapRef} style={{ width: '100%', height: '500px', zIndex: 1 }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'departments' && (
          <section className="sa-section">
            <div className="section-header">
              <h3 className="form-title">{t('departments') || 'Departments'}</h3>
            </div>
            <div className="sa-grid">
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-building"></i>{t('createDepartment') || 'Create Department'}</div>
                </div>
                <form className="sa-form" onSubmit={createDepartment}>
                  <div className="form-field">
                    <div className="form-label">{t('fullName')}</div>
                    <input className="sa-input" placeholder={t('fullName')} value={newDep.name} onChange={e => setNewDep({ ...newDep, name: e.target.value })} required />
                  </div>
                  
                  <div className="form-field">
                    <div className="form-label">{t('operationalAreaTypes') || 'Operational Area Types'}</div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '5px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={newDep.areaTypes.includes('Urban')} 
                          onChange={e => {
                            const newTypes = e.target.checked 
                              ? [...newDep.areaTypes, 'Urban'] 
                              : newDep.areaTypes.filter(t => t !== 'Urban');
                            setNewDep({ ...newDep, areaTypes: newTypes });
                          }} 
                        />
                        Urban
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={newDep.areaTypes.includes('Rural')} 
                          onChange={e => {
                            const newTypes = e.target.checked 
                              ? [...newDep.areaTypes, 'Rural'] 
                              : newDep.areaTypes.filter(t => t !== 'Rural');
                            setNewDep({ ...newDep, areaTypes: newTypes });
                          }} 
                        />
                        Rural
                      </label>
                    </div>
                  </div>

                  {newDep.areaTypes.includes('Urban') && (
                    <div className="form-field">
                      <div className="form-label">{t('sectors') || 'Sectors'} (Select Multiple)</div>
                      <select 
                        multiple 
                        className="sa-select" 
                        style={{ height: '120px' }}
                        value={newDep.sectors} 
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setNewDep({ ...newDep, sectors: selected });
                        }}
                      >
                        {editSectorOptions.map(name => (
                          <option key={name} value={name}>
                            {urbanSectorNames.includes(name) ? name : `${name} (Deprecated)`}
                          </option>
                        ))}
                      </select>
                      <div className="form-helper">Hold Ctrl/Cmd to select multiple</div>
                    </div>
                  )}

                  {newDep.areaTypes.includes('Rural') && (
                    <div className="form-field">
                      <div className="form-label">{t('ruralJurisdictions') || 'Rural Jurisdictions'} (Select Multiple)</div>
                      <select 
                        multiple 
                        className="sa-select" 
                        style={{ height: '120px' }}
                        value={newDep.ruralJurisdictions} 
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setNewDep({ ...newDep, ruralJurisdictions: selected });
                        }}
                      >
                        {ruralJurisdictions.map(j => (
                          <option key={j._id} value={j.name}>{j.name}</option>
                        ))}
                      </select>
                      <div className="form-helper">Hold Ctrl/Cmd to select multiple</div>
                    </div>
                  )}

                  <div className="form-field">
                    <div className="form-label">{t('services') || 'Services (Sub-categories)'}</div>
                    <input className="sa-input" placeholder="e.g. Water Supply, Pipeline Repair" value={newDep.servicesOffered} onChange={e => setNewDep({ ...newDep, servicesOffered: e.target.value })} />
                    <div className="form-helper">{t('servicesHelper') || 'Comma-separated list'}</div>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('location') || 'Physical Address (Islamabad)'}</div>
                    <input
                      className="sa-input"
                      placeholder={t('location') || 'Physical Address (Islamabad)'}
                      value={newDep.location}
                      onChange={e => setNewDep({ ...newDep, location: e.target.value })}
                      disabled={!isCoverageReady(newDep)}
                      required={isCoverageReady(newDep)}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={!isCoverageReady(newDep) || newDepLocationValidating}
                        onClick={async () => {
                          try {
                            setNewDepLocationValidating(true);
                            const result = await validateIslamabadAddress(newDep.location, newDep);
                            if (!result.ok) {
                              setNewDepLocationValidated(false);
                              setNewDepLocationValidatedText('');
                              showModal(t('error') || 'Error', result.message);
                              return;
                            }
                            setNewDepLocationValidated(true);
                            setNewDepLocationValidatedText(result.displayName || '');
                            showModal(t('success') || 'Success', 'Address validated for Islamabad');
                          } catch (err) {
                            setNewDepLocationValidated(false);
                            setNewDepLocationValidatedText('');
                            showModal(t('error') || 'Error', err?.message || 'Failed to validate address');
                          } finally {
                            setNewDepLocationValidating(false);
                          }
                        }}
                      >
                        {newDepLocationValidating ? (t('validating') || 'Validating...') : (t('validate') || 'Validate')}
                      </button>
                      <div style={{ fontSize: '0.85rem', color: newDepLocationValidated ? '#1b7f3a' : '#666', alignSelf: 'center' }}>
                        {newDepLocationValidated ? (newDepLocationValidatedText || 'Validated') : (isCoverageReady(newDep) ? 'Not validated' : 'Select operational coverage first')}
                      </div>
                    </div>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('jurisdiction') || 'Jurisdiction (Auto)'}</div>
                    <input
                      className="sa-input"
                      placeholder={t('jurisdiction') || 'Jurisdiction'}
                      value={newDep.jurisdiction}
                      readOnly
                      disabled={!isCoverageReady(newDep)}
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={!isCoverageReady(newDep) || !newDepLocationValidated}>
                    {t('addDepartment')}
                  </button>
                </form>
              </div>
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-building"></i>{t('departments') || 'Departments'}</div>
                  <div className="panel-actions">
                    <div className="input-with-icon inline-search">
                      <i className="fas fa-search input-icon"></i>
                      <input className="sa-input" placeholder={t('search') || 'Search'} value={departmentSearch} onChange={e => setDepartmentSearch(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="sa-list">
                  {filteredDepartments.length === 0 && (
                    <div className="list-empty">{t('noData') || 'No data'}</div>
                  )}
                  {filteredDepartments.map(dep => (
                    <div key={dep._id} className="sa-list-item">
                      <div className="sa-item-header">
                        <strong>{dep.name}</strong>
                        <button className="btn btn-outline btn-sm" onClick={() => startEditDepartment(dep)}>{t('edit') || 'Edit'}</button>
                      </div>
                      <div className="sa-item-details">
                        <div>{t('location')}: {dep.location}</div>
                        <div>{t('jurisdiction')}: {dep.jurisdiction}</div>
                        <div>Area Types: {(dep.areaTypes||[]).join(', ')}</div>
                        {(dep.areaTypes||[]).includes('Urban') && <div>Sectors: {(dep.sectors||[]).join(', ')}</div>}
                        {(dep.areaTypes||[]).includes('Rural') && <div>Rural Areas: {(dep.ruralJurisdictions||[]).join(', ')}</div>}
                        <div>{t('services')}: {(dep.servicesOffered||[]).join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'hierarchy' && (
          <section className="sa-section">
            <div className="section-header">
              <h3 className="form-title">{t('hierarchy') || 'Hierarchy'} (Islamabad)</h3>
              <div className="segmented">
                <div className={`seg-item ${hierarchyTab === 'urban' ? 'active' : ''}`} onClick={() => setHierarchyTab('urban')}>{t('urbanSectors') || 'Urban Sectors'}</div>
                <div className={`seg-item ${hierarchyTab === 'rural' ? 'active' : ''}`} onClick={() => setHierarchyTab('rural')}>{t('ruralJurisdictions') || 'Rural Jurisdictions'}</div>
              </div>
            </div>
            
            {hierarchyTab === 'urban' && (
              <div className="sa-grid">
                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title"><i className="fas fa-city"></i>{t('createSector') || 'Create Urban Sector'}</div>
                  </div>
                  <form className="sa-form" onSubmit={createUrbanSector}>
                    <div className="form-field">
                      <div className="form-label">{t('sectorName') || 'Sector Name (e.g. F-7)'}</div>
                      <input className="sa-input" placeholder="F-7" value={newSector.name} onChange={e => setNewSector({ ...newSector, name: e.target.value })} required />
                    </div>
                    <button className="btn btn-primary" type="submit">{t('add')}</button>
                  </form>
                </div>
                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title"><i className="fas fa-list"></i>{t('existingSectors') || 'Existing Sectors'}</div>
                  </div>
                  <div className="sa-list">
                    {urbanSectors.length === 0 && <div className="list-empty">{t('noData')}</div>}
                    {urbanSectors.map(s => (
                      <div key={s._id} className="sa-list-item">
                        <div className="sa-item-header"><strong>{s.name}</strong></div>
                        <div className="sa-item-actions">
                           <button className="btn btn-outline" onClick={() => updateUrbanSector(s._id, s.name)}>{t('edit') || 'Edit'}</button>
                           <button className="btn btn-outline" onClick={async ()=>{ await dataService.saDeleteUrbanSector(s._id); loadHierarchy(); }}>{t('delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hierarchyTab === 'rural' && (
              <div className="sa-grid">
                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title"><i className="fas fa-tree"></i>{t('createJurisdiction') || 'Create Rural Jurisdiction'}</div>
                  </div>
                  <form className="sa-form" onSubmit={createRuralJurisdiction}>
                    <div className="form-field">
                      <div className="form-label">{t('jurisdictionName') || 'Jurisdiction Name'}</div>
                      <input className="sa-input" placeholder="Bhara Kahu" value={newJurisdiction.name} onChange={e => setNewJurisdiction({ ...newJurisdiction, name: e.target.value })} required />
                    </div>
                    <button className="btn btn-primary" type="submit">{t('add')}</button>
                  </form>
                </div>
                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title"><i className="fas fa-list"></i>{t('existingJurisdictions') || 'Existing Jurisdictions'}</div>
                  </div>
                  <div className="sa-list">
                    {ruralJurisdictions.length === 0 && <div className="list-empty">{t('noData')}</div>}
                    {ruralJurisdictions.map(j => (
                      <div key={j._id} className="sa-list-item">
                        <div className="sa-item-header"><strong>{j.name}</strong></div>
                        <div className="sa-item-actions">
                           <button className="btn btn-outline" onClick={() => updateRuralJurisdiction(j._id, j.name)}>{t('edit') || 'Edit'}</button>
                           <button className="btn btn-outline" onClick={() => deleteRuralJurisdiction(j._id)}>{t('delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activePage === 'routing' && (
          <section className="sa-section routing-page">
            <div className="section-header">
              <h3 className="form-title">{t('routingPolicies') || 'Routing Policies'}</h3>
            </div>
            <div className="sa-grid">
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-random"></i>{t('createPolicy') || 'Create Policy'}</div>
                </div>
                <form
                  className="sa-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const categoryName = String(newPolicy.category || '').trim();
                    if (!categoryName) return;

                    const keywords = String(newPolicy.keywords || '')
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean);

                    const startMinutes = parseTimeToMinutes(newPolicy.startTime);
                    const endMinutes = parseTimeToMinutes(newPolicy.endTime);
                    const days = Array.isArray(newPolicy.daysOfWeek) ? newPolicy.daysOfWeek : [];

                    const timeWindow = (days.length > 0 || startMinutes != null || endMinutes != null)
                      ? {
                          daysOfWeek: days.map(n => Number(n)).filter(n => Number.isFinite(n)),
                          startMinutes,
                          endMinutes
                        }
                      : undefined;

                    const maxOpen = String(newPolicy.maxOpenComplaints || '').trim();
                    const maxOpenComplaints = maxOpen === '' ? null : Number(maxOpen);

                    const payload = {
                      name: String(newPolicy.name || '').trim() || `Policy: ${categoryName}`,
                      priority: Number(newPolicy.priority) || 100,
                      match: {
                        categoryName,
                        areaType: String(newPolicy.areaType || 'Any'),
                        sector: String(newPolicy.sector || '').trim(),
                        ruralJurisdiction: String(newPolicy.ruralJurisdiction || '').trim()
                      },
                      conditions: {
                        allowedPriorities: Array.isArray(newPolicy.allowedPriorities) ? newPolicy.allowedPriorities : [],
                        keywords,
                        maxOpenComplaints: Number.isFinite(maxOpenComplaints) ? maxOpenComplaints : null,
                        timeWindow
                      },
                      action: {
                        type: String(newPolicy.actionType || 'route'),
                        departmentId: String(newPolicy.actionType || 'route') === 'route' ? (newPolicy.departmentId || null) : null,
                        note: String(newPolicy.note || '').trim()
                      }
                    };

                    await dataService.saCreateRoutingPolicy(payload);
                    setNewPolicy({
                      name: '',
                      category: categorySuggestions[0] || '',
                      areaType: 'Any',
                      sector: '',
                      ruralJurisdiction: '',
                      priority: 100,
                      allowedPriorities: [],
                      keywords: '',
                      maxOpenComplaints: '',
                      daysOfWeek: [],
                      startTime: '',
                      endTime: '',
                      actionType: 'route',
                      departmentId: '',
                      note: ''
                    });
                    loadHierarchy();
                  }}
                >
                  <div className="form-field">
                    <div className="form-label">{t('category') || 'Category'}</div>
                    <input className="sa-input" list="sa-category-suggestions" value={newPolicy.category} onChange={e => setNewPolicy(prev => ({ ...prev, category: e.target.value }))} placeholder={t('category') || 'Category'} />
                    <datalist id="sa-category-suggestions">
                      {categorySuggestions.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('policyName') || 'Policy Name'}</div>
                    <input className="sa-input" value={newPolicy.name} onChange={e => setNewPolicy(prev => ({ ...prev, name: e.target.value }))} placeholder="Routing Policy" />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('areaType') || 'Area Type'}</div>
                    <select className="sa-select" value={newPolicy.areaType} onChange={e => setNewPolicy(prev => ({ ...prev, areaType: e.target.value, sector: '', ruralJurisdiction: '' }))}>
                      <option value="Any">{t('any') || 'Any'}</option>
                      <option value="Urban">Urban</option>
                      <option value="Rural">Rural</option>
                    </select>
                  </div>
                  
                  {newPolicy.areaType === 'Urban' && (
                    <div className="form-field">
                      <div className="form-label">{t('sector') || 'Sector'}</div>
                      <select className="sa-select" value={newPolicy.sector} onChange={e => setNewPolicy(prev => ({ ...prev, sector: e.target.value }))}>
                        <option value="">{t('all') || 'All'}</option>
                        {urbanSectors.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  )}

                  {newPolicy.areaType === 'Rural' && (
                    <div className="form-field">
                      <div className="form-label">{t('ruralJurisdiction') || 'Rural Jurisdiction'}</div>
                      <select className="sa-select" value={newPolicy.ruralJurisdiction} onChange={e => setNewPolicy(prev => ({ ...prev, ruralJurisdiction: e.target.value }))}>
                        <option value="">{t('all') || 'All'}</option>
                        {ruralJurisdictions.map(j => <option key={j._id} value={j.name}>{j.name}</option>)}
                      </select>
                    </div>
                  )}
                  
                  <div className="form-field">
                    <div className="form-label">{t('action') || 'Action'}</div>
                    <select className="sa-select" value={newPolicy.actionType} onChange={e => setNewPolicy(prev => ({ ...prev, actionType: e.target.value, departmentId: '' }))}>
                      <option value="route">{t('route') || 'Route to Department'}</option>
                      <option value="require-approval">{t('requireApproval') || 'Require Approval'}</option>
                      <option value="flag-for-review">{t('flagForReview') || 'Flag for Review'}</option>
                    </select>
                  </div>
                  {newPolicy.actionType === 'route' && (
                    <div className="form-field">
                      <div className="form-label">{t('department') || 'Department'}</div>
                      <select className="sa-select" value={newPolicy.departmentId || ''} onChange={e => setNewPolicy(prev => ({ ...prev, departmentId: e.target.value }))}>
                        <option value="">{t('department') || 'Department'}</option>
                        {deps.map(dep => <option key={dep._id} value={dep._id}>{dep.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-field">
                    <div className="form-label">{t('policyPriority') || 'Policy Priority (lower wins)'}</div>
                    <input className="sa-input" type="number" min="1" value={newPolicy.priority} onChange={e => setNewPolicy(prev => ({ ...prev, priority: Number(e.target.value) }))} />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('complaintPriority') || 'Complaint Priority'}</div>
                    <select
                      className="sa-select"
                      value={(newPolicy.allowedPriorities || [])[0] || ''}
                      onChange={e => setNewPolicy(prev => ({ ...prev, allowedPriorities: e.target.value ? [e.target.value] : [] }))}
                    >
                      <option value="">{t('any') || 'Any'}</option>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="critical">critical</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('keywords') || 'Keywords (comma-separated)'}</div>
                    <input className="sa-input" value={newPolicy.keywords} onChange={e => setNewPolicy(prev => ({ ...prev, keywords: e.target.value }))} placeholder="water, leak, burst" />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('backlogThreshold') || 'Backlog Threshold (max open)'}</div>
                    <input className="sa-input" type="number" min="0" value={newPolicy.maxOpenComplaints} onChange={e => setNewPolicy(prev => ({ ...prev, maxOpenComplaints: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('timeWindow') || 'Time Window'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        className="sa-select"
                        multiple
                        value={newPolicy.daysOfWeek}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions).map(o => o.value);
                          setNewPolicy(prev => ({ ...prev, daysOfWeek: values }));
                        }}
                      >
                        <option value="0">Sun</option>
                        <option value="1">Mon</option>
                        <option value="2">Tue</option>
                        <option value="3">Wed</option>
                        <option value="4">Thu</option>
                        <option value="5">Fri</option>
                        <option value="6">Sat</option>
                      </select>
                      <input className="sa-input" type="time" value={newPolicy.startTime} onChange={e => setNewPolicy(prev => ({ ...prev, startTime: e.target.value }))} />
                      <input className="sa-input" type="time" value={newPolicy.endTime} onChange={e => setNewPolicy(prev => ({ ...prev, endTime: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('note') || 'Note'}</div>
                    <input className="sa-input" value={newPolicy.note} onChange={e => setNewPolicy(prev => ({ ...prev, note: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" type="submit">{t('add')}</button>
                </form>
              </div>
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-link"></i>{t('categoryDepartmentMapping') || 'Category → Department Mapping'}</div>
                </div>
                <form className="sa-form" onSubmit={async (e) => {
                  e.preventDefault();
                  await dataService.saUpsertCategoryMapping(newMapping);
                  setNewMapping({ categoryName: '', departmentId: '' });
                  loadHierarchy();
                }}>
                  <div className="form-field">
                    <div className="form-label">{t('category') || 'Category'}</div>
                    <input className="sa-input" value={newMapping.categoryName} onChange={e => setNewMapping({ ...newMapping, categoryName: e.target.value })} placeholder={t('category') || 'Category'} required />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('department') || 'Department'}</div>
                    <select className="sa-select" value={newMapping.departmentId} onChange={e => setNewMapping({ ...newMapping, departmentId: e.target.value })} required>
                      <option value="">{t('department') || 'Department'}</option>
                      {deps.map(dep => <option key={dep._id} value={dep._id}>{dep.name}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-primary" type="submit">{t('save') || 'Save'}</button>
                </form>
                <div className="sa-list" style={{ marginTop: 12 }}>
                  {categoryMappings.length === 0 && <div className="list-empty">{t('noData') || 'No data'}</div>}
                  {categoryMappings.map(m => (
                    <div key={m._id} className="sa-list-item">
                      <div className="sa-item-header">
                        <div className="sa-item-title">{m.categoryName} → {m.departmentId?.name || m.departmentId}</div>
                      </div>
                      <div className="sa-item-actions">
                        <button className="btn btn-outline" onClick={async () => { await dataService.saDeleteCategoryMapping(m._id); loadHierarchy(); }}>{t('delete') || 'Delete'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-flask"></i>{t('simulation') || 'Simulation'}</div>
                </div>
                <div className="sa-form" style={{ gap: 12 }}>
                  <div className="form-field">
                    <div className="form-label">{t('category') || 'Category'}</div>
                    <input
                      className="sa-input"
                      list="sa-category-suggestions"
                      value={routingSim.category}
                      onChange={e => setRoutingSim(prev => ({ ...prev, category: e.target.value }))}
                      placeholder={t('category') || 'Category'}
                    />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('areaType') || 'Area Type'}</div>
                    <select
                      className="sa-select"
                      value={routingSim.areaType}
                      onChange={e => setRoutingSim(prev => ({ ...prev, areaType: e.target.value, sector: '', ruralJurisdiction: '' }))}
                    >
                      <option value="Urban">Urban</option>
                      <option value="Rural">Rural</option>
                    </select>
                  </div>
                  {routingSim.areaType === 'Urban' ? (
                    <div className="form-field">
                      <div className="form-label">{t('sector') || 'Sector'}</div>
                      <select
                        className="sa-select"
                        value={routingSim.sector}
                        onChange={e => setRoutingSim(prev => ({ ...prev, sector: e.target.value }))}
                      >
                        <option value="">{t('all') || 'All'}</option>
                        {urbanSectors.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="form-field">
                      <div className="form-label">{t('ruralJurisdiction') || 'Rural Jurisdiction'}</div>
                      <select
                        className="sa-select"
                        value={routingSim.ruralJurisdiction}
                        onChange={e => setRoutingSim(prev => ({ ...prev, ruralJurisdiction: e.target.value }))}
                      >
                        <option value="">{t('all') || 'All'}</option>
                        {ruralJurisdictions.map(j => <option key={j._id} value={j.name}>{j.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-field">
                    <div className="form-label">{t('service') || 'Service'}</div>
                    <select
                      className="sa-select"
                      value={routingSim.service}
                      onChange={e => setRoutingSim(prev => ({ ...prev, service: e.target.value }))}
                    >
                      <option value="">{t('optional') || 'Optional'}</option>
                      {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('complaintPriority') || 'Complaint Priority'}</div>
                    <select className="sa-select" value={routingSim.priority} onChange={e => setRoutingSim(prev => ({ ...prev, priority: e.target.value }))}>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="critical">critical</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('text') || 'Text'}</div>
                    <input className="sa-input" value={routingSim.text} onChange={e => setRoutingSim(prev => ({ ...prev, text: e.target.value }))} placeholder={t('optional') || 'Optional'} />
                  </div>
                </div>
                <div className="sa-list" style={{ marginTop: 12 }}>
                  <div className="sa-list-item">
                    <div className="sa-item-header">
                      <div className="sa-item-title">{t('result') || 'Result'}</div>
                      <div className="sa-code-badge">{(routingSimulation?.candidates || []).length} {t('candidates') || 'Candidates'}</div>
                    </div>
                    <div className="sa-item-details">
                      <div><strong>{t('department') || 'Department'}:</strong> {routingSimulation?.selection?.name || (t('noData') || 'No data')}</div>
                      <div><strong>{t('reason') || 'Reason'}:</strong> {routingSimulation?.message || ''}</div>
                    </div>
                  </div>
                  {Array.isArray(routingSimulation?.candidates) && routingSimulation.candidates.length > 0 && (
                    <div className="sa-list-item">
                      <div className="sa-item-header">
                        <div className="sa-item-title">{t('candidates') || 'Candidates'}</div>
                      </div>
                      <div className="sa-item-details">
                        {routingSimulation.candidates.slice(0, 8).map(d => (
                          <div key={d._id}>{d.name}</div>
                        ))}
                        {routingSimulation.candidates.length > 8 && (
                          <div>+{routingSimulation.candidates.length - 8} {t('more') || 'more'}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-shield-alt"></i>{t('diagnostics') || 'Diagnostics'}</div>
                </div>
                <div className="sa-list">
                  <div className="sa-list-item">
                    <div className="sa-item-header">
                      <div className="sa-item-title">{t('coverageGaps') || 'Coverage Gaps'}</div>
                      <div className="sa-code-badge">
                        {(routingDiagnostics?.urbanGaps || []).length + (routingDiagnostics?.ruralGaps || []).length}
                      </div>
                    </div>
                    <div className="sa-item-details">
                      <div><strong>Urban:</strong> {(routingDiagnostics?.urbanGaps || []).length}</div>
                      <div><strong>Rural:</strong> {(routingDiagnostics?.ruralGaps || []).length}</div>
                      {(routingDiagnostics?.urbanGaps || []).slice(0, 4).map(g => <div key={`ug-${g.name}`}>Urban: {g.name}</div>)}
                      {(routingDiagnostics?.ruralGaps || []).slice(0, 4).map(g => <div key={`rg-${g.name}`}>Rural: {g.name}</div>)}
                    </div>
                  </div>

                  <div className="sa-list-item">
                    <div className="sa-item-header">
                      <div className="sa-item-title">{t('invalidPolicies') || 'Invalid Policies'}</div>
                      <div className="sa-code-badge">{(routingDiagnostics?.invalidPolicies || []).length}</div>
                    </div>
                    <div className="sa-item-details">
                      {(routingDiagnostics?.invalidPolicies || []).length === 0 && <div>{t('noIssues') || 'No issues found'}</div>}
                      {(routingDiagnostics?.invalidPolicies || []).slice(0, 6).map(x => <div key={x.id}>{x.message}</div>)}
                      {(routingDiagnostics?.invalidPolicies || []).length > 6 && <div>+{routingDiagnostics.invalidPolicies.length - 6} {t('more') || 'more'}</div>}
                    </div>
                  </div>

                  <div className="sa-list-item">
                    <div className="sa-item-header">
                      <div className="sa-item-title">{t('invalidMappings') || 'Invalid Mappings'}</div>
                      <div className="sa-code-badge">{(routingDiagnostics?.invalidMappings || []).length}</div>
                    </div>
                    <div className="sa-item-details">
                      {(routingDiagnostics?.invalidMappings || []).length === 0 && <div>{t('noIssues') || 'No issues found'}</div>}
                      {(routingDiagnostics?.invalidMappings || []).slice(0, 6).map(x => <div key={x.id}>{x.message}</div>)}
                      {(routingDiagnostics?.invalidMappings || []).length > 6 && <div>+{routingDiagnostics.invalidMappings.length - 6} {t('more') || 'more'}</div>}
                    </div>
                  </div>

                  <div className="sa-list-item">
                    <div className="sa-item-header">
                      <div className="sa-item-title">{t('coverageOverlaps') || 'Coverage Overlaps'}</div>
                      <div className="sa-code-badge">
                        {(routingDiagnostics?.urbanOverlaps || []).length + (routingDiagnostics?.ruralOverlaps || []).length}
                      </div>
                    </div>
                    <div className="sa-item-details">
                      {(routingDiagnostics?.urbanOverlaps || []).slice(0, 3).map(x => (
                        <div key={`uo-${x.name}`}>Urban {x.name}: {x.departments.join(', ')}</div>
                      ))}
                      {(routingDiagnostics?.ruralOverlaps || []).slice(0, 3).map(x => (
                        <div key={`ro-${x.name}`}>Rural {x.name}: {x.departments.join(', ')}</div>
                      ))}
                      {((routingDiagnostics?.urbanOverlaps || []).length + (routingDiagnostics?.ruralOverlaps || []).length) === 0 && (
                        <div>{t('noIssues') || 'No issues found'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-random"></i>{t('policies') || 'Policies'}</div>
                  <div className="panel-actions">
                    <div className="input-with-icon inline-search">
                      <i className="fas fa-search input-icon"></i>
                      <input className="sa-input" placeholder={t('search') || 'Search'} value={routingSearch} onChange={e => setRoutingSearch(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="sa-list">
                  {filteredRoutingPolicies.length === 0 && (
                    <div className="list-empty">{t('noData') || 'No data'}</div>
                  )}
                  {filteredRoutingPolicies.map(p => {
                    const area = String(p?.match?.areaType || 'Any');
                    const areaLabel = area === 'Urban'
                      ? (p?.match?.sector ? `Urban: ${p.match.sector}` : 'Urban: All')
                      : area === 'Rural'
                          ? (p?.match?.ruralJurisdiction ? `Rural: ${p.match.ruralJurisdiction}` : 'Rural: All')
                          : 'Any';
                    const actionType = String(p?.action?.type || 'route');
                    const depName = p?.action?.departmentId?.name || p?.action?.departmentId || '';
                    return (
                      <div key={p._id} className="sa-list-item">
                        <div className="sa-item-header">
                          <div className="sa-item-title">
                            {p.name || 'Policy'} • {p.match?.categoryName || p.match?.categoryKey || ''} • {areaLabel}
                          </div>
                          <div>#{p.priority}</div>
                        </div>
                        <div className="sa-item-details">
                          <div><strong>{t('action') || 'Action'}:</strong> {actionType}{actionType === 'route' && depName ? ` → ${depName}` : ''}</div>
                          {(p?.conditions?.allowedPriorities || []).length > 0 && <div><strong>{t('complaintPriority') || 'Complaint Priority'}:</strong> {p.conditions.allowedPriorities.join(', ')}</div>}
                          {(p?.conditions?.keywords || []).length > 0 && <div><strong>{t('keywords') || 'Keywords'}:</strong> {p.conditions.keywords.join(', ')}</div>}
                          {typeof p?.conditions?.maxOpenComplaints === 'number' && <div><strong>{t('backlogThreshold') || 'Backlog Threshold'}:</strong> {p.conditions.maxOpenComplaints}</div>}
                        </div>
                        <div className="sa-item-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-outline"
                            onClick={async () => { await dataService.saUpdateRoutingPolicy(p._id, { enabled: !(p.enabled !== false) }); loadHierarchy(); }}
                          >
                            {(p.enabled !== false) ? (t('disable') || 'Disable') : (t('enable') || 'Enable')}
                          </button>
                          <button className="btn btn-outline" onClick={async () => { await dataService.saDeleteRoutingPolicy(p._id); loadHierarchy(); }}>{t('delete') || 'Delete'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-exchange-alt"></i>{t('rerouteRequests') || 'Reroute Requests'}</div>
                  <div className="panel-actions">
                    <button className="btn btn-outline btn-neutral" onClick={async ()=>{ const rr = await dataService.saListRerouteRequests(); setRerouteRequests(rr.requests || []); }}>{t('refresh') || 'Refresh'}</button>
                  </div>
                </div>
                <div className="sa-list">
                  {rerouteRequests.length === 0 && <div className="list-empty">{t('noData') || 'No data'}</div>}
                  {rerouteRequests.map(c => {
                    const id = c._id || c.id;
                    const selectedDep = rerouteApproveTarget[id] ?? (c.rerouteRequest?.proposedDepartmentId?._id || '');
                    return (
                      <div key={id} className="sa-list-item">
                        <div className="sa-item-header">
                          <div className="sa-item-title">{c.complaintId} → {(c.departmentId?.name || c.department || '')}</div>
                          <div className="sa-subtitle">{c.rerouteRequest?.requestedBy?.fullName || ''}{c.rerouteRequest?.reason ? ` • ${c.rerouteRequest.reason}` : ''}</div>
                        </div>
                        <div className="sa-item-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select
                            className="sa-select"
                            value={selectedDep}
                            onChange={(e)=>setRerouteApproveTarget(prev => ({ ...(prev || {}), [id]: e.target.value }))}
                          >
                            <option value="">{t('department') || 'Department'}</option>
                            {deps.map(dep => <option key={dep._id} value={dep._id}>{dep.name}</option>)}
                          </select>
                          <button
                            className="btn btn-primary"
                            onClick={async ()=>{ await dataService.saApproveRerouteRequest(id, selectedDep); const rr = await dataService.saListRerouteRequests(); setRerouteRequests(rr.requests || []); refreshComplaints(); }}
                            disabled={!selectedDep}
                          >
                            {t('approve') || 'Approve'}
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={async ()=>{ const r = prompt(t('reasonOptional') || 'Reason (optional)') || ''; await dataService.saRejectRerouteRequest(id, r); const rr = await dataService.saListRerouteRequests(); setRerouteRequests(rr.requests || []); }}
                          >
                            {t('reject') || 'Reject'}
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={async ()=>{ const r = prompt(t('reason') || 'Reason') || ''; await dataService.saMarkInvalidComplaint(id, r); const rr = await dataService.saListRerouteRequests(); setRerouteRequests(rr.requests || []); refreshComplaints(); }}
                          >
                            {t('markInvalid') || 'Mark Invalid'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'policies' && (
          <section className="sa-section">
            <div className="section-header">
              <h3 className="form-title">{t('policies') || 'Policies'}</h3>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await dataService.saUpdatePolicies(policies);
                showModal(t('success') || 'Success', t('saved') || 'Saved');
              }}
            >
              <div className="sa-grid">
                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title">
                      <i className="fas fa-stopwatch"></i>
                      {t('slaPolicies') || 'Service Level Targets'}
                    </div>
                  </div>
                  <p className="sa-subtitle">
                    Define target resolution time (in hours) for each complaint category. These
                    SLAs shape how you measure department performance and escalation.
                  </p>
                  <div className="sa-data-list-container">
                    <table className="sa-table sa-table-compact sa-table-striped">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Target Resolution (hours)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['water', 'electricity', 'sanitation', 'roads', 'waste', 'other'].map(cat => (
                          <tr key={cat}>
                            <td>{cat.charAt(0).toUpperCase() + cat.slice(1)}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="sa-input"
                                style={{ maxWidth: '140px' }}
                                value={
                                  (policies?.slaHoursByCategory && policies.slaHoursByCategory[cat]) ||
                                  ''
                                }
                                onChange={e => {
                                  const value = Number(e.target.value);
                                  setPolicies(prev => ({
                                    ...(prev || {}),
                                    slaHoursByCategory: {
                                      ...(prev?.slaHoursByCategory || {}),
                                      [cat]: value
                                    }
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title">
                      <i className="fas fa-bell"></i>
                      {t('reminderEscalation') || 'Reminders & Escalation'}
                    </div>
                  </div>
                  <p className="sa-subtitle">
                    Control when the system sends reminders for pending complaints and when they
                    should be escalated to higher authorities.
                  </p>
                  <div className="sa-form">
                    <div className="form-field">
                      <div className="form-label">
                        {t('reminderHoursPending') || 'Reminder for pending complaints (hours)'}
                      </div>
                      <input
                        className="sa-input"
                        type="number"
                        min="1"
                        value={policies?.reminderHoursPending ?? 24}
                        onChange={e =>
                          setPolicies({
                            ...(policies || {}),
                            reminderHoursPending: Number(e.target.value)
                          })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <div className="form-label">
                        {t('escalateAfterHours') || 'Escalate unresolved complaints after (hours)'}
                      </div>
                      <input
                        className="sa-input"
                        type="number"
                        min="1"
                        value={policies?.escalateAfterHours ?? 96}
                        onChange={e =>
                          setPolicies({
                            ...(policies || {}),
                            escalateAfterHours: Number(e.target.value)
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="sa-panel premium">
                  <div className="panel-header">
                    <div className="sa-list-title">
                      <i className="fas fa-map-marked-alt"></i>
                      {t('geoPolicies') || 'Location & Geo-fencing'}
                    </div>
                  </div>
                  <p className="sa-subtitle">
                    Configure how much GPS error is tolerated when citizens pin a location.
                  </p>
                  <div className="sa-form">
                    <div className="form-field">
                      <div className="form-label">
                        {t('gpsTolerance') || 'GPS Tolerance (m)'}
                      </div>
                      <input
                        className="sa-input"
                        type="number"
                        min="1"
                        value={policies?.gpsToleranceMeters ?? 50}
                        onChange={e =>
                          setPolicies({
                            ...(policies || {}),
                            gpsToleranceMeters: Number(e.target.value)
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button className="btn btn-primary" type="submit">
                  {t('save') || 'Save'}
                </button>
              </div>
            </form>
          </section>
        )}

        {activePage === 'admin' && (
          <section className="sa-section">
            <div className="section-header">
              <h3 className="form-title">{t('adminRegistration') || 'Admin Registration'}</h3>
            </div>
            <div className="sa-grid">
              <div className="sa-panel premium">
                <div className="panel-header">
                  <div className="sa-list-title"><i className="fas fa-user-shield"></i>{t('registerDeptAdmin') || 'Register Dept Admin'}</div>
                </div>
                <form className="sa-form" onSubmit={createUser}>
                  <div className="form-field">
                    <div className="form-label">{t('fullName')}</div>
                    <input className="sa-input" placeholder={t('fullName')} value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} required />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('email')}</div>
                    <input className="sa-input" placeholder={t('email')} type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('passwordPlaceholder')}</div>
                    <input className="sa-input" placeholder={t('passwordPlaceholder')} type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                  </div>
                  {/* District selection removed, auto-selected Islamabad via logic */}
                  
                  <div className="form-field">
                    <div className="form-label">{t('areaType') || 'Area Type'}</div>
                    <select className="sa-select" value={newUser.areaType || 'Urban'} onChange={e => setNewUser({ ...newUser, areaType: e.target.value, sector: '', ruralJurisdiction: '' })}>
                       <option value="Urban">Urban</option>
                       <option value="Rural">Rural</option>
                    </select>
                  </div>

                  {newUser.areaType === 'Urban' && (
                    <div className="form-field">
                      <div className="form-label">{t('sector') || 'Sector'}</div>
                      <select className="sa-select" value={newUser.sector || ''} onChange={e => setNewUser({ ...newUser, sector: e.target.value })}>
                        <option value="">Select Sector</option>
                        {urbanSectors.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  )}

                  {newUser.areaType === 'Rural' && (
                    <div className="form-field">
                      <div className="form-label">{t('ruralJurisdiction') || 'Rural Jurisdiction'}</div>
                      <select className="sa-select" value={newUser.ruralJurisdiction || ''} onChange={e => setNewUser({ ...newUser, ruralJurisdiction: e.target.value })}>
                        <option value="">Select Jurisdiction</option>
                        {ruralJurisdictions.map(j => <option key={j._id} value={j.name}>{j.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="form-field">
                    <div className="form-label">{t('departmentLocation') || 'Department Location'}</div>
                    <select className="sa-select" value={newUser.departmentId || ''} onChange={e => setNewUser({ ...newUser, departmentId: e.target.value })}>
                      <option value="">{t('departmentLocation') || 'Department Location'}</option>
                      {deps.filter(dep => {
                        // Area Type Check
                        if (dep.areaTypes && dep.areaTypes.length > 0) {
                           if (!dep.areaTypes.includes(newUser.areaType)) return false;
                        } else if (dep.areaType && dep.areaType !== newUser.areaType) {
                           return false; 
                        }

                        // Sector Check
                        if (newUser.areaType === 'Urban' && newUser.sector) {
                           if (dep.sectors && dep.sectors.length > 0 && !dep.sectors.includes(newUser.sector)) return false;
                        }

                        // Rural Jurisdiction Check
                        if (newUser.areaType === 'Rural' && newUser.ruralJurisdiction) {
                           if (dep.ruralJurisdictions && dep.ruralJurisdictions.length > 0 && !dep.ruralJurisdictions.includes(newUser.ruralJurisdiction)) return false;
                        }
                        
                        return true;
                      }).map(dep => (
                        <option key={dep._id} value={dep._id}>{dep.name} {dep.areaType ? `(${dep.areaType})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  {newUser.departmentId && (
                    <div className="form-field">
                      <div className="form-label">{t('locationAddress') || 'Location Address'}</div>
                      <div className="sa-input readonly" style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                        {deps.find(d => d._id === newUser.departmentId)?.location || 'N/A'}
                      </div>
                    </div>
                  )}
                  <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? t('loading') : (t('registerDeptAdmin') || 'Register Dept Admin')}</button>
                </form>
                {saCreateError && <div className="sa-status danger">{saCreateError}</div>}
                {saCreateStatus && <div className="sa-status success">{saCreateStatus}</div>}
              </div>
            </div>
          </section>
        )}

        {activePage === 'complaints' && (
          <section className="sa-section">
            <div className="section-header">
              <h3 className="form-title">{t('complaints') || 'Complaints'}</h3>
              <div className="panel-actions">
                <div className="input-with-icon inline-search">
                  <i className="fas fa-search input-icon"></i>
                  <input className="sa-input" placeholder={t('search') || 'Search'} value={complaintSearch} onChange={e => setComplaintSearch(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="sa-panel premium">
              <div className="panel-header">
                <div className="segmented">
                  <div className={`seg-item ${complaintsFilterMode === 'urban' ? 'active' : ''}`} onClick={() => setComplaintsFilterMode('urban')}>{t('urban') || 'Urban'}</div>
                  <div className={`seg-item ${complaintsFilterMode === 'rural' ? 'active' : ''}`} onClick={() => setComplaintsFilterMode('rural')}>{t('rural') || 'Rural'}</div>
                  <div className={`seg-item ${complaintsFilterMode === 'department' ? 'active' : ''}`} onClick={() => setComplaintsFilterMode('department')}>{t('departments') || 'Departments'}</div>
                </div>
                <div className="panel-actions">
                  {complaintsFilterMode === 'urban' && (
                    <select className="sa-select" value={filterUrbanSector} onChange={e => setFilterUrbanSector(e.target.value)}>
                      <option value="">{t('allSectors') || 'All Sectors'}</option>
                      {urbanSectors.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                    </select>
                  )}
                  {complaintsFilterMode === 'rural' && (
                    <select className="sa-select" value={filterRuralJurisdiction} onChange={e => setFilterRuralJurisdiction(e.target.value)}>
                      <option value="">{t('allJurisdictions') || 'All Jurisdictions'}</option>
                      {ruralJurisdictions.map(j => <option key={j._id} value={j.name}>{j.name}</option>)}
                    </select>
                  )}
                  {complaintsFilterMode === 'department' && (
                    <select className="sa-select" value={filterDepartmentId} onChange={e => setFilterDepartmentId(e.target.value)}>
                      <option value="">{t('selectDepartment') || 'Select Department'}</option>
                      {deps.map(dep => <option key={dep._id} value={dep._id}>{dep.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {(complaintsFilterMode === 'urban' && filterUrbanSector) ||
               (complaintsFilterMode === 'rural' && filterRuralJurisdiction) ||
               (complaintsFilterMode === 'department' && filterDepartmentId) ? (
                <div className="sa-list">
                  {complaintsFiltered.length === 0 && (
                    <div className="list-empty">{t('noData') || 'No data'}</div>
                  )}
                  {complaintsFiltered.map(c => (
                    <div key={c._id} className="sa-list-item">
                      <div className="sa-item-header">
                        <div className="sa-item-title">[{c.department}] #{c.complaintId} - {c.category}</div>
                        <span className={`status-badge status-${(c.status || '').replace(/\s+/g, '-')}`}>{c.status}</span>
                      </div>
                      {c.status === 'resolved' && (
                        <div className="sa-item-actions">
                          <button className="btn btn-warning" onClick={() => reopenComplaint(c._id)}>{t('reopen')}</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sa-grid">
                  {groupComplaints(complaintsFilterMode).map(group => (
                    <div key={group.key} className="sa-panel premium">
                      <div className="panel-header">
                        <div className="sa-list-title">{group.label}</div>
                        <div className="sa-code-badge">{group.items.length} {t('complaints') || 'Complaints'}</div>
                      </div>
                      <div className="sa-list">
                        {group.items.slice(0, 5).map(c => (
                          <div key={c._id} className="sa-list-item">
                            <div className="sa-item-header">
                              <div className="sa-item-title">[{c.department}] #{c.complaintId} - {c.category}</div>
                              <span className={`status-badge status-${(c.status || '').replace(/\s+/g, '-')}`}>{c.status}</span>
                            </div>
                            {c.status === 'resolved' && (
                              <div className="sa-item-actions">
                                <button className="btn btn-outline" onClick={() => reopenComplaint(c._id)}>{t('reopen')}</button>
                              </div>
                            )}
                          </div>
                        ))}
                        {group.items.length > 5 && (
                          <div className="list-empty">{t('andMore') || '… more complaints in this group'}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activePage === 'analytics' && (
          <section className="sa-section">
            <h3 className="form-title">{t('analytics')}</h3>
            <div className="sa-grid">
              <div className="sa-panel">
                <h4 className="section-subtitle">{t('complaintTrends')}</h4>
                <div className="sa-data-list-container">
                  <table className="sa-table sa-table-compact sa-table-striped">
                    <thead>
                      <tr>
                        <th>{t('date')}</th>
                        <th>{t('count')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.map(t => (
                        <tr key={t._id}>
                          <td>{t._id}</td>
                          <td>{t.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#1890ff" name={t('complaints')} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="sa-panel">
                <h4 className="section-subtitle">{t('departmentPerformance')}</h4>
                <div className="sa-data-list-container">
                  <table className="sa-table sa-table-compact sa-table-striped">
                    <thead>
                      <tr>
                        <th>{t('department')}</th>
                        <th>{t('total')}</th>
                        <th>{t('resolved')}</th>
                        <th>{t('rate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perf.map(p => (
                        <tr key={p.department}>
                          <td>{p.department}</td>
                          <td>{p.total}</td>
                          <td>{p.resolved}</td>
                          <td>{isNaN(p.resolveRate) ? 0 : (p.resolveRate*100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perf}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#1890ff" name={t('totalComplaints')} />
                      <Bar dataKey="resolved" fill="#52c41a" name={t('resolved')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'users' && (
          <section className="sa-section">
            <h3 className="form-title">{t('users')}</h3>
            <div className="sa-grid">
              <div className="sa-panel">
                <h4 className="section-subtitle">{t('departmentAdmins')}</h4>
                <ul className="sa-list">
                  {users.admins.map(u => (
                    <li key={u._id} className="sa-list-item">
                      <div className="sa-item-header">
                        <div className="sa-item-title">{u.fullName} ({u.email}) [{u.department}]</div>
                        <span className={`status-badge ${u.isBlocked ? 'status-pending' : 'status-resolved'}`}>{u.isBlocked ? 'BLOCKED' : 'ACTIVE'}</span>
                      </div>
                      <div className="sa-item-actions">
                        <button className="btn btn-outline" onClick={() => blockUser('dept-admin', u._id, !u.isBlocked)}>{u.isBlocked ? t('unblock') : t('block')}</button>
                        <button className="btn btn-info" onClick={() => resetPassword('dept-admin', u._id)}>{t('resetPassword')}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="sa-panel">
                <h4 className="section-subtitle">{t('fieldOfficers')}</h4>
                <ul className="sa-list">
                  {users.officers.map(u => (
                    <li key={u._id} className="sa-list-item">
                      <div className="sa-item-header">
                        <div className="sa-item-title">{u.fullName} ({u.email}) [{u.department}]</div>
                        <span className={`status-badge ${u.isBlocked ? 'status-pending' : 'status-resolved'}`}>{u.isBlocked ? 'BLOCKED' : 'ACTIVE'}</span>
                      </div>
                      <div className="sa-item-actions">
                        <button className="btn btn-outline" onClick={() => blockUser('field-officer', u._id, !u.isBlocked)}>{u.isBlocked ? t('unblock') : t('block')}</button>
                        <button className="btn btn-info" onClick={() => resetPassword('field-officer', u._id)}>{t('resetPassword')}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="sa-panel">
                <h4 className="section-subtitle">{t('citizens')}</h4>
                <ul className="sa-list">
                  {users.citizens.map(u => (
                    <li key={u._id} className="sa-list-item">
                      <div className="sa-item-header">
                        <div className="sa-item-title">{u.fullName} ({u.email})</div>
                        <span className={`status-badge ${u.isBlocked ? 'status-pending' : 'status-resolved'}`}>{u.isBlocked ? 'BLOCKED' : 'ACTIVE'}</span>
                      </div>
                      <div className="sa-item-actions">
                        <button className="btn btn-outline" onClick={() => blockUser('citizen', u._id, !u.isBlocked)}>{u.isBlocked ? t('unblock') : t('block')}</button>
                        <button className="btn btn-info" onClick={() => resetPassword('citizen', u._id)}>{t('resetPassword')}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
        {modalOpen && (
          <div className="sa-modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sa-modal-header">{modalTitle}</div>
              <div className="sa-modal-body">{modalMessage}</div>
              <div className="sa-modal-actions">
                <button className="btn btn-primary" onClick={() => setModalOpen(false)}>{t('ok') || 'OK'}</button>
              </div>
            </div>
          </div>
        )}

        {editModalOpen && editingDep && (
          <div className="sa-modal-backdrop" onClick={() => setEditModalOpen(false)}>
            <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sa-modal-header">{t('editDepartment') || 'Edit Department'}</div>
              <div className="sa-modal-body">
                <form className="sa-form" onSubmit={handleUpdateDepartment}>
                  <div className="form-field">
                    <div className="form-label">{t('fullName')}</div>
                    <input className="sa-input" value={editingDep.name} onChange={e => setEditingDep({ ...editingDep, name: e.target.value })} required />
                  </div>
                  
                  <div className="form-field">
                    <div className="form-label">{t('operationalAreaTypes') || 'Operational Area Types'}</div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '5px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={editingDep.areaTypes.includes('Urban')} 
                          onChange={e => {
                            const newTypes = e.target.checked 
                              ? [...editingDep.areaTypes, 'Urban'] 
                              : editingDep.areaTypes.filter(t => t !== 'Urban');
                            setEditingDep({ ...editingDep, areaTypes: newTypes });
                          }} 
                        />
                        Urban
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={editingDep.areaTypes.includes('Rural')} 
                          onChange={e => {
                            const newTypes = e.target.checked 
                              ? [...editingDep.areaTypes, 'Rural'] 
                              : editingDep.areaTypes.filter(t => t !== 'Rural');
                            setEditingDep({ ...editingDep, areaTypes: newTypes });
                          }} 
                        />
                        Rural
                      </label>
                    </div>
                  </div>

                  {editingDep.areaTypes.includes('Urban') && (
                    <div className="form-field">
                      <div className="form-label">{t('sectors') || 'Sectors'} (Select Multiple)</div>
                      <select 
                        multiple 
                        className="sa-select" 
                        style={{ height: '120px' }}
                        value={editingDep.sectors} 
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setEditingDep({ ...editingDep, sectors: selected });
                        }}
                      >
                        {urbanSectors.map(s => (
                          <option key={s._id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <div className="form-helper">Hold Ctrl/Cmd to select multiple</div>
                    </div>
                  )}

                  {editingDep.areaTypes.includes('Rural') && (
                    <div className="form-field">
                      <div className="form-label">{t('ruralJurisdictions') || 'Rural Jurisdictions'} (Select Multiple)</div>
                      <select 
                        multiple 
                        className="sa-select" 
                        style={{ height: '120px' }}
                        value={editingDep.ruralJurisdictions} 
                        onChange={e => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setEditingDep({ ...editingDep, ruralJurisdictions: selected });
                        }}
                      >
                        {ruralJurisdictions.map(j => (
                          <option key={j._id} value={j.name}>{j.name}</option>
                        ))}
                      </select>
                      <div className="form-helper">Hold Ctrl/Cmd to select multiple</div>
                    </div>
                  )}

                  <div className="form-field">
                    <div className="form-label">{t('services') || 'Services (Sub-categories)'}</div>
                    <input className="sa-input" value={editingDep.servicesOffered} onChange={e => setEditingDep({ ...editingDep, servicesOffered: e.target.value })} />
                    <div className="form-helper">{t('servicesHelper') || 'Comma-separated list'}</div>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('location') || 'Physical Address (Islamabad)'}</div>
                    <input
                      className="sa-input"
                      value={editingDep.location}
                      onChange={e => setEditingDep({ ...editingDep, location: e.target.value })}
                      disabled={!isCoverageReady(editingDep)}
                      required={isCoverageReady(editingDep)}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={!isCoverageReady(editingDep) || editDepLocationValidating}
                        onClick={async () => {
                          try {
                            setEditDepLocationValidating(true);
                            const result = await validateIslamabadAddress(editingDep.location, editingDep);
                            if (!result.ok) {
                              setEditDepLocationValidated(false);
                              setEditDepLocationValidatedText('');
                              showModal(t('error') || 'Error', result.message);
                              return;
                            }
                            setEditDepLocationValidated(true);
                            setEditDepLocationValidatedText(result.displayName || '');
                            showModal(t('success') || 'Success', 'Address validated for Islamabad');
                          } catch (err) {
                            setEditDepLocationValidated(false);
                            setEditDepLocationValidatedText('');
                            showModal(t('error') || 'Error', err?.message || 'Failed to validate address');
                          } finally {
                            setEditDepLocationValidating(false);
                          }
                        }}
                      >
                        {editDepLocationValidating ? (t('validating') || 'Validating...') : (t('validate') || 'Validate')}
                      </button>
                      <div style={{ fontSize: '0.85rem', color: editDepLocationValidated ? '#1b7f3a' : '#666', alignSelf: 'center' }}>
                        {editDepLocationValidated ? (editDepLocationValidatedText || 'Validated') : (isCoverageReady(editingDep) ? 'Not validated' : 'Select operational coverage first')}
                      </div>
                    </div>
                  </div>
                  <div className="form-field">
                    <div className="form-label">{t('jurisdiction') || 'Jurisdiction (Auto)'}</div>
                    <input
                      className="sa-input"
                      value={editingDep.jurisdiction}
                      readOnly
                      disabled={!isCoverageReady(editingDep)}
                    />
                  </div>
                  
                  <div className="sa-modal-actions">
                    <button className="btn btn-outline" type="button" onClick={() => setEditModalOpen(false)}>{t('cancel') || 'Cancel'}</button>
                    <button className="btn btn-primary" type="submit" disabled={!isCoverageReady(editingDep) || !editDepLocationValidated}>
                      {t('save') || 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
