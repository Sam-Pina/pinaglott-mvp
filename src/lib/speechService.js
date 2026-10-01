// Serviço central de pronúncia — usa SOMENTE recursos nativos do navegador
// (window.speechSynthesis / SpeechSynthesisUtterance / SpeechSynthesisVoice).
// Nenhuma API externa, nenhum serviço pago, nenhum arquivo de áudio gerado,
// nenhum texto enviado para terceiros. Tudo acontece localmente no dispositivo.

export const LANGUAGE_CONFIG = {
  pt: { primary: 'pt-BR', fallbacks: ['pt', 'pt-PT'], rate: 0.98, pitch: 1.02, volume: 1.0, name: 'Português' },
  en: { primary: 'en-US', fallbacks: ['en-GB', 'en'], rate: 0.88, pitch: 1.0, volume: 1.0, name: 'Inglês' },
  es: { primary: 'es-ES', fallbacks: ['es-MX', 'es'], rate: 0.90, pitch: 1.0, volume: 1.0, name: 'Espanhol' },
  fr: { primary: 'fr-FR', fallbacks: ['fr'], rate: 0.88, pitch: 1.0, volume: 1.0, name: 'Francês' },
};

// Configuração DEFINITIVA do Português Brasileiro.
// Velocidade 0.98 e tom 1.02 — aplicada automaticamente em todo o app.
export const PORTUGUESE_BR_DEFAULT = {
  voiceName: 'Microsoft Daniel - Portuguese (Brazil)',
  language: 'pt-BR',
  rate: 0.98,
  pitch: 1.02,
  volume: 1.0,
};

// Função central de configuração do português — nenhum componente duplica valores.
export function getPortugueseSpeechConfig() {
  return { ...PORTUGUESE_BR_DEFAULT };
}

// Nomes de vozes preferidas para os demais idiomas (inalterado).
const PREFERRED_VOICE_NAMES = {
  en: ['Google US English', 'Google UK English Female', 'Google UK English Male', 'Microsoft David', 'Microsoft Zira', 'Samantha', 'Alex'],
  es: ['Google español', 'Microsoft Helena', 'Microsoft Sabina', 'Microsoft Laura', 'Monica', 'Jorge'],
  fr: ['Google français', 'Microsoft Hortense', 'Microsoft Julie', 'Amelie', 'Thomas'],
};

let cachedVoices = [];
let voicesVersion = 0;
let voicesBound = false;
let currentUtterance = null;
let currentId = null;

let ptVoiceCache = null;
let ptVoiceCacheKey = null;

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
  if (!voicesBound) {
    voicesBound = true;
    window.speechSynthesis.onvoiceschanged = () => {
      readVoices();
      voicesVersion++;
      ptVoiceCache = null;
      ptVoiceCacheKey = null;
    };
    // Alguns navegadores só preenchem a lista após um pequeno atraso.
    let attempts = 0;
    const retry = () => {
      if (readVoices().length > 0 || attempts >= 12) return;
      attempts++;
      setTimeout(retry, 250);
    };
    retry();
  }
  return voices;
}

export function getVoices() {
  return readVoices();
}

// ---------------------------------------------------------------------------
// Seleção automática da voz em Português Brasileiro
// ---------------------------------------------------------------------------

// Pontua cada voz portuguesa. Prioridade:
// 1) "Daniel" + pt-BR   2) outra voz pt-BR   3) voz em português.
// Vozes online/cloud são penalizadas — queremos a voz local do dispositivo.
export function scorePortugueseVoice(voice) {
  if (!voice) return -Infinity;
  const lang = String(voice.lang || '').replace('_', '-').toLowerCase();
  const name = String(voice.name || '').toLowerCase();
  const flatName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let score = 0;
  if (lang === 'pt-br') score += 100;
  else if (lang.startsWith('pt')) score += 40;

  if (voice.localService === true) score += 20;
  if (flatName.includes('daniel')) score += 60;

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

// Procura "Microsoft Daniel - Portuguese (Brazil)" tolerando pequenas
// diferenças de nomenclatura. Nunca retorna voz de outro idioma.
export function getBestPortugueseVoice() {
  const ptVoices = getPortugueseVoices();
  if (!ptVoices.length) return null;

  const key = `${ptVoices.length}|${voicesVersion}`;
  if (ptVoiceCache && ptVoiceCacheKey === key) return ptVoiceCache;

  ptVoiceCache = ptVoices
    .map((v) => ({ v, score: scorePortugueseVoice(v) }))
    .sort((a, b) => b.score - a.score)[0].v;
  ptVoiceCacheKey = key;
  return ptVoiceCache;
}

// Seleciona a melhor voz disponível. Português usa a seleção dedicada.
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

// Preserva acentos, cedilha e TODA a pontuação (vírgulas, pontos, !, ?).
// Apenas remove espaços repetidos. O texto exibido nunca é alterado.
export function normalizeForSpeech(text) {
  if (!text) return '';
  return String(text).replace(/\s+/g, ' ').trim();
}

export function cancelSpeech() {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
  currentId = null;
  emit();
}

// Fala um texto no idioma informado.
// - A frase inteira é enviada como UM único SpeechSynthesisUtterance (prosódia preservada).
// - Português usa sempre a configuração definitiva (voz Daniel, 0.98 / 1.02 / 1.00).
// - Palavras isoladas são faladas exatamente como estão, sem texto extra.
// - options.onBoundary recebe o evento nativo 'boundary' (apenas visual; não divide a fala).
export function speak(text, language, options = {}) {
  if (!isSupported() || !text) return null;

  // Nunca permitir falas simultâneas.
  window.speechSynthesis.cancel();

  const lang = normalizeLangCode(language);
  const config = LANGUAGE_CONFIG[lang];
  const isPortuguese = lang === 'pt';

  const clean = normalizeForSpeech(text);
  if (!clean) return null;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = config.primary;

  if (isPortuguese) {
    const pt = getPortugueseSpeechConfig();
    utterance.rate = pt.rate;
    utterance.pitch = pt.pitch;
    utterance.volume = pt.volume;
  } else {
    utterance.rate = options.rate ?? config.rate;
    utterance.pitch = options.pitch ?? config.pitch;
    utterance.volume = options.volume ?? config.volume ?? 1;
  }

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