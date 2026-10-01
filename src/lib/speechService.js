// Serviço central de pronúncia — usa SOMENTE recursos nativos do navegador
// (window.speechSynthesis / SpeechSynthesisUtterance / getVoices).
// Nenhuma API externa, nenhum serviço pago, nenhum arquivo de áudio gerado,
// nenhum texto enviado para terceiros. Tudo acontece localmente no dispositivo.

export const LANGUAGE_CONFIG = {
  pt: { primary: 'pt-BR', fallbacks: ['pt', 'pt-PT'], rate: 0.95, pitch: 1.0, volume: 1.0, name: 'Português' },
  en: { primary: 'en-US', fallbacks: ['en-GB', 'en'], rate: 0.88, pitch: 1.0, volume: 1.0, name: 'Inglês' },
  es: { primary: 'es-ES', fallbacks: ['es-MX', 'es'], rate: 0.90, pitch: 1.0, volume: 1.0, name: 'Espanhol' },
  fr: { primary: 'fr-FR', fallbacks: ['fr'], rate: 0.88, pitch: 1.0, volume: 1.0, name: 'Francês' },
};

// Configuração específica do Português Brasileiro (centralizada e fácil de ajustar).
export const PORTUGUESE_CONFIG = {
  language: 'pt-BR',
  // Ordem de preferência de idioma: pt-BR → pt → pt-PT (último recurso).
  fallbackLanguages: ['pt', 'pt-PT'],
  // Vozes naturais preferidas quando o dispositivo as expõe (ex.: Windows/Microsoft).
  preferredVoices: ['Francisca', 'Antônio', 'Antonio'],
  preferredLocalService: true,
  // Fala próxima do natural — nem lenta demais, nem artificial.
  rate: 0.95,
  pitch: 1.0,
  volume: 1.0,
  // Estratégia de contexto para palavras MUITO curtas (ex.: "pé", "sol", "ar").
  // A fala usa "A palavra é X." apenas para a síntese; nada muda visualmente.
  contextPrefix: 'A palavra é',
  contextMaxWordLength: 3,
};

// Nomes de vozes consideradas de melhor qualidade por idioma (EN/ES/FR mantidos como estavam).
const PREFERRED_VOICE_NAMES = {
  en: ['Google US English', 'Google UK English Female', 'Google UK English Male', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Alex'],
  es: ['Google español', 'Microsoft Helena', 'Microsoft Sabina', 'Microsoft Laura', 'Monica', 'Jorge'],
  fr: ['Google français', 'Microsoft Hortense', 'Microsoft Julie', 'Amelie', 'Thomas'],
};

const VOICE_PREF_KEY = 'pinaglott_voice_pref_pt';

let cachedVoices = [];
let voicesVersion = 0;
let voicesBound = false;
let currentUtterance = null;
let currentId = null;

let ptVoiceCache = null;
let ptVoiceCacheKey = null;

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

  if (voice.localService === true) score += 70;

  if (flatName.includes('francisca')) score += 50;
  if (flatName.includes('antonio')) score += name.includes('antônio') ? 45 : 30;
  if (name.includes('microsoft')) score += 20;

  // Evita vozes online/cloud — queremos voz local do dispositivo.
  if (name.includes('online')) score -= 100;
  if (name.includes('cloud')) score -= 100;
  if (name.includes('azure')) score -= 100;
  if (name.includes('neural')) score -= 100;
  if (name.includes('network')) score -= 100;

  return score;
}

// Vozes realmente disponíveis para português neste dispositivo (nunca outras línguas).
export function getPortugueseVoices() {
  return readVoices().filter((v) => normalizeLangCode(v.lang) === 'pt');
}

function computeBestPortugueseVoice() {
  const ptVoices = getPortugueseVoices();
  if (!ptVoices.length) return null;

  const preference = getVoicePreference();
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
  const key = `${voices.length}|${voicesVersion}|${getVoicePreference()}`;
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
// Preferência do usuário (persistida no dispositivo)
// ---------------------------------------------------------------------------

export function getVoicePreference() {
  try {
    return localStorage.getItem(VOICE_PREF_KEY) || 'auto';
  } catch (error) {
    return 'auto';
  }
}

export function setVoicePreference(preference) {
  const value = preference || 'auto';
  try {
    localStorage.setItem(VOICE_PREF_KEY, value);
  } catch (error) {
    // Sem persistência — apenas em memória.
  }
  ptVoiceCache = null;
  ptVoiceCacheKey = null;
  emitVoices();
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
// options.mode: 'word' (padrão) | 'example' — frases de exemplo nunca usam contexto.
// options.variant: 'direct' (padrão) | 'context' — força ou desliga a estratégia.
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

  // Estratégia de contexto apenas para palavras portuguesas muito curtas.
  let useContext = false;
  if (isPortuguese && mode === 'word') {
    if (options.variant === 'context') {
      useContext = true;
    } else if (options.variant === 'direct') {
      useContext = false;
    } else {
      const tokens = clean.split(/\s+/);
      useContext = tokens.length === 1 && tokens[0].length <= PORTUGUESE_CONFIG.contextMaxWordLength;
    }
  }

  const spokenText = useContext
    ? `${PORTUGUESE_CONFIG.contextPrefix} ${clean}.`
    : clean;

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = config.primary;
  utterance.rate = options.rate ?? config.rate;
  utterance.pitch = options.pitch ?? config.pitch;
  utterance.volume = options.volume ?? config.volume ?? 1;

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