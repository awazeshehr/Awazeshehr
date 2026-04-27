import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './RoleSelection.css';
import dataService from '../services/dataService';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const particlesContainerRef = useRef(null);
  
  const [selectedRole, setSelectedRole] = useState("citizen");
  const [activeTab, setActiveTab] = useState("login");
  const [showOtp, setShowOtp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetStage, setResetStage] = useState('email');
  const [isLoading, setIsLoading] = useState(true);
  const [authAnimation, setAuthAnimation] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [urbanSectors, setUrbanSectors] = useState([]);
  const [ruralJurisdictions, setRuralJurisdictions] = useState([]);
  const [regErrors, setRegErrors] = useState({});
  const [regTouched, setRegTouched] = useState({});
  const [passwordScore, setPasswordScore] = useState(0);
  const [emailAvailability, setEmailAvailability] = useState(null);
  const [formData, setFormData] = useState({
    login: { identifier: '', password: '' },
    register: { 
      fullName: '', 
      email: '', 
      phone: '', 
      cnic: '', 
      password: '', 
      confirmPassword: '',
      areaType: 'Urban',
      sector: '',
      ruralJurisdiction: ''
    },
    otp: { email: '', otp: ['', '', '', '', '', ''] },
    reset: { email: '', otp: ['', '', '', '', '', ''], newPassword: '', confirmPassword: '' }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setAuthAnimation('slide-in');
    }
  }, [isLoading]);

  useEffect(() => {
    const fetchAreas = async () => {
      let attempts = 0;
      while (attempts < 3) {
        try {
          const sData = await dataService.apiCall('/auth/urban-sectors');
          if (sData?.success) setUrbanSectors(sData.sectors || []);
          const rData = await dataService.apiCall('/auth/rural-jurisdictions');
          if (rData?.success) setRuralJurisdictions(rData.jurisdictions || []);
          return;
        } catch (e) {
          attempts += 1;
          if (attempts >= 3) {
            alert(t ? t('serviceUnavailable') || 'Service temporarily unavailable. Please try again.' : 'Service temporarily unavailable. Please try again.');
          } else {
            await new Promise(res => setTimeout(res, 1200));
          }
        }
      }
    };
    fetchAreas();
  }, [t]);

  // Particle System
  useEffect(() => {
    const canvas = particlesContainerRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let particles = [];
    const particleCount = 80; // Reduced for subtle effect
    
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.color = `rgba(100, 200, 255, ${Math.random() * 0.4 + 0.1})`;
      }
      
      update() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const init = () => {
      particles = [];
      for(let i=0; i<particleCount; i++) {
        particles.push(new Particle());
      }
    };
    
    init();
    
    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw connections
      particles.forEach((p1, i) => {
        p1.update();
        p1.draw();
        
        for(let j=i+1; j<particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 120) {
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.1 * (1 - dist/120)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      init();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowOtp(false);
    setShowForgot(false);
  };

  const validateEmailLocal = (v) => {
    if (!v) return { valid: false, message: 'Email is required' };
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return ok ? { valid: true } : { valid: false, message: 'Invalid email format' };
  };
  const validatePasswordLocal = (v) => {
    if (!v) return { valid: false, message: 'Password is required' };
    const ok = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/.test(v);
    return ok ? { valid: true } : { valid: false, message: 'fulfill requirements of password' };
  };
  const validateNameLocal = (v) => {
    if (!v || v.length < 2) return { valid: false, message: 'Full name must be at least 2 characters long' };
    if (!/^[a-zA-Z\s]+$/.test(v)) return { valid: false, message: 'Name can only contain letters and spaces' };
    return { valid: true };
  };
  const validatePhoneLocal = (v) => {
    if (!v) return { valid: false, message: 'Phone number is required' };
    const clean = v.replace(/[\s\-\(\)]/g, '');
    const ok = /^(\+92|92|0)?3[0-9]{9}$/.test(clean);
    return ok ? { valid: true } : { valid: false, message: 'Please enter a valid Pakistani mobile number (e.g., 03XXXXXXXXX)' };
  };
  const validateCnicLocal = (v) => {
    if (!v) return { valid: false, message: 'CNIC is required' };
    const clean = v.replace(/[\s\-]/g, '');
    if (!/^[0-9]{13}$/.test(clean)) return { valid: false, message: 'CNIC must be exactly 13 digits without dashes' };
    if (clean[0] === '0') return { valid: false, message: 'CNIC cannot start with 0' };
    return { valid: true };
  };
  const computePasswordScore = (v) => {
    let s = 0;
    if (v && v.length >= 6) s++;
    if (/[A-Z]/.test(v || '')) s++;
    if (/[a-z]/.test(v || '')) s++;
    if (/\d/.test(v || '')) s++;
    if (/[^a-zA-Z0-9]/.test(v || '')) s++;
    return Math.min(s, 4);
  };

  const handleInputChange = (formType, field, value) => {
    let processedValue = value;
    
    // Format input based on field type
    if (field === 'phone') {
      // Remove non-digits except + at the beginning
      processedValue = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
      // Limit to reasonable length
      if (processedValue.length > 13) processedValue = processedValue.slice(0, 13);
    } else if (field === 'cnic') {
      // Only allow digits
      processedValue = value.replace(/\D/g, '');
      // Limit to 13 digits
      if (processedValue.length > 13) processedValue = processedValue.slice(0, 13);
    } else if (field === 'fullName') {
      // Allow letters and spaces only
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        [field]: processedValue
      }
    }));

    if (formType === 'register') {
      setRegTouched(prev => ({ ...prev, [field]: true }));
      let res = null;
      if (field === 'email') res = validateEmailLocal(processedValue);
      if (field === 'password') res = validatePasswordLocal(processedValue);
      if (field === 'fullName') res = validateNameLocal(processedValue);
      if (field === 'phone') res = validatePhoneLocal(processedValue);
      if (field === 'cnic') res = validateCnicLocal(processedValue);
      if (field === 'confirmPassword') {
        res = processedValue && processedValue === (formData.register.password || '') ? { valid: true } : { valid: false, message: 'Passwords do not match' };
      }
      if (field === 'password') setPasswordScore(computePasswordScore(processedValue));
      if (res) setRegErrors(prev => ({ ...prev, [field]: res.valid ? null : res.message }));
      if (field === 'email') {
        const email = processedValue;
        if (validateEmailLocal(email).valid) {
          setTimeout(async () => {
            try {
              const j = await dataService.apiCall(`/auth/check-availability?email=${encodeURIComponent(email)}`);
              const available = j?.data?.emailAvailable;
              setEmailAvailability(available === true ? 'available' : 'taken');
            } catch {
              setEmailAvailability(null);
            }
          }, 450);
        } else {
          setEmailAvailability(null);
        }
      }
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return; // Only allow numbers
    
    const newOtp = [...formData.otp.otp];
    newOtp[index] = value;
    
    setFormData(prev => ({
      ...prev,
      otp: {
        ...prev.otp,
        otp: newOtp
      }
    }));

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleResetOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...formData.reset.otp];
    newOtp[index] = value;
    setFormData(prev => ({
      ...prev,
      reset: { ...prev.reset, otp: newOtp }
    }));
    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const startForgotPassword = () => {
    if (selectedRole !== 'citizen') {
      alert('Password reset is available for citizens only');
      return;
    }
    setShowForgot(true);
    setResetStage('email');
    setFormData(prev => ({
      ...prev,
      reset: { email: '', otp: ['', '', '', '', '', ''], newPassword: '', confirmPassword: '' }
    }));
  };

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    const email = formData.reset.email;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email');
      return;
    }
    try {
      setIsLoading(true);
      const resp = await fetch(`${dataService.apiBaseUrl}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await resp.json();
      if (data.success) {
        setResetStage('otp');
      } else {
        alert(data.message || 'Failed to send OTP');
      }
    } catch (e) {
      alert('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    if (formData.reset.otp.some(d => d === '')) {
      alert('Please enter the complete OTP code');
      return;
    }
    try {
      setIsLoading(true);
      const resp = await fetch(`${dataService.apiBaseUrl}/auth/verify-reset-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.reset.email, otp: formData.reset.otp.join('') })
      });
      const data = await resp.json();
      if (data.success) {
        setResetStage('password');
      } else {
        alert(data.message || 'Invalid or expired OTP');
      }
    } catch (e) {
      alert('OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword } = formData.reset;
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters and include letters and numbers');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      alert('Password must contain at least one letter and one number');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      setIsLoading(true);
      const resp = await fetch(`${dataService.apiBaseUrl}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.reset.email, otp: formData.reset.otp.join(''), newPassword, confirmPassword })
      });
      const data = await resp.json();
      if (data.success) {
        alert('Password reset successful. Please login.');
        setShowForgot(false);
        setResetStage('email');
        setActiveTab('login');
        setFormData(prev => ({
          ...prev,
          reset: { email: '', otp: ['', '', '', '', '', ''], newPassword: '', confirmPassword: '' }
        }));
      } else {
        alert(data.message || 'Failed to reset password');
      }
    } catch (e) {
      alert('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.login.identifier || !formData.login.password) {
      alert(t('fillAllFields'));
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.login.identifier,
          password: formData.login.password
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const role = data.user?.role;
        const map = {
          'citizen': '/citizen-dashboard',
          'field-officer': '/field-officer-dashboard',
          'dept-admin': '/department-admin-dashboard',
          'super-admin': '/super-admin-dashboard'
        };
        navigate(map[role] || '/citizen-dashboard');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(t('loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (formType) => {
    const errors = [];
    
    if (formType === 'register') {
      const { fullName, email, phone, cnic, password, confirmPassword } = formData.register;
      
      // Validate full name
      if (!fullName || fullName.length < 2) {
        errors.push('Full name must be at least 2 characters long');
      } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
        errors.push('Name can only contain letters and spaces');
      }
      
      // Validate email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please enter a valid email address');
      }
      
      // Validate Pakistani phone number
      if (!phone) {
        errors.push('Phone number is required');
      } else {
        const cleanPhone = phone.replace(/[\s-()]/g, '');
        const phoneRegex = /^(\+92|92|0)?3[0-9]{9}$/;
        if (!phoneRegex.test(cleanPhone)) {
          errors.push('Please enter a valid Pakistani mobile number (e.g., 03XXXXXXXXX)');
        }
      }
      
      // Validate CNIC
      if (!cnic) {
        errors.push('CNIC is required');
      } else {
        const cleanCNIC = cnic.replace(/[\s-]/g, '');
        if (!/^[0-9]{13}$/.test(cleanCNIC)) {
          errors.push('CNIC must be exactly 13 digits without dashes');
        } else if (cleanCNIC[0] === '0') {
          errors.push('CNIC cannot start with 0');
        }
      }
      
      // Validate password
      // 1 Digit, 1 small Alphabet, 1 capital alphabet, 1 Special Character, length must be 6 or greater
      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
      if (!password || !passwordRegex.test(password)) {
        errors.push('fulfill requirements of password');
      }
      
      // Validate password confirmation
      if (password !== confirmPassword) {
        errors.push('Passwords do not match');
      }

      // Validate Area Selection
      if (formData.register.areaType === 'Urban' && !formData.register.sector) {
        errors.push('Please select a Sector');
      } else if (formData.register.areaType === 'Rural' && !formData.register.ruralJurisdiction) {
        errors.push('Please select a Jurisdiction');
      }
    }
    
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm('register');
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData.register,
          role: 'citizen'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          otp: { 
            ...prev.otp, 
            email: formData.register.email,
            otp: ['', '', '', '', '', '']
          }
        }));
        setShowOtp(true);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleOtpVerify = async (e) => {
    e.preventDefault();
    
    // Check if all OTP fields are filled
    if (formData.otp.otp.some(digit => digit === '')) {
      alert('Please enter the complete OTP code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.otp.email,
          otp: formData.otp.otp.join('')
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowOtp(false);
        setActiveTab("login");
        alert("Registration successful! Please login with your credentials.");
        
        // Clear register form
        setFormData(prev => ({
          ...prev,
          register: {
            fullName: '',
            email: '',
            phone: '',
            cnic: '',
            password: '',
            confirmPassword: '',
            areaType: 'Urban',
            sector: '',
            ruralJurisdiction: ''
          },
          otp: { email: '', otp: ['', '', '', '', '', ''] }
        }));
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      alert('OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async (e) => {
    e.preventDefault();
    
    if (!formData.otp.email) {
      alert('Email not found. Please try registering again.');
      return;
    }

    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.otp.email }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('OTP resent successfully! Check your email.');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      alert('Failed to resend OTP. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="loader-bg">
        <div className="loader-content">
          <div className="loader-spinner">
            <i className="fas fa-cog"></i>
          </div>
          <h2 className="loader-title">{t('appTitle')}</h2>
          <p className="loader-subtitle">{t('tagline')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-selection-page">
      <div className="container">
        <div className="language-toggle-wrapper" style={{position: 'absolute', top: '20px', right: '20px', zIndex: 100}}>
             <button 
              onClick={toggleLanguage}
              className="btn btn-sm btn-outline"
              style={{ 
                padding: '8px 16px', 
                borderRadius: '20px', 
                fontWeight: 'bold', 
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              {language === 'english' ? 'اردو' : 'English'}
            </button>
        </div>
        <div className="logo">
          <h1>{t('appTitle')}</h1>
          <p>{t('tagline')}</p>
        </div>

        <div className={`auth-container ${authAnimation}`}>
          <div className="auth-card">
            <div className="card-header">
              <h2>{showOtp ? t('verify') : (activeTab === 'register' ? t('register') : t('login'))}</h2>
            </div>
            

              

              <div className="form-content">
                {!showOtp ? (
                  <>
                    {!showForgot && (
                      <form 
                        className={`auth-form ${activeTab === 'login' ? 'active' : ''}`} 
                        onSubmit={handleLogin}
                      >
                        <h3 className="form-title">{t('signInTitle')}</h3>
                        
                        <div className="input-group">
                          <i className="fas fa-user"></i>
                          <input 
                            type="text" 
                            placeholder={t('emailPlaceholder')}
                            value={formData.login.identifier}
                            onChange={(e) => handleInputChange('login', 'identifier', e.target.value)}
                            required 
                          />
                        </div>
                        
                        <div className="input-group">
                          <i className="fas fa-lock"></i>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type={showLoginPassword ? "text" : "password"} 
                              placeholder={t('passwordPlaceholder')}
                              value={formData.login.password}
                              onChange={(e) => handleInputChange('login', 'password', e.target.value)}
                              style={{ paddingRight: '48px' }}
                              required 
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowLoginPassword(v => !v)} 
                              aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                              title={showLoginPassword ? 'Hide password' : 'Show password'}
                              style={{ 
                                position: 'absolute', 
                                right: 12, 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--gray)', 
                                cursor: 'pointer',
                                zIndex: 2 
                              }}
                            >
                              <i className={`fas ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                        </div>
                        
                        <div className="form-options">
                          <label className="checkbox">
                            <input type="checkbox" />
                            <span>{t('rememberMe')}</span>
                          </label>
                          <button type="button" className="forgot-password" onClick={startForgotPassword}>{t('forgotPassword')}</button>
                        </div>
                        
                        <button type="submit" className="btn primary-btn" disabled={isLoading}>
                          {isLoading ? <i className="fas fa-spinner fa-spin"></i> : t('login')}
                        </button>
                        
                <div className="card-footer">
                  <button type="button" className="create-account-btn" onClick={() => handleTabChange('register')}>{t('createAccount')}</button>
                </div>
              </form>
            )}

            {showForgot && activeTab === 'login' && (
              <div className="auth-form active">
                {resetStage === 'email' && (
                  <form onSubmit={handleForgotEmailSubmit}>
                    <h3 className="form-title">{t('resetPassword')}</h3>
                    <div className="input-group">
                      <i className="fas fa-envelope"></i>
                      <input type="email" placeholder={t('emailPlaceholder')} value={formData.reset.email} onChange={(e) => setFormData(prev => ({ ...prev, reset: { ...prev.reset, email: e.target.value } }))} required />
                    </div>
                    <button type="submit" className="btn primary-btn" disabled={isLoading}>{isLoading ? <i className="fas fa-spinner fa-spin"></i> : t('sendOtp')}</button>
                    <div className="form-options" style={{ justifyContent: 'center' }}>
                      <button type="button" className="forgot-password" onClick={() => setShowForgot(false)}>{t('back')}</button>
                    </div>
                  </form>
                )}
                {resetStage === 'otp' && (
                  <form onSubmit={handleVerifyResetOtp} className="otp-form">
                    <h3 className="form-title">{t('enterOtp')}</h3>
                    <p className="otp-description">{t('otpDescription')} <strong>{formData.reset.email}</strong></p>
                    <div className="otp-inputs">
                      {[0,1,2,3,4,5].map((index) => (
                        <input key={index} id={`reset-otp-input-${index}`} type="text" maxLength="1" className="otp-input" value={formData.reset.otp[index]} onChange={(e) => handleResetOtpChange(index, e.target.value)} required />
                      ))}
                    </div>
                    <button type="submit" className="btn primary-btn" disabled={isLoading}>{isLoading ? <i className="fas fa-spinner fa-spin"></i> : t('verify')}</button>
                    <div className="form-options" style={{ justifyContent: 'center' }}>
                      <button type="button" className="forgot-password" onClick={() => setResetStage('email')}>{t('changeEmail')}</button>
                    </div>
                  </form>
                )}
                {resetStage === 'password' && (
                  <form onSubmit={handleResetPassword}>
                    <h3 className="form-title">{t('setNewPassword')}</h3>
                    <div className="input-group">
                      <i className="fas fa-lock"></i>
                      <input type="password" placeholder={t('setNewPassword')} value={formData.reset.newPassword} onChange={(e) => setFormData(prev => ({ ...prev, reset: { ...prev.reset, newPassword: e.target.value } }))} required />
                    </div>
                    <div className="input-group">
                      <i className="fas fa-lock"></i>
                      <input type="password" placeholder={t('passwordPlaceholder')} value={formData.reset.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, reset: { ...prev.reset, confirmPassword: e.target.value } }))} required />
                    </div>
                    <button type="submit" className="btn primary-btn" disabled={isLoading}>{isLoading ? <i className="fas fa-spinner fa-spin"></i> : t('resetPassword')}</button>
                    <div className="form-options" style={{ justifyContent: 'center' }}>
                      <button type="button" className="forgot-password" onClick={() => setResetStage('otp')}>{t('back')}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'register' && (
              <form 
                className={`auth-form ${activeTab === 'register' ? 'active' : ''}`} 
                onSubmit={handleRegister}
              >
                <h3 className="form-title">{t('createAccount')}</h3>
                
                <div className="input-row">
                  <div className="input-group">
                    <i className="fas fa-user"></i>
                    <input 
                      type="text" 
                      placeholder={t('fullName')}
                      value={formData.register.fullName}
                      onChange={(e) => handleInputChange('register', 'fullName', e.target.value)}
                      className={(regTouched.fullName ? (regErrors.fullName ? 'is-invalid' : 'is-valid') : '')}
                      required 
                    />
                    {regTouched.fullName && regErrors.fullName && (<small className="helper-text invalid">{regErrors.fullName}</small>)}
                  </div>
                </div>
                
                <div className="input-group">
                  <i className="fas fa-envelope"></i>
                  <input 
                    type="email" 
                    placeholder={t('email')}
                    value={formData.register.email}
                    onChange={(e) => handleInputChange('register', 'email', e.target.value)}
                    className={(regTouched.email ? (regErrors.email ? 'is-invalid' : 'is-valid') : '')}
                    required 
                  />
                  {regTouched.email && regErrors.email && (<small className="helper-text invalid">{regErrors.email}</small>)}
                  {regTouched.email && !regErrors.email && emailAvailability === 'available' && (<small className="helper-text valid"><i className="fas fa-check"></i> {t('email')} available</small>)}
                  {regTouched.email && !regErrors.email && emailAvailability === 'taken' && (<small className="helper-text invalid"><i className="fas fa-times"></i> {t('email')} already in use</small>)}
                </div>
                
                <div className="input-row">
                  <div className="input-group">
                    <i className="fas fa-phone"></i>
                    <input 
                      type="tel" 
                      placeholder={t('phone')}
                      value={formData.register.phone}
                      onChange={(e) => handleInputChange('register', 'phone', e.target.value)}
                      className={(regTouched.phone ? (regErrors.phone ? 'is-invalid' : 'is-valid') : '')}
                      required 
                    />
                    {regTouched.phone && regErrors.phone && (<small className="helper-text invalid">{regErrors.phone}</small>)}
                  </div>
                  <div className="input-group">
                    <i className="fas fa-id-card"></i>
                    <input 
                      type="text" 
                      placeholder={t('cnic')}
                      value={formData.register.cnic}
                      onChange={(e) => handleInputChange('register', 'cnic', e.target.value)}
                      maxLength="13"
                      className={(regTouched.cnic ? (regErrors.cnic ? 'is-invalid' : 'is-valid') : '')}
                      required 
                    />
                    {regTouched.cnic && regErrors.cnic && (<small className="helper-text invalid">{regErrors.cnic}</small>)}
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <i className="fas fa-map"></i>
                    <select
                      className="form-control"
                      value={formData.register.areaType || 'Urban'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        register: { 
                          ...prev.register, 
                          areaType: e.target.value, 
                          sector: '', 
                          ruralJurisdiction: '' 
                        } 
                      }))}
                      required
                    >
                      <option value="Urban">Urban</option>
                      <option value="Rural">Rural</option>
                    </select>
                  </div>
                  
                  {formData.register.areaType === 'Urban' && (
                    <div className="input-group">
                      <i className="fas fa-building"></i>
                      <select
                        className="form-control"
                        value={formData.register.sector}
                        onChange={(e) => handleInputChange('register', 'sector', e.target.value)}
                        required
                      >
                        <option value="">Select Sector</option>
                        {urbanSectors.map(s => (
                          <option key={s._id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.register.areaType === 'Rural' && (
                    <div className="input-group">
                      <i className="fas fa-tree"></i>
                      <select
                        className="form-control"
                        value={formData.register.ruralJurisdiction}
                        onChange={(e) => handleInputChange('register', 'ruralJurisdiction', e.target.value)}
                        required
                      >
                        <option value="">Select Jurisdiction</option>
                        {ruralJurisdictions.map(j => (
                          <option key={j._id} value={j.name}>{j.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="input-group">
                  <i className="fas fa-lock"></i>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showRegisterPassword ? "text" : "password"} 
                      placeholder={t('passwordPlaceholder')}
                      value={formData.register.password}
                      onChange={(e) => handleInputChange('register', 'password', e.target.value)}
                      style={{ paddingRight: '48px' }}
                      className={(regTouched.password ? (regErrors.password ? 'is-invalid' : 'is-valid') : '')}
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowRegisterPassword(v => !v)} 
                      aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      title={showRegisterPassword ? 'Hide password' : 'Show password'}
                      style={{ 
                        position: 'absolute', 
                        right: 12, 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--gray)', 
                        cursor: 'pointer',
                        zIndex: 2 
                      }}
                    >
                      <i className={`fas ${showRegisterPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {regTouched.password && regErrors.password && (<small className="helper-text invalid">{regErrors.password}</small>)}
                  <div className="password-strength">
                    <div className={`bar ${passwordScore >= 1 ? 'on' : ''}`}></div>
                    <div className={`bar ${passwordScore >= 2 ? 'on' : ''}`}></div>
                    <div className={`bar ${passwordScore >= 3 ? 'on' : ''}`}></div>
                    <div className={`bar ${passwordScore >= 4 ? 'on' : ''}`}></div>
                  </div>
                </div>
                
                <div className="input-group">
                  <i className="fas fa-lock"></i>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showRegisterConfirm ? "text" : "password"} 
                      placeholder={t('confirmPassword')}
                      value={formData.register.confirmPassword}
                      onChange={(e) => handleInputChange('register', 'confirmPassword', e.target.value)}
                      style={{ paddingRight: '48px' }}
                      className={(regTouched.confirmPassword ? (regErrors.confirmPassword ? 'is-invalid' : 'is-valid') : '')}
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowRegisterConfirm(v => !v)} 
                      aria-label={showRegisterConfirm ? 'Hide password' : 'Show password'}
                      title={showRegisterConfirm ? 'Hide password' : 'Show password'}
                      style={{ 
                        position: 'absolute', 
                        right: 12, 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--gray)', 
                        cursor: 'pointer',
                        zIndex: 2 
                      }}
                    >
                      <i className={`fas ${showRegisterConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {regTouched.confirmPassword && regErrors.confirmPassword && (<small className="helper-text invalid">{regErrors.confirmPassword}</small>)}
                </div>
                
                <div className="form-options">
                  <label className="checkbox">
                    <input type="checkbox" required />
                    <span>{t('agreeTerms')}</span>
                  </label>
                </div>
                
                <button type="submit" className="btn primary-btn" disabled={isLoading}>
                  {isLoading ? <i className="fas fa-spinner fa-spin"></i> : t('createAccount')}
                </button>
                <div className="form-options" style={{ justifyContent: 'center' }}>
                  <button type="button" className="forgot-password" onClick={() => handleTabChange('login')}>{t('back')}</button>
                </div>
              </form>
            )}

            {false && (<div />)}
                  </>
                ) : (
                  <form className="auth-form active otp-form" onSubmit={handleOtpVerify}>
                    <h3 className="form-title">{t('verify')}</h3>
                    <p className="otp-description">
                      {t('otpDescription')} <strong>{formData.otp.email}</strong>
                    </p>
                    
                    <div className="otp-inputs">
                      {[0,1,2,3,4,5].map((index) => (
                        <input 
                          key={index}
                          id={`otp-input-${index}`}
                          type="text" 
                          maxLength="1" 
                          className="otp-input"
                          value={formData.otp.otp[index]}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => {
                            // Handle backspace
                            if (e.key === 'Backspace' && !formData.otp.otp[index] && index > 0) {
                              const prevInput = document.getElementById(`otp-input-${index - 1}`);
                              if (prevInput) prevInput.focus();
                            }
                          }}
                          required 
                        />
                      ))}
                    </div>
                    
                    <button type="submit" className="btn primary-btn" disabled={isLoading}>
                      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : t('verify')}
                    </button>
                    
                    <div className="otp-resend">
                      <p>{t('resendOtpPrompt')} <button type="button" className="forgot-password" onClick={handleResendOtp}>{t('resendOtp')}</button></p>
                    </div>
                  </form>
                )}
              </div>
              
              
            </div>
          </div>
      </div>
    </div>
  );
};

export default RoleSelection;
