import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

let _addToast = null;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = '') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  _addToast = addToast;

  return (
    <>
      {children}
      {createPortal(
        <div className="toast-container">
          {toasts.map(({ id, msg, type }) => (
            <div key={id} className={`toast ${type}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                {type === 'success' && <path d="M5 8l2 2 4-4" />}
                {type === 'error'   && <><line x1="5" y1="5" x2="11" y2="11" /><line x1="11" y1="5" x2="5" y2="11" /></>}
                {!type && <><line x1="8" y1="5" x2="8" y2="9" /><circle cx="8" cy="11" r="0.6" fill="white" /></>}
              </svg>
              {msg}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export function showToast(msg, type = '') {
  if (_addToast) _addToast(msg, type);
}
