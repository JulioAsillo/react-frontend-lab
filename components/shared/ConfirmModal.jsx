"use client";

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-icon">⚠</div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="modal-btn modal-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="modal-btn modal-confirm" onClick={onConfirm}>
            Sí, continuar
          </button>
        </div>
      </div>
    </div>
  );
}