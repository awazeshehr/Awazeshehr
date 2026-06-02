import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './RoleSelection.css';
import dataService from '../services/dataService';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const particlesContainerRef = useRef(null);
  const logoUrl = `${process.env.PUBLIC_URL}/awazeshehr.jpeg`;
  
  const [selectedRole] = useState("citizen");
  const [activeTab, setActiveTab] = useState("login");
  const [showOtp, setShowOtp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetStage, setResetStage] = useState('email');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [authAnimation, setAuthAnimation] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const [formData, setFormData] = useState({
    login: { identifier: '', password: '' },
    register: { 
      fullName: '', 
      email: '', 
      phone: '', 
      cnic: '', 
      password: '', 
      confirmPassword: ''
    },
    otp: { email: '', otp: ['', '', '', '', '', ''] },
    reset: { email: '', otp: ['', '', '', '', '', ''], newPassword: '', confirmPassword: '' }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialLoading) {
      setAuthAnimation('slide-in');
    }
  }, [isInitialLoading]);

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
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setShowOtp(false);
      setShowForgot(false);
      setIsTransitioning(false);
    }, 300);
  };

  const handleInputChange = (formType, field, value) => {
    let processedValue = value;
    
    // Format input based on field type
    if (field === 'phone') {
      processedValue = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
      if (processedValue.length > 13) processedValue = processedValue.slice(0, 13);
    } else if (field === 'cnic') {
      processedValue = value.replace(/\D/g, '');
      if (processedValue.length > 13) processedValue = processedValue.slice(0, 13);
    } else if (field === 'fullName') {
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        [field]: processedValue
      }
    }));

    if (formType === 'register' || (formType === 'reset' && field === 'newPassword')) {
      if (field === 'password' || field === 'newPassword') {
        const pass = processedValue;
        setPasswordRequirements({
          length: pass.length >= 6,
          uppercase: /[A-Z]/.test(pass),
          lowercase: /[a-z]/.test(pass),
          number: /\d/.test(pass),
          special: /[^a-zA-Z0-9]/.test(pass)
        });
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
      setIsActionLoading(true);
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
      setIsActionLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    if (formData.reset.otp.some(d => d === '')) {
      alert('Please enter the complete OTP code');
      return;
    }
    try {
      setIsActionLoading(true);
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
      setIsActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword } = formData.reset;
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters and include letters and numbers');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      setIsActionLoading(true);
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
      setIsActionLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.login.identifier || !formData.login.password) {
      alert(t('fillAllFields'));
      return;
    }
    setIsActionLoading(true);
    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.login.identifier,
          password: formData.login.password
        }),
      });
      const data = await response.json();
      if (data.success) {
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
      alert(t('loginFailed'));
    } finally {
      setIsActionLoading(false);
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
    }
    
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errors = validateForm('register');
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    setIsActionLoading(true);
    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData.register, role: 'citizen' }),
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          otp: { ...prev.otp, email: formData.register.email, otp: ['', '', '', '', '', ''] }
        }));
        setShowOtp(true);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Registration failed. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (formData.otp.otp.some(digit => digit === '')) {
      alert('Please enter the complete OTP code');
      return;
    }
    setIsActionLoading(true);
    try {
      const response = await fetch(`${dataService.apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setFormData(prev => ({
          ...prev,
          register: {
            fullName: '', email: '', phone: '', cnic: '', password: '', confirmPassword: ''
          },
          otp: { email: '', otp: ['', '', '', '', '', ''] }
        }));
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('OTP verification failed. Please try again.');
    } finally {
      setIsActionLoading(false);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.otp.email }),
      });
      const data = await response.json();
      if (data.success) {
        alert('OTP resent successfully! Check your email.');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to resend OTP. Please try again.');
    }
  };

  if (isInitialLoading) {
    return (
      <div className="loader-bg">
        <div className="loader-content">
          <div className="loader-spinner">
            <i className="fas fa-cog"></i>
          </div>
          <img className="loader-logo" src={logoUrl} alt={t('appTitle')} />
          <h2 className="loader-title">{t('appTitle')}</h2>
          <p className="loader-subtitle">{t('tagline')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-v2-page">
      {/* Background Animated Elements */}
      <div className="animated-bg-overlay">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="language-toggle-v2" onClick={toggleLanguage}>
        <i className="fas fa-globe"></i> {language === 'english' ? 'اردو' : 'English'} <i className="fas fa-chevron-down"></i>
      </div>

      <div className="login-v2-container">
        {/* Left Section */}
        <div className="login-v2-left">
          <div className="v2-branding">
            <div className="v2-logo-box">
              <img className="brand-logo" src={logoUrl} alt={t('appTitle')} />
            </div>
            <div className="v2-brand-info">
              <h1>{t('appTitle')}</h1>
              <p>{t('tagline')}</p>
            </div>
          </div>

          <div className="v2-hero">
            <h2 className="v2-title">{t('yourVoice')}</h2>
            <div className="v2-divider"></div>
            <p className="v2-desc">
              {t('heroText')}
            </p>
          </div>

          <div className="v2-features">
            <div className="v2-feature-card">
              <div className="v2-feature-icon"><i className="fas fa-shield-alt"></i></div>
              <div className="v2-feature-content">
                <h4>{t('secureReliable')}</h4>
                <p>{t('secureDesc')}</p>
              </div>
            </div>
            <div className="v2-feature-card purple">
              <div className="v2-feature-icon"><i className="fas fa-sync-alt"></i></div>
              <div className="v2-feature-content">
                <h4>{t('transparentProcess')}</h4>
                <p>{t('transparentDesc')}</p>
              </div>
            </div>
            <div className="v2-feature-card pink">
              <div className="v2-feature-icon"><i className="fas fa-users"></i></div>
              <div className="v2-feature-content">
                <h4>{t('strongerCommunity')}</h4>
                <p>{t('communityDesc')}</p>
              </div>
            </div>
          </div>

          <div className="v2-trust-footer">
            <i className="fas fa-check-circle"></i>
            <span>{t('trustedBy')}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="login-v2-right">
          <div className={`v2-auth-container ${authAnimation}`}>
            <div className={`v2-auth-card ${isTransitioning ? 'v2-fade-out' : 'v2-fade-in'}`}>
              <div className="v2-card-head">
                <div className="v2-head-icon">
                  <i className={`fas ${
                    showOtp ? "fa-user-check" : 
                    showForgot ? "fa-key" : 
                    activeTab === 'register' ? "fa-user-plus" : "fa-user-circle"
                  }`}></i>
                </div>
                <h2>
                  {showOtp ? t('verifyAccount') : 
                   showForgot ? t('resetPassword') : 
                   activeTab === 'register' ? t('createAccount') : t('welcomeBack')}
                </h2>
                <p>
                  {showOtp ? t('enterOtp') : 
                   showForgot ? t('enterDetailsReset') : 
                   activeTab === 'register' ? t('joinCommunity') : t('loginToContinue')}
                </p>
              </div>

              <div className="v2-form-area">
                {!showOtp ? (
                  <>
                    {!showForgot && (
                      <form className={`v2-form ${activeTab === 'login' ? 'active' : ''}`} onSubmit={handleLogin}>
                        <div className="v2-input-group">
                          <i className="fas fa-user v2-icon"></i>
                          <input 
                            type="text" 
                            placeholder={t('identifierPlaceholder') || "Email, Phone or CNIC"}
                            value={formData.login.identifier}
                            onChange={(e) => handleInputChange('login', 'identifier', e.target.value)}
                            required 
                          />
                        </div>
                        
                        <div className="v2-input-group">
                          <i className="fas fa-lock v2-icon"></i>
                          <input 
                            type={showLoginPassword ? "text" : "password"} 
                            placeholder={t('passwordPlaceholder')}
                            value={formData.login.password}
                            onChange={(e) => handleInputChange('login', 'password', e.target.value)}
                            required 
                          />
                          <button type="button" className="v2-toggle" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                            <i className={`fas ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        
                        <div className="v2-form-options">
                          <label className="v2-checkbox">
                            <input type="checkbox" />
                            <span className="v2-checkmark"></span>
                            <span>{t('rememberMe') || "Remember me"}</span>
                          </label>
                          <button type="button" className="v2-forgot" onClick={startForgotPassword}>{t('forgotPassword')}?</button>
                        </div>
                        
                        <button type="submit" className="v2-btn-primary" disabled={isActionLoading}>
                          {isActionLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-lock"></i> {t('loginBtn')}</>}
                        </button>

                        <div className="v2-or"><span>OR</span></div>
                        
                        <button type="button" className="v2-btn-outline" onClick={() => handleTabChange('register')}>
                          <i className="fas fa-user-plus"></i> {t('createAccountBtn') || "Create New Account"}
                        </button>
                      </form>
                    )}

                    {showForgot && activeTab === 'login' && (
                      <div className="v2-form active">
                        {resetStage === 'email' && (
                          <form onSubmit={handleForgotEmailSubmit}>
                            <p className="v2-form-subtitle">{t('enterEmailReset') || "Enter your email to receive a 6-digit OTP code."}</p>
                            <div className="v2-input-group">
                              <i className="fas fa-envelope v2-icon"></i>
                              <input 
                                type="email" 
                                placeholder={t('emailPlaceholder') || "Enter your email"} 
                                value={formData.reset.email} 
                                onChange={(e) => setFormData(prev => ({ ...prev, reset: { ...prev.reset, email: e.target.value } }))} 
                                required 
                              />
                            </div>
                            <button type="submit" className="v2-btn-primary" disabled={isActionLoading}>
                              {isActionLoading ? <i className="fas fa-spinner fa-spin"></i> : t('sendOtp') || "Send OTP Code"}
                            </button>
                            <button type="button" className="v2-btn-text" onClick={() => setShowForgot(false)}>{t('backToLogin') || "Back to Login"}</button>
                          </form>
                        )}
                        
                        {resetStage === 'otp' && (
                          <form onSubmit={handleVerifyResetOtp}>
                            <p className="v2-form-subtitle">{t('enterOtpSentTo') || "Enter the 6-digit code sent to"} {formData.reset.email}</p>
                            <div className="v2-otp-grid">
                              {[0,1,2,3,4,5].map((index) => (
                                <input 
                                  key={index} 
                                  id={`reset-otp-input-${index}`} 
                                  type="text" 
                                  maxLength="1" 
                                  className="v2-otp-input" 
                                  value={formData.reset.otp[index]} 
                                  onChange={(e) => handleResetOtpChange(index, e.target.value)} 
                                  required 
                                />
                              ))}
                            </div>
                            <button type="submit" className="v2-btn-primary" disabled={isActionLoading}>
                              {isActionLoading ? <i className="fas fa-spinner fa-spin"></i> : t('verifyOtp') || "Verify OTP"}
                            </button>
                            <button type="button" className="v2-btn-text" onClick={() => setResetStage('email')}>{t('resendToDifferentEmail') || "Resend to different email"}</button>
                          </form>
                        )}

                        {resetStage === 'password' && (
                          <form onSubmit={handleResetPassword}>
                            <p className="v2-form-subtitle">{t('setNewPasswordSubtitle') || "Set a strong password for your account."}</p>
                            <div className="v2-input-group">
                              <i className="fas fa-lock v2-icon"></i>
                              <input 
                                type="password" 
                                placeholder={t('newPasswordPlaceholder') || "New Password"} 
                                value={formData.reset.newPassword} 
                                onChange={(e) => handleInputChange('reset', 'newPassword', e.target.value)} 
                                required 
                              />
                            </div>

                            {/* Password Requirements Indicator for Reset */}
                            <div className="v2-password-requirements">
                              <div className={`req-item ${passwordRequirements.length ? 'met' : ''}`}>
                                <i className={`fas ${passwordRequirements.length ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                <span>{t('min6Chars') || 'At least 6 characters'}</span>
                              </div>
                              <div className="req-row">
                                <div className={`req-item ${passwordRequirements.uppercase ? 'met' : ''}`}>
                                  <i className={`fas ${passwordRequirements.uppercase ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                  <span>{t('uppercase') || 'Uppercase'}</span>
                                </div>
                                <div className={`req-item ${passwordRequirements.lowercase ? 'met' : ''}`}>
                                  <i className={`fas ${passwordRequirements.lowercase ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                  <span>{t('lowercase') || 'Lowercase'}</span>
                                </div>
                              </div>
                              <div className="req-row">
                                <div className={`req-item ${passwordRequirements.number ? 'met' : ''}`}>
                                  <i className={`fas ${passwordRequirements.number ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                  <span>{t('number') || 'Number'}</span>
                                </div>
                                <div className={`req-item ${passwordRequirements.special ? 'met' : ''}`}>
                                  <i className={`fas ${passwordRequirements.special ? 'fa-check-circle' : 'fa-circle'}`}></i>
                                  <span>{t('specialChar') || 'Special Char'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="v2-input-group">
                              <i className="fas fa-lock v2-icon"></i>
                              <input 
                                type="password" 
                                placeholder={t('confirmPasswordPlaceholder') || "Confirm New Password"} 
                                value={formData.reset.confirmPassword} 
                                onChange={(e) => setFormData(prev => ({ ...prev, reset: { ...prev.reset, confirmPassword: e.target.value } }))} 
                                required 
                              />
                            </div>
                            <button type="submit" className="v2-btn-primary" disabled={isActionLoading}>
                              {isActionLoading ? <i className="fas fa-spinner fa-spin"></i> : t('resetPassword') || "Reset Password"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'register' && (
                      <form className="v2-form active" onSubmit={handleRegister}>
                        <div className="v2-input-group">
                          <i className="fas fa-user v2-icon"></i>
                          <input type="text" placeholder={t('fullNamePlaceholder') || "Full Name"} value={formData.register.fullName} onChange={(e) => handleInputChange('register', 'fullName', e.target.value)} required />
                        </div>
                        <div className="v2-input-group">
                          <i className="fas fa-envelope v2-icon"></i>
                          <input type="email" placeholder={t('emailPlaceholder') || "Email"} value={formData.register.email} onChange={(e) => handleInputChange('register', 'email', e.target.value)} required />
                        </div>
                        <div className="v2-input-group">
                          <i className="fas fa-phone v2-icon"></i>
                          <input type="tel" placeholder={t('phonePlaceholder') || "Phone"} value={formData.register.phone} onChange={(e) => handleInputChange('register', 'phone', e.target.value)} required />
                        </div>
                        <div className="v2-input-group">
                          <i className="fas fa-id-card v2-icon"></i>
                          <input type="text" placeholder={t('cnicPlaceholder') || "CNIC"} value={formData.register.cnic} onChange={(e) => handleInputChange('register', 'cnic', e.target.value)} maxLength="13" required />
                        </div>

                        <div className="v2-input-group">
                          <i className="fas fa-lock v2-icon"></i>
                          <input 
                            type={showRegisterPassword ? "text" : "password"} 
                            placeholder={t('passwordPlaceholder') || "Password"} 
                            value={formData.register.password} 
                            onChange={(e) => handleInputChange('register', 'password', e.target.value)} 
                            required 
                          />
                          <button type="button" className="v2-toggle" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                            <i className={`fas ${showRegisterPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>

                        {/* Password Requirements Indicator */}
                        <div className="v2-password-requirements">
                          <div className={`req-item ${passwordRequirements.length ? 'met' : ''}`}>
                            <i className={`fas ${passwordRequirements.length ? 'fa-check-circle' : 'fa-circle'}`}></i>
                            <span>{t('min6Chars') || 'At least 6 characters'}</span>
                          </div>
                          <div className="req-row">
                            <div className={`req-item ${passwordRequirements.uppercase ? 'met' : ''}`}>
                              <i className="fas fa-check-circle">
                              </i>
                              <span>{t('uppercase') || 'Uppercase'}</span>
                            </div>
                            <div className={`req-item ${passwordRequirements.lowercase ? 'met' : ''}`}>
                              <i className="fas fa-check-circle">
                              </i>
                              <span>{t('lowercase') || 'Lowercase'}</span>
                            </div>
                          </div>
                          <div className="req-row">
                            <div className={`req-item ${passwordRequirements.number ? 'met' : ''}`}>
                              <i className="fas fa-check-circle">
                              </i>
                              <span>{t('number') || 'Number'}</span>
                            </div>
                            <div className={`req-item ${passwordRequirements.special ? 'met' : ''}`}>
                              <i className="fas fa-check-circle">
                              </i>
                              <span>{t('specialChar') || 'Special Char'}</span>
                            </div>
                          </div>
                        </div>

                        <button type="submit" className="v2-btn-primary" disabled={isActionLoading}>
                          {isActionLoading ? <i className="fas fa-spinner fa-spin"></i> : t('createAccount')}
                        </button>
                        <button type="button" className="v2-btn-text" onClick={() => handleTabChange('login')}>{t('backToLogin') || "Back to Login"}</button>
                      </form>
                    )}
                  </>
                ) : (
                  <form className="v2-form active" onSubmit={handleOtpVerify}>
                    <div className="v2-otp-grid">
                      {[0,1,2,3,4,5].map((i) => (
                        <input 
                          key={i} 
                          id={`otp-input-${i}`}
                          type="text" 
                          maxLength="1" 
                          className="v2-otp-input" 
                          value={formData.otp.otp[i]} 
                          onChange={(e) => handleOtpChange(i, e.target.value)} 
                          required 
                        />
                      ))}
                    </div>
                    <button type="submit" className="v2-btn-primary" disabled={isActionLoading}>
                      {isActionLoading ? <i className="fas fa-spinner fa-spin"></i> : "Verify & Register"}
                    </button>
                    <div className="v2-resend-area">
                       <button type="button" className="v2-btn-text" onClick={handleResendOtp}>Resend OTP Code</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="v2-bottom-badges">
            <div className="v2-badge">
              <div className="v2-badge-icon"><i className="fas fa-shield-check"></i></div>
              <div className="v2-badge-info"><strong>{t('secure100')}</strong><span>{t('dataProtection')}</span></div>
            </div>
            <div className="v2-badge">
              <div className="v2-badge-icon purple"><i className="fas fa-bolt"></i></div>
              <div className="v2-badge-info"><strong>{t('easyToUse')}</strong><span>{t('simpleFast')}</span></div>
            </div>
            <div className="v2-badge">
              <div className="v2-badge-icon pink"><i className="fas fa-headset"></i></div>
              <div className="v2-badge-info"><strong>{t('support247')}</strong><span>{t('hereToHelp')}</span></div>
            </div>
          </div>
          
          <div className="v2-copyright">
            © 2026 Awaz e Shehr. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
