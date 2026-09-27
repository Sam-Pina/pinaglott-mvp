// Serviço central de pronúncia — usa SOMENTE recursos nativos do navegador
// (window.speechSynthesis / SpeechSynthesisUtterance). Nenhuma API externa,
// nenhum custo, nenhum arquivo de áudio gerado ou armazenado.

export const LANGUAGE_CONFIG = {
  pt: { primary: 'pt-BR', fallbacks: ['pt-PT', 'pt'], rate: 0.90, pitch: 1.0, name: 'Português' },
  en: { primary: 'en-US', fallbacks: ['en-GB', 'en'], rate: 0.88, pitch: 1.0, name: 'Inglês' },
  es: { primary: 'es-ES', fallbacks: ['es-MX', 'es'], rate: 0.90, pitch: 1.0, name: 'Espanhol' },
  fr: { primary: 'fr-FR', fallbacks: ['fr'], rate: 0.88, pitch: 1.0, name: 'Francês' },
};

// Nomes de vozes consideradas de melhor qualidade por idioma.
const PREFERRED_VOICE_NAMES = {
  pt: ['Google português do Brasil', 'Microsoft Maria', 'Microsoft Francisca', 'Luciana', 'Joana'],
  en: ['Google US English', 'Google UK English Female', 'Google UK English Male', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Alex'],
  es: ['Google español', 'Microsoft Helena', 'Microsoft Sabina', 'Microsoft Laura', 'Monica', 'Jorge'],
  fr: ['Google français', 'Microsoft Hortense', 'Microsoft Julie', 'Amelie', 'Thomas'],
};

let cachedVoices = [];
let currentUtterance = null;
let currentId = null;
const listeners = new Set();

function emit() {
  listeners.forEach((cb) => cb(currentId));
}

// Permite que componentes saibam qual pronúncia está tocando no momento.
export function subscribe(cb) {
  listeners.add(cb);
  cb(currentId);
  return () => { listeners.delete(cb); };
}

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Converte qualquer código (pt-BR, en-US, es, ...) para o idioma base.
export function normalizeLangCode(code) {
  const lower = String(code || '').toLowerCase();
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  return 'en';
}

function readVoices() {
  if (!isSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) cachedVoices = voices;
  return cachedVoices;
}

// As vozes podem carregar de forma assíncrona — nunca assumir que já existem.
export function loadVoices() {
  if (!isSupported()) return [];
  const voices = readVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => { readVoices(); };
  }
  return voices;
}

export function getVoices() {
  return readVoices();
}

// Seleciona a melhor voz disponível: idioma exato → região → nome → prefixo.
export function getBestVoice(language) {
  const lang = normalizeLangCode(language);
  const config = LANGUAGE_CONFIG[lang];
  const voices = readVoices();
  if (!voices.length) return null;
  const codes = [config.primary, ...config.fallbacks];
  const norm = (v) => v.lang.replace('_', '-').toLowerCase();

  for (const code of codes) {
    const matches = voices.filter((v) => norm(v) === code.toLowerCase());
    if (matches.length) {
      const named = matches.find((v) =>
        PREFERRED_VOICE_NAMES[lang].some((n) => v.name.toLowerCase().includes(n.toLowerCase()))
      );
      return named || matches[0];
    }
  }

  const byName = voices.find((v) =>
    normalizeLangCode(v.lang) === lang &&
    PREFERRED_VOICE_NAMES[lang].some((n) => v.name.toLowerCase().includes(n.toLowerCase()))
  );
  if (byName) return byName;

  const byPrefix = voices.find((v) => norm(v).startsWith(config.primary.slice(0, 2)));
  if (byPrefix) return byPrefix;

  return voices.find((v) => normalizeLangCode(v.lang) === lang) || null;
}

// Se as vozes ainda não carregaram, não bloqueia (o navegador decide).
export function hasVoiceForLanguage(language) {
  const voices = readVoices();
  if (!voices.length) return true;
  return !!getBestVoice(language);
}

export function cancelSpeech() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  currentId = null;
  emit();
}

// Fala um texto (palavra ou frase completa) no idioma informado.
export function speak(text, language, options = {}) {
  if (!isSupported() || !text) return null;
  window.speechSynthesis.cancel();

  const lang = normalizeLangCode(language);
  const config = LANGUAGE_CONFIG[lang];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = config.primary;
  utterance.rate = options.rate ?? config.rate;
  utterance.pitch = options.pitch ?? config.pitch;
  utterance.volume = options.volume ?? 1;

  const voice = getBestVoice(lang);
  if (voice) utterance.voice = voice;

  const id = options.id ?? null;

  utterance.onend = () => {
    if (currentUtterance === utterance) { currentUtterance = null; currentId = null; emit(); }
  };
  utterance.onerror = () => {
    if (currentUtterance === utterance) { currentUtterance = null; currentId = null; emit(); }
  };

  currentUtterance = utterance;
  currentId = id;
  emit();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

if (isSupported()) {
  loadVoices();
}