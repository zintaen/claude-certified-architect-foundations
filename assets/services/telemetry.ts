import { showToast } from '../components/toast';

export class TelemetryService {
  private focusLosses = 0;
  private isProctorMode = false;
  private devToolsOpen = false;
  private active = false;

  public onViolation?: (reason: string) => void;

  constructor() {
    this.initFocusTracking();
    this.initKeyboardTracking();
    this.initDevToolsTracking();
    this.initMouseTracking();
  }

  start(proctorMode: boolean) {
    this.active = true;
    this.isProctorMode = proctorMode;
    this.focusLosses = 0;
    this.devToolsOpen = false;
  }

  stop() {
    this.active = false;
    this.isProctorMode = false;
    document.body.classList.remove('tab-hidden');
  }

  getFocusLosses() {
    return this.focusLosses;
  }

  private initMouseTracking() {
    const prevent = (e: Event) => {
      if (this.active && this.isProctorMode) e.preventDefault();
    };
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('dragstart', prevent);
    document.addEventListener('selectstart', prevent);
  }

  private initFocusTracking() {
    document.addEventListener('visibilitychange', () => {
      if (!this.active) return;
      if (document.hidden) {
        document.body.classList.add('tab-hidden');
        this.focusLosses++;
        if (this.isProctorMode && this.focusLosses > 3) {
          this.triggerViolation('Too many tab switches');
        }
      } else {
        document.body.classList.remove('tab-hidden');
      }
    });

    window.addEventListener('blur', () => {
      if (!this.active) return;
      document.body.classList.add('tab-hidden');
      this.focusLosses++;
      if (this.isProctorMode && this.focusLosses > 3) {
        this.triggerViolation('Too many window focus losses');
      }
    });

    window.addEventListener('focus', () => {
      document.body.classList.remove('tab-hidden');
    });

    document.addEventListener('mouseleave', () => {
      if (!this.active || !this.isProctorMode) return;
      console.warn('Mouse left the exam window');
    });
  }

  private initKeyboardTracking() {
    window.addEventListener('keydown', (e) => {
      if (!this.active || !this.isProctorMode) return;
      
      // Prevent copy/paste/print
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
        showToast('Keyboard shortcuts are disabled during proctored exams', 'error');
      }
      
      // Prevent F12 / DevTools
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        this.triggerViolation('Developer Tools shortcut detected');
      }
    });
  }

  private initDevToolsTracking() {
    const check = () => {
      if (!this.active) return;
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        if (!this.devToolsOpen && this.isProctorMode) {
          this.devToolsOpen = true;
          this.triggerViolation('Developer Tools opened');
        }
      } else {
        this.devToolsOpen = false;
      }
    };
    setInterval(check, 1000);
  }

  private triggerViolation(reason: string) {
    showToast(`Proctor Mode Violation: ${reason}. Your exam is terminated.`, 'error');
    if (this.onViolation) this.onViolation(reason);
  }
}

export const telemetry = new TelemetryService();
