import React, { useEffect, useRef, useState } from 'react';
// socket handled via dataService
import './ComplaintChatPanel.css';
import dataService from '../services/dataService';

const FIELD_OFFICER_TEMPLATES = [
  { key: 'arrived', label: 'I have arrived at the location.' },
  { key: 'in_progress', label: 'Work is in progress.' },
  { key: 'requires_materials', label: 'Issue requires additional materials.' },
  { key: 'resolved_verify', label: 'Issue resolved. Please verify.' }
];

const CITIZEN_TEMPLATES = [
  { key: 'still_not_resolved', label: 'Issue still not resolved.' },
  { key: 'additional_info', label: 'Additional information provided.' },
  { key: 'check_area', label: 'Please check this area.' },
  { key: 'thank_you', label: 'Thank you.' }
];

export default function ComplaintChatPanel({ complaint, role, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templateKey, setTemplateKey] = useState('');
  const [notes, setNotes] = useState('');
  const [panelWidth, setPanelWidth] = useState(420);
  const [resizing, setResizing] = useState(false);
  const [statusMap, setStatusMap] = useState({});
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const startXRef = useRef(0);
  const startWRef = useRef(420);

  const templates = role === 'field-officer' ? FIELD_OFFICER_TEMPLATES : CITIZEN_TEMPLATES;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const load = async () => {
      try {
        const res = await fetch(`${dataService.apiBaseUrl}/chat/${complaint._id || complaint.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setMessages(data.messages);
      } finally {
        setLoading(false);
      }
    };
    load();
    if (!socketRef.current) {
      dataService.initializeSocket(token);
      socketRef.current = dataService.socket;
    }
    socketRef.current.emit('joinComplaint', complaint._id || complaint.id);
    socketRef.current.emit('markComplaintMessagesSeen', { complaintId: complaint._id || complaint.id });
    socketRef.current.off('newMessage');
    socketRef.current.on('newMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderRole === role) {
        setStatusMap((prev) => ({ ...prev, [String(msg._id)]: 'delivered' }));
      }
    });
    socketRef.current.off('messageStatusUpdate');
    socketRef.current.on('messageStatusUpdate', (payload) => {
      const ids = new Set(payload.ids || []);
      const status = payload.status;
      if (!status) return;
      setStatusMap((prev) => {
        const next = { ...prev };
        ids.forEach((id) => { next[String(id)] = status; });
        return next;
      });
    });
    return () => {};
  }, [complaint, role]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if ((!templateKey && !notes) || !socketRef.current) return;
    const payload = {
      complaintId: complaint._id || complaint.id,
      templateKey: templateKey || 'custom_message',
      notes
    };
    setNotes('');
    socketRef.current.emit('sendMessage', payload);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onResizeStart = (e) => {
    setResizing(true);
    startXRef.current = e.clientX;
    startWRef.current = panelWidth;
    document.addEventListener('mousemove', onResizing);
    document.addEventListener('mouseup', onResizeEnd, { once: true });
  };

  const onResizing = (e) => {
    if (!resizing) return;
    const delta = startXRef.current - e.clientX;
    const newW = Math.min(Math.max(startWRef.current + delta, 300), window.innerWidth);
    setPanelWidth(newW);
  };

  const onResizeEnd = () => {
    setResizing(false);
    document.removeEventListener('mousemove', onResizing);
  };

  return (
    <div className={`chat-panel-overlay active`}>
      <div className="chat-panel" style={{ width: panelWidth }}>
        <div className="chat-panel-resize" onMouseDown={onResizeStart} />
        <div className="chat-header">
          <div className="chat-header-title">
            <span className="title">Chat with {role === 'field-officer' ? 'Citizen' : 'Field Officer'}</span>
            <span className="subtitle">{complaint.complaintId || complaint.id}</span>
          </div>
          <div className="chat-actions">
            <button className="chat-action-btn" aria-label="Add"><i className="fas fa-plus"></i></button>
            <button className="chat-action-btn" aria-label="Options"><i className="fas fa-ellipsis-h"></i></button>
            <button className="chat-close" aria-label="Close" onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>

        <div className="chat-messages" aria-live="polite">
          {loading && <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading...</div>}
          {!loading && messages.map((m, idx) => {
            const mine = m.senderRole === role;
            const status = statusMap[String(m._id)] || '';
            const prev = messages[idx - 1];
            const curDay = new Date(m.createdAt).toDateString();
            const prevDay = prev ? new Date(prev.createdAt).toDateString() : null;
            const label = new Date(m.createdAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
            const avatar = m.senderRole === 'citizen' ? 'C' : 'F';
            return (
              <div key={m._id} className="chat-group">
                {(!prev || curDay !== prevDay) && (
                  <div className="date-divider">{label}</div>
                )}
                <div className={`chat-row ${mine ? 'me' : 'them'}`}>
                  {!mine && <div className="message-avatar" aria-hidden>{avatar}</div>}
                  <div className="chat-bubble">
                    {m.text}
                    <div className="chat-time">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {mine && status && <span className="chat-status">• {status}</span>}
                    </div>
                  </div>
                  {mine && <div className="message-avatar" aria-hidden>{avatar}</div>}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="chat-composer">
          <div className="composer-grid">
            <div className="quick-bubbles" role="list">
              {templates.map((t) => (
                <button
                  key={t.key}
                  role="listitem"
                  type="button"
                  className={`quick-bubble ${templateKey === t.key ? 'selected' : ''}`}
                  onClick={() => setTemplateKey(t.key)}
                  aria-pressed={templateKey === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="composer-row">
              <textarea
                className="composer-notes"
                aria-label="Additional notes"
                placeholder="Type a message..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <button className="composer-send" onClick={send} aria-label="Send message" disabled={!templateKey && !notes}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
            <div className="composer-meta">
              <span>Enter to send • Shift+Enter for newline</span>
              <span>Structured messaging enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
