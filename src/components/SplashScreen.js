import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const particlesContainerRef = useRef(null);

  useEffect(() => {
    // Redirect after animation completes
    const timer = setTimeout(() => {
      navigate('/role-selection');
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  // Particle System
  useEffect(() => {
    const canvas = particlesContainerRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let particles = [];
    const particleCount = 80;
    
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        // Mix of Blue and Yellow (accent) colors
        const isBlue = Math.random() > 0.5;
        if (isBlue) {
          this.color = `rgba(100, 200, 255, ${Math.random() * 0.4 + 0.1})`;
        } else {
          // Yellow/Gold color similar to --accent #fdbb2d
          this.color = `rgba(253, 187, 45, ${Math.random() * 0.4 + 0.1})`;
        }
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
            // Gradient connection line based on particle colors would be complex, 
            // so we use a subtle white/blue mix or dynamic color
            ctx.strokeStyle = `rgba(150, 200, 255, ${0.1 * (1 - dist/120)})`;
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

  return (
    <div className="splash-wrapper">
      <canvas ref={particlesContainerRef} className="particles-canvas"></canvas>
      
      <div className="splash-container">
        <div className="logo-container">
          <h1 className="logo-main">{t('appTitle')}</h1>
          <p className="tagline">{t('tagline')}</p>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar"></div>
        </div>
        
        <p className="loading-text">{t('loadingPortalServices')}</p>
        
        {/* Rest of your JSX remains the same */}
        <div className="info-cards">
          <div className="info-card">
            <i className="fas fa-shield-alt"></i>
            <h3>{t('secure')}</h3>
            <p>{t('secureDesc')}</p>
          </div>
          <div className="info-card">
            <i className="fas fa-bolt"></i>
            <h3>{t('fast')}</h3>
            <p>{t('fastDesc')}</p>
          </div>
          <div className="info-card">
            <i className="fas fa-user-lock"></i>
            <h3>{t('private')}</h3>
            <p>{t('privateDesc')}</p>
          </div>
          <div className="info-card">
            <i className="fas fa-check-circle"></i>
            <h3>{t('reliable')}</h3>
            <p>{t('reliableDesc')}</p>
          </div>
        </div>
        
        <div className="privacy-notice">
          <p><i className="fas fa-info-circle"></i> {t('privacyNotice')}</p>
        </div>
        
        <div className="features-overview">
          <div className="feature-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>{t('gpsFeature')}</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-camera"></i>
            <span>{t('mediaFeature')}</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-chart-line"></i>
            <span>{t('trackingFeature')}</span>
          </div>
          <div className="feature-item">
            <i className="fas fa-mobile-alt"></i>
            <span>{t('mobileFeature')}</span>
          </div>
        </div>
        
        <div className="pulse-circle"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
