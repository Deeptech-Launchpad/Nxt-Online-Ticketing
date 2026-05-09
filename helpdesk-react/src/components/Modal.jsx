import { createPortal } from 'react-dom';

export function Modal({ open, title, subtitle, onCancel, onConfirm, confirmText = 'Confirm', confirmClass = 'btn btn-success' }) {
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-sub">{subtitle}</div>
        <div className="modal-actions">
          <button className="btn btn-white" onClick={onCancel}>Cancel</button>
          <button className={confirmClass} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
