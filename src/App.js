import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import RoleSelection from './components/RoleSelection';
import CitizenDashboard from './pages/CitizenDashboard';
import FieldOfficerDashboard from './pages/FieldOfficerDashboard';
import DepartmentAdminDashboard from './pages/DepartmentAdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { RequireRole } from './RoleGuards';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

function ChatTestPage() {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [lang, setLang] = useState('english');
  const [message, setMessage] = useState('');
  const [health, setHealth] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chat, setChat] = useState([]);
  const [authInfo, setAuthInfo] = useState('');
  const listRef = useRef(null);

  const apiBase = useMemo(() => {
    const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '');
    return trimmed ? `${trimmed}/api` : '/api';
  }, [baseUrl]);

  const api = useMemo(() => {
    return {
      health: `${apiBase}/chat/assistant/health`,
      assistant: `${apiBase}/chat/assistant`,
      login: `${apiBase}/auth/login`
    };
  }, [apiBase]);

  useEffect(() => {
    try {
      const t = window?.localStorage?.getItem('token') || '';
      if (t && !token) setToken(t);
    } catch {}
  }, [token]);

  useEffect(() => {
    try {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch {}
  }, [chat]);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(api.health, { method: 'GET' });
      const data = await res.json().catch(() => null);
      setHealth(data);
    } catch (e) {
      setHealth({ success: false, message: 'Health check failed' });
    } finally {
      setIsChecking(false);
    }
  };

  const persistToken = (nextToken) => {
    const t = String(nextToken || '').trim();
    setToken(t);
    try {
      if (t) window?.localStorage?.setItem('token', t);
      else window?.localStorage?.removeItem('token');
    } catch {}
  };

  const login = async () => {
    const id = String(identifier || '').trim();
    const pwd = String(password || '');
    if (!id || !pwd) {
      setAuthInfo('Identifier/password required');
      return;
    }
    setIsLoggingIn(true);
    setAuthInfo('');
    try {
      const res = await fetch(api.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password: pwd })
      });
      const data = await res.json().catch(() => null);
      const nextToken = String(data?.token || '').trim();
      if (!res.ok || !nextToken) {
        setAuthInfo(String(data?.message || `Login failed (${res.status})`));
        return;
      }
      persistToken(nextToken);
      try {
        if (data?.user) window?.localStorage?.setItem('user', JSON.stringify(data.user));
      } catch {}
      setPassword('');
      setAuthInfo('Logged in');
    } catch (e) {
      setAuthInfo('Network error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const send = async () => {
    const text = String(message || '').trim();
    if (!text) return;

    if (!String(token || '').trim()) {
      setChat(prev => [
        ...prev,
        { id: `${Date.now()}-b`, role: 'bot', text: 'Token missing: please login or paste token first.' }
      ]);
      return;
    }

    const nextUser = { id: `${Date.now()}-u`, role: 'user', text };
    setChat(prev => [...prev, nextUser]);
    setMessage('');
    setIsSending(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(api.assistant, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          lang,
          history: chat
            .slice(-12)
            .map(m => ({ sender: m.role === 'user' ? 'user' : 'bot', text: m.text })),
          context: ''
        })
      });

      const data = await res.json().catch(() => null);
      const reply = String(data?.reply || '').trim();
      if (!res.ok || !reply) {
        const errMsg = String(data?.message || `Request failed (${res.status})`);
        setChat(prev => [...prev, { id: `${Date.now()}-b`, role: 'bot', text: errMsg }]);
      } else {
        setChat(prev => [...prev, { id: `${Date.now()}-b`, role: 'bot', text: reply }]);
      }
    } catch (e) {
      setChat(prev => [...prev, { id: `${Date.now()}-b`, role: 'bot', text: 'Network error' }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-test-page">
      <div className="chat-test-card">
        <div className="chat-test-head">
          <div>
            <div className="chat-test-title">Chat Test</div>
            <div className="chat-test-sub">Backend /api/chat/assistant ko quickly verify karne ke liye</div>
          </div>
          <button type="button" className="chat-test-btn" onClick={checkHealth} disabled={isChecking}>
            {isChecking ? 'Checking…' : 'Health Check'}
          </button>
        </div>

        <div className="chat-test-grid">
          <label className="chat-test-field">
            <div className="chat-test-label">Base URL (optional)</div>
            <input
              className="chat-test-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g. http://localhost:5100"
            />
          </label>
          <label className="chat-test-field">
            <div className="chat-test-label">Language</div>
            <select className="chat-test-input" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="english">English</option>
              <option value="urdu">Urdu</option>
            </select>
          </label>
          <label className="chat-test-field chat-test-span2">
            <div className="chat-test-label">Token (Bearer)</div>
            <input
              className="chat-test-input"
              value={token}
              onChange={(e) => persistToken(e.target.value)}
              placeholder="Paste JWT token here (optional but required for /assistant)"
            />
          </label>
        </div>

        <div className="chat-test-auth">
          <div className="chat-test-auth-title">Quick Login (gets token)</div>
          <div className="chat-test-auth-grid">
            <label className="chat-test-field">
              <div className="chat-test-label">Identifier (email / phone / CNIC)</div>
              <input
                className="chat-test-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. citizen@email.com"
              />
            </label>
            <label className="chat-test-field">
              <div className="chat-test-label">Password</div>
              <input
                className="chat-test-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login();
                }}
              />
            </label>
            <div className="chat-test-auth-actions">
              <button type="button" className="chat-test-btn primary" onClick={login} disabled={isLoggingIn}>
                {isLoggingIn ? 'Logging in…' : 'Login'}
              </button>
              <button type="button" className="chat-test-btn" onClick={() => persistToken('')}>
                Clear Token
              </button>
            </div>
          </div>
          {authInfo ? <div className="chat-test-auth-info">{authInfo}</div> : null}
        </div>

        <div className="chat-test-meta">
          <div><span className="chat-test-k">Health:</span> {health ? JSON.stringify(health) : 'Not checked'}</div>
          <div><span className="chat-test-k">API:</span> {apiBase}</div>
        </div>

        <div className="chat-test-chat">
          {chat.length === 0 ? (
            <div className="chat-test-empty">Message send karke test start karo.</div>
          ) : (
            chat.map(m => (
              <div key={m.id} className={`chat-test-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.text}
              </div>
            ))
          )}
          <div ref={listRef} />
        </div>

        <div className="chat-test-composer">
          <input
            className="chat-test-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
          />
          <button type="button" className="chat-test-btn primary" onClick={send} disabled={isSending}>
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/citizen-dashboard" element={<RequireRole allowed={["citizen"]}><CitizenDashboard /></RequireRole>} />
            <Route path="/field-officer-dashboard" element={<RequireRole allowed={["field-officer"]}><FieldOfficerDashboard /></RequireRole>} />
            <Route path="/department-admin-dashboard" element={<RequireRole allowed={["dept-admin"]}><DepartmentAdminDashboard /></RequireRole>} />
            <Route path="/super-admin-dashboard" element={<RequireRole allowed={["super-admin"]}><SuperAdminDashboard /></RequireRole>} />
            <Route path="/chat-test" element={<ChatTestPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
