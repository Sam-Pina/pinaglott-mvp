// Serviço central de pronúncia — usa SOMENTE recursos nativos do navegador
// (window.speechSynthesis / SpeechSynthesisUtterance / SpeechSynthesisVoice).
// Nenhuma API externa, nenhum serviço pago, nenhum arquivo de áudio gerado,
// nenhum texto enviado para terceiros. Tudo acontece localmente no dispositivo.

export const LANGUAGE_CONFIG = {
  pt: { primary: 'pt-BR', fallbacks: ['pt', 'pt-PT'], rate: 0.98, pitch: 1.0, volume: 1.0, name: 'Português' },
  en: { primary: 'en-US', fallbacks: ['en-GB', 'en'], rate: 0.88, pitch: 1.0, volume: 1.0, name: 'Inglês' },
  es: { primary: 'es-ES', fallbacks: ['es-MX', 'es'], rate: 0.90, pitch: 1.0, volume: 1.0, name: 'Espanhol' },
  fr: { primary: 'fr-FR', fallbacks: ['fr'], rate: 0.88, pitch: 1.0, volume: 1.0, name: 'Francês' },
};

// Perfil "Português Natural" — ponto de partida próximo da velocidade natural
// da própria voz, evitando a sensação de leitura mecânica.
export const PORTUGUESE_CONFIG = {
  language: 'pt-BR',
  fallbackLanguages: ['pt', 'pt-PT'],
  preferredVoices: ['Francisca', 'Antônio', 'Antonio'],
  preferredLocalService: true,
  rate: 0.98,
  pitch: 1.0,
  volume: 1.0,
  slowRate: 0.90,
  // Frase de contexto usada APENAS como fallback explícito — nunca automático.
  contextPrefix: 'A palavra é',
};

// Frases de teste do laboratório de voz (item 8).
export const PORTUGUESE_TEST_PHRASES = [
  'Olá! Vamos aprender novas palavras em português.',
  'Hoje eu vou estudar inglês, espanhol e francês.',
  'Aprender novas palavras todos os dias ajuda a desenvolver o vocabulário.',
];

// Configurações de comparação auditiva (item 9).
export const PORTUGUESE_TUNING_PRESETS = [
  { id: 'A', rate: 1.00, pitch: 1.00 },
  { id: 'B', rate: 0.98, pitch: 1.00 },
  { id: 'C', rate: 0.96, pitch: 1.00 },
  { id: 'D', rate: 1.00, pitch: 0.98 },
  { id: 'E', rate: 0.98, pitch: 1.02 },
];

