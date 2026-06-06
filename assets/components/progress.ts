export class CcafProgress extends HTMLElement {
  static get observedAttributes() { return ['total', 'answered']; }

  private bar: HTMLElement;
  private label: HTMLElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = `
      <style>
        .progress-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 10px 0;
        }
        .progress-track {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--blue, #00bbff);
          transition: width 0.3s ease;
        }
        .progress-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.6);
        }
      </style>
      <div class="progress-wrapper">
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">0 / 0 answered</div>
      </div>
    `;
    this.bar = this.shadowRoot!.querySelector('.progress-fill') as HTMLElement;
    this.label = this.shadowRoot!.querySelector('.progress-text') as HTMLElement;
  }

  attributeChangedCallback() {
    this.update();
  }

  update() {
    const total = parseInt(this.getAttribute('total') || '0', 10);
    const answered = parseInt(this.getAttribute('answered') || '0', 10);
    const pct = total ? Math.round((answered / total) * 100) : 0;
    this.bar.style.width = `${pct}%`;
    this.label.textContent = `${answered} / ${total} answered`;
  }
}
customElements.define('ccaf-progress', CcafProgress);
