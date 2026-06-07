export class CcafToast extends HTMLElement {
  private container: HTMLElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
        }
        .toast {
          background: var(--surface-2, #2c2f33);
          border-left: 4px solid var(--accent, #f39c12);
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          font-family: var(--font-main, sans-serif);
          font-size: 0.9rem;
          opacity: 0;
          transform: translateY(20px);
          animation: slideIn 0.3s forwards;
        }
        .toast.error { border-left-color: #e74c3c; }
        .toast.success { border-left-color: #2ecc71; }
        @keyframes slideIn {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideOut {
          to { opacity: 0; transform: translateY(20px); }
        }
      </style>
      <div class="toast-container" id="container" role="alert" aria-live="assertive"></div>
    `;
    this.container = this.shadowRoot!.getElementById('container') as HTMLElement;
  }

  show(msg: string, type: 'info' | 'error' | 'success' = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'slideOut 0.3s forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
}
customElements.define('ccaf-toast', CcafToast);

export function showToast(msg: string, type: 'info' | 'error' | 'success' = 'info') {
  let toastEl = document.querySelector('ccaf-toast') as CcafToast;
  if (!toastEl) {
    toastEl = document.createElement('ccaf-toast') as CcafToast;
    document.body.appendChild(toastEl);
  }
  toastEl.show(msg, type);
}
