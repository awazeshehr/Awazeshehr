import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('english');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'english' ? 'urdu' : 'english';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const humanizeKey = (rawKey) => {
    const key = String(rawKey || '').trim();
    if (!key) return '';
    const spaced = key
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    const parts = spaced.split(' ').filter(Boolean);
    const acronyms = new Set(['id', 'cnic', 'otp', 'gps', 'sla', 'api', 'url', 'ai']);
    return parts
      .map((p) => {
        const lower = p.toLowerCase();
        if (acronyms.has(lower)) return lower.toUpperCase();
        if (p.length <= 2 && lower === p) return p.toUpperCase();
        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join(' ');
  };

  const t = (key) => {
    const dict = translations?.[language] || {};
    const val = dict?.[key];
    if (val) return val;
    return humanizeKey(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
