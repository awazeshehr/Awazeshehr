import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './DirectChatModal.css';
import dataService from '../services/dataService';

export default function DirectChatModal({ recipient, onClose, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [justOpened, setJustOpened] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Load existing messages
    const loadMessages = async () => {
      try {
        const res = await fetch(`${dataService.apiBaseUrl}/chat/direct/${recipient._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();

    // Connect Socket using shared dataService socket (ensures base detection)
    if (!socketRef.current) {
      dataService.initializeSocket(token);
      socketRef.current = dataService.socket;
    }

    socketRef.current.emit('joinDirectChat', recipient._id);
    socketRef.current.emit('markDirectMessagesSeen', { otherUserId: recipient._id });

    socketRef.current.on('newDirectMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (justOpened) {
        socketRef.current.emit('markDirectMessagesSeen', { otherUserId: recipient._id });
      }
    });

    socketRef.current.on('messageStatusUpdate', (payload) => {
      const ids = new Set(payload.ids || []);
      setMessages(prev => prev.map(m => {
        if (ids.has(m._id)) {
          const next = { ...m };
          next.status = payload.status || next.status;
          if (payload.deliveredAt) next.deliveredAt = payload.deliveredAt;
          if (payload.seenAt) next.seenAt = payload.seenAt;
          return next;
        }
        return m;
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('newDirectMessage');
        socketRef.current.off('messageStatusUpdate');
      }
    };
  }, [recipient._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socketRef.current.emit('sendDirectMessage', {
      recipientId: recipient._id,
      text: newMessage
    });
    setNewMessage('');
  };

  return (
    <div className="direct-chat-overlay" onClick={(e) => {
        if (e.target.className === 'direct-chat-overlay') onClose();
    }}>
      <div className="direct-chat-modal">
        <div className="direct-chat-header">
          <div className="user-info">
            <div className="avatar-circle">
              {recipient.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <h3>{recipient.fullName}</h3>
              <span className="status-text">{recipient.email}</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="close-btn" onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>
        
        <div className="direct-chat-messages">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">No messages yet. Start a conversation!</div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderId === currentUser._id;
              const isAdminSender = (msg.senderRole === 'dept-admin')
                || ((currentUser?.role === 'dept-admin') && (msg.senderId === currentUser._id))
                || ((recipient?.role === 'dept-admin') && (msg.senderId === recipient._id));
              const isRight = !isAdminSender;
              const prev = messages[index - 1];
              const curDay = new Date(msg.createdAt).toDateString();
              const prevDay = prev ? new Date(prev.createdAt).toDateString() : null;
              const dayLabel = new Date(msg.createdAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
              const leftAvatarText = isAdminSender
                ? ((currentUser.role === 'dept-admin' ? (currentUser.fullName?.charAt(0) || 'A') : (recipient.fullName?.charAt(0) || 'A')))
                : null;
              const rightAvatarText = !isAdminSender
                ? ((currentUser.role === 'field-officer' ? (currentUser.fullName?.charAt(0) || 'F') : (recipient.fullName?.charAt(0) || 'F')))
                : null;
              return (
                <div key={index}>
                  {(!prev || curDay !== prevDay) && <div className="date-divider">{dayLabel}</div>}
                  <div className={`message-row ${isRight ? 'me' : 'them'}`}>
                    {!isRight && <div className="avatar-small">{leftAvatarText || 'A'}</div>}
                    <div className={`message-bubble ${isRight ? 'me' : 'them'}`}>
                      <div className="message-text">{msg.text}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className={`message-ticks ${msg.status === 'seen' ? 'seen' : msg.status === 'delivered' ? 'delivered' : 'sent'}`}>
                            <i className="fas fa-check"></i>
                            <i className="fas fa-check"></i>
                          </span>
                        )}
                      </div>
                    </div>
                    {isRight && <div className="avatar-small">{rightAvatarText || 'F'}</div>}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="direct-chat-input" onSubmit={handleSend}>
          <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
          <button type="submit" disabled={!newMessage.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
}