// Nomes de vozes consideradas de melhor qualidade por idioma (EN/ES/FR mantidos como estavam).
const PREFERRED_VOICE_NAMES = {
  en: ['Google US English', 'Google UK English Female', 'Google UK English Male', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Alex'],
  es: ['Google español', 'Microsoft Helena', 'Microsoft Sabina', 'Microsoft Laura', 'Monica', 'Jorge'],
  fr: ['Google français', 'Microsoft Hortense', 'Microsoft Julie', 'Amelie', 'Thomas'],
};

const PT_PREFS_KEY = 'pinaglott_pt_voice_prefs';
const DEFAULT_PT_PREFS = {
  preferredPortugueseVoice: 'auto',
  preferredPortugueseSpeechRate: 0.98,
  preferredPortuguesePitch: 1.0,
  preferredPortugueseMode: 'natural',
};

let cachedVoices = [];
let voicesVersion = 0;
let voicesBound = false;
let currentUtterance = null;
let currentId = null;

let ptVoiceCache = null;
let ptVoiceCacheKey = null;
let ptPrefs = null;

const listeners = new Set();
const voiceListeners = new Set();

function emit() {
  listeners.forEach((cb) => cb(currentId));
}

function emitVoices() {
  voiceListeners.forEach((cb) => cb());
}

// Permite que componentes saibam qual pronúncia está tocando no momento.
export function subscribe(cb) {
  listeners.add(cb);
  cb(currentId);
  return () => { listeners.delete(cb); };
}

// Permite que a interface reaja quando a lista de vozes do dispositivo muda.
export function subscribeVoices(cb) {
  voiceListeners.add(cb);
  cb();
  return () => { voiceListeners.delete(cb); };
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
  if (!voicesBound) {
    voicesBound = true;
    window.speechSynthesis.onvoiceschanged = () => {
      readVoices();
      voicesVersion++;
      ptVoiceCache = null;
      ptVoiceCacheKey = null;
      emitVoices();
    };
  }
  return voices;
}

export function getVoices() {
  return readVoices();
}

// ---------------------------------------------------------------------------
// Preferências do usuário (persistidas no próprio dispositivo)
// ---------------------------------------------------------------------------

export function getPortuguesePreferences() {
  if (!ptPrefs) {
    try {
      const stored = JSON.parse(localStorage.getItem(PT_PREFS_KEY) || '{}');
      ptPrefs = { ...DEFAULT_PT_PREFS, ...stored };
    } catch (error) {
      ptPrefs = { ...DEFAULT_PT_PREFS };
    }
  }
  return ptPrefs;
}

export function setPortuguesePreferences(partial) {
  ptPrefs = { ...getPortuguesePreferences(), ...partial };
  try {
    localStorage.setItem(PT_PREFS_KEY, JSON.stringify(ptPrefs));
  } catch (error) {
    // Sem persistência — apenas em memória.
  }
  ptVoiceCache = null;
  ptVoiceCacheKey = null;
  emitVoices();
}

// Velocidade efetiva do português: modo lento (estudo) ou perfil natural.
export function getPortugueseRate() {
  const prefs = getPortuguesePreferences();
  if (prefs.preferredPortugueseMode === 'slow') return PORTUGUESE_CONFIG.slowRate;
  return prefs.preferredPortugueseSpeechRate ?? PORTUGUESE_CONFIG.rate;
}

// Compatibilidade com a API anterior.
export function getVoicePreference() {
  return getPortuguesePreferences().preferredPortugueseVoice;
}
export function setVoicePreference(preference) {
  setPortuguesePreferences({ preferredPortugueseVoice: preference || 'auto' });
}

// ---------------------------------------------------------------------------
// Ranking da voz em Português
// ---------------------------------------------------------------------------

// Pontua cada voz portuguesa. Não depende exclusivamente do nome: se o sistema
// expuser nomes diferentes, a pontuação por idioma/localService continua valendo.
export function scorePortugueseVoice(voice) {
  if (!voice) return -Infinity;
  const lang = String(voice.lang || '').replace('_', '-').toLowerCase();
  const name = String(voice.name || '').toLowerCase();
  const flatName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let score = 0;
  if (lang === 'pt-br') score += 100;
  else if (lang.startsWith('pt-br')) score += 80;

  if (voice.localService === true) score += 60;
  if (name.includes('microsoft')) score += 30;
  if (flatName.includes('francisca')) score += 50;
  if (flatName.includes('antonio')) score += name.includes('antônio') ? 45 : 30;

  // Evita vozes online/cloud — queremos voz local do dispositivo.
  if (name.includes('online')) score -= 100;
  if (name.includes('cloud')) score -= 100;
  if (name.includes('azure')) score -= 100;
  if (name.includes('neural')) score -= 100;
  if (name.includes('network')) score -= 100;

  return score;
}

// Todas as vozes realmente disponíveis para português neste dispositivo.
export function getPortugueseVoices() {
  return readVoices().filter((v) => normalizeLangCode(v.lang) === 'pt');
}

function computeBestPortugueseVoice() {
  const ptVoices = getPortugueseVoices();
  if (!ptVoices.length) return null;

  const preference = getPortuguesePreferences().preferredPortugueseVoice;
  if (preference && preference !== 'auto') {
    const chosen = ptVoices.find((v) => v.name === preference);
    if (chosen) return chosen;
  }

  return ptVoices
    .map((v) => ({ v, score: scorePortugueseVoice(v) }))
    .sort((a, b) => b.score - a.score)[0].v;
}

// Função central de seleção — com cache em memória (recalculada só quando as
// vozes do dispositivo mudam ou quando a preferência do usuário muda).
export function getBestPortugueseVoice() {
  const voices = readVoices();
  const key = `${voices.length}|${voicesVersion}|${getPortuguesePreferences().preferredPortugueseVoice}`;
  if (ptVoiceCache && ptVoiceCacheKey === key) return ptVoiceCache;
  ptVoiceCache = computeBestPortugueseVoice();
  ptVoiceCacheKey = key;
  return ptVoiceCache;
}

// Seleciona a melhor voz disponível. Português usa o ranking dedicado.
export function getBestVoice(language) {
  const lang = normalizeLangCode(language);

  if (lang === 'pt') {
    return getBestPortugueseVoice();
  }

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

// ---------------------------------------------------------------------------
// Normalização e fala
// ---------------------------------------------------------------------------

// Normaliza o texto apenas para a fala: remove espaços duplicados e caracteres
// desnecessários, preservando acentos, cedilha, hífens e pontuação.
// O texto exibido ao usuário nunca é alterado.
export function normalizeForSpeech(text) {
  if (!text) return '';
  let value = String(text).replace(/\s+/g, ' ').trim();
  value = value.replace(/[^\p{L}\p{N}\s.,!?;:'"()\-]/gu, '');
  return value.replace(/\s+/g, ' ').trim();
}

export function cancelSpeech() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  currentId = null;
  emit();
}

// Fala um texto no idioma informado.
// - A frase é enviada como UM único SpeechSynthesisUtterance (prosódia preservada).
// - options.mode: 'word' (padrão) | 'example'.
// - options.variant: 'context' usa o fallback "A palavra é X." (nunca automático).
// - options.rate / options.pitch sobrescrevem as preferências (usado no laboratório).
// - options.onBoundary recebe o evento nativo 'boundary' (apenas visual, não divide a fala).
export function speak(text, language, options = {}) {
  if (!isSupported() || !text) return null;

  // Nunca permitir falas simultâneas.
  window.speechSynthesis.cancel();

  const lang = normalizeLangCode(language);
  const config = LANGUAGE_CONFIG[lang];
  const isPortuguese = lang === 'pt';

  const clean = normalizeForSpeech(text);
  if (!clean) return null;

  const mode = options.mode === 'example' ? 'example' : 'word';
  const useContext = isPortuguese && mode === 'word' && options.variant === 'context';
  const spokenText = useContext
    ? `${PORTUGUESE_CONFIG.contextPrefix} ${clean}.`
    : clean;

  const prefs = isPortuguese ? getPortuguesePreferences() : null;

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = config.primary;
  utterance.rate = options.rate ?? (isPortuguese ? getPortugueseRate() : config.rate);
  utterance.pitch = options.pitch ?? (isPortuguese ? prefs.preferredPortuguesePitch : config.pitch);
  utterance.volume = options.volume ?? config.volume ?? 1;

  const voice = getBestVoice(lang);
  if (voice) utterance.voice = voice;

  const id = options.id ?? null;

  if (typeof options.onBoundary === 'function') {
    utterance.onboundary = (event) => options.onBoundary(event);
  }

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