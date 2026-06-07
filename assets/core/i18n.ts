// assets/core/i18n.ts

type TranslationDictionary = Record<string, string>;

const en: TranslationDictionary = {
  'nav.about': 'About',
  'nav.exam': 'Exam',
  'nav.leaderboard': 'Leaderboard',
  'nav.review': 'Review',
  'nav.login': 'Log in',
  'nav.logout': 'Log out',

  'hero.title': 'Claude Certified Architect',
  'hero.subtitle': 'Foundations — Unofficial Mock Exam',
  'hero.desc':
    'A grueling, production-grade practice exam designed by a certified architect to test your actual mastery of the Claude ecosystem, not just your memorization of the docs.',
  'hero.start': 'Start Mock Exam',

  'glance.title': 'Exam at a glance',
  'glance.p1': 'Taken from the official CCA-F landing page for partner companies.',
  'glance.format': 'Format: Multiple choice, multiple select',
  'glance.duration': 'Duration: 120 minutes',
  'glance.cost': 'Cost: Free (Mock)',
  'glance.lang': 'Languages: English, Spanish',

  'btn.start': 'Start Mock Exam',
  'btn.flashcard': 'Flashcard Mode',

  'footer.creator': 'Creator',
  'footer.legal': 'Legal & Disclaimer',
  'footer.slogan': 'TURN YOUR WILL INTO REAL',
};

const es: TranslationDictionary = {
  'nav.about': 'Acerca de',
  'nav.exam': 'Examen',
  'nav.leaderboard': 'Clasificación',
  'nav.review': 'Revisar',
  'nav.login': 'Iniciar sesión',
  'nav.logout': 'Cerrar sesión',

  'hero.title': 'Arquitecto Certificado de Claude',
  'hero.subtitle': 'Fundamentos — Examen de Práctica no Oficial',
  'hero.desc':
    'Un examen de práctica agotador y de nivel de producción diseñado por un arquitecto certificado para evaluar tu dominio real del ecosistema de Claude, no solo tu memorización de la documentación.',
  'hero.start': 'Iniciar Examen',

  'glance.title': 'El examen de un vistazo',
  'glance.p1': 'Tomado de la página oficial de CCA-F para empresas asociadas.',
  'glance.format': 'Formato: Opción múltiple, selección múltiple',
  'glance.duration': 'Duración: 120 minutos',
  'glance.cost': 'Costo: Gratis (Práctica)',
  'glance.lang': 'Idiomas: Inglés, Español',

  'btn.start': 'Iniciar Examen',
  'btn.flashcard': 'Modo Tarjetas',

  'footer.creator': 'Creador',
  'footer.legal': 'Aviso Legal',
  'footer.slogan': 'CONVIERTE TU VOLUNTAD EN REALIDAD',
};

const dictionaries: Record<string, TranslationDictionary> = { en, es };

let currentLang = 'en';
try {
  currentLang = localStorage.getItem('lang') || 'en';
} catch {
  /* localStorage unavailable */
}

export function setLanguage(lang: string) {
  if (dictionaries[lang]) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    applyTranslations();
  }
}

export function translate(key: string): string {
  const dict = dictionaries[currentLang] || dictionaries['en'];
  return dict[key] || key;
}

export function applyTranslations() {
  const elements = document.querySelectorAll<HTMLElement>('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = translate(key);
    }
  });
}

export function initI18n() {
  applyTranslations();
}
