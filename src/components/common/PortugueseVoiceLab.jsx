import React, { useState, useEffect } from 'react';
import { Volume2, Square, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getPortugueseVoices,
  getPortuguesePreferences,
  setPortuguesePreferences,
  subscribeVoices,
  subscribe,
  speak,
  cancelSpeech,
  loadVoices,
  PORTUGUESE_TEST_PHRASES,
  PORTUGUESE_TUNING_PRESETS,
} from '@/lib/speechService';

const LAB_PHRASE = PORTUGUESE_TEST_PHRASES[0];

/**
 * Laboratório de teste de voz em português.
 * Mostra as vozes PT realmente disponíveis e permite comparar configurações
 * (A–E) auditivamente. A naturalidade é escolhida pelo próprio usuário.
 */
export default function PortugueseVoiceLab() {
  const [voices, setVoices] = useState([]);
  const [prefs, setPrefs] = useState(getPortuguesePreferences());
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    loadVoices();
    const unsubscribeVoices = subscribeVoices(() => {
      setVoices(getPortugueseVoices());
      setPrefs(getPortuguesePreferences());
    });
    const unsubscribe = subscribe((currentId) => setSpeakingId(currentId));
    return () => {
      unsubscribeVoices();
      unsubscribe();
    };
  }, []);

  const handlePlay = (id, options = {}) => {
    if (speakingId === id) {
      cancelSpeech();
      return;
    }
    speak(LAB_PHRASE, 'pt', { id, mode: 'example', ...options });
  };

  return (
    <div className="border-t border-gray-100 pt-4 space-y-5">
      <div>
        <h4 className="text-sm font-medium text-gray-700">Teste de voz em português</h4>
        <p className="text-xs text-gray-400 mt-1">
          Ouça cada voz disponível e escolha a que soa mais natural para você.
        </p>
      </div>

      <div className="space-y-2">
        {voices.length === 0 ? (
          <p className="text-xs text-gray-400">
            Nenhuma voz em português encontrada neste dispositivo.
          </p>
        ) : (
          voices.map((voice) => {
            const id = `lab-voice-${voice.name}`;
            const playing = speakingId === id;
            const selected = prefs.preferredPortugueseVoice === voice.name;
            return (
              <div
                key={voice.name}
                className="flex items-center gap-2 bg-gray-50 rounded-md p-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{voice.name}</p>
                  <p className="text-xs text-gray-400">
                    {voice.lang}
                    {voice.localService ? ' · local' : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlay(id)}
                  className="h-8 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  {playing
                    ? <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                    : <Volume2 className="w-3.5 h-3.5 mr-1" />}
                  {playing ? 'Parar' : 'Ouvir'}
                </Button>
                <Button
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPortuguesePreferences({ preferredPortugueseVoice: voice.name })}
                  className={`h-8 shrink-0 ${selected ? 'bg-green-600 hover:bg-green-700' : 'border-gray-200'}`}
                >
                  {selected ? <Check className="w-3.5 h-3.5 mr-1" /> : null}
                  {selected ? 'Selecionada' : 'Mais natural'}
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">
          Comparar configurações
        </p>
        <div className="grid grid-cols-1 gap-2">
          {PORTUGUESE_TUNING_PRESETS.map((preset) => {
            const id = `lab-preset-${preset.id}`;
            const playing = speakingId === id;
            const selected =
              prefs.preferredPortugueseSpeechRate === preset.rate &&
              prefs.preferredPortuguesePitch === preset.pitch;
            return (
              <div
                key={preset.id}
                className="flex items-center gap-2 bg-gray-50 rounded-md p-2"
              >
                <span className="w-6 text-sm font-semibold text-gray-600">{preset.id}</span>
                <p className="flex-1 text-xs text-gray-500">
                  velocidade {preset.rate.toFixed(2)} · tom {preset.pitch.toFixed(2)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlay(id, { rate: preset.rate, pitch: preset.pitch })}
                  className="h-8 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  {playing
                    ? <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                    : <Volume2 className="w-3.5 h-3.5 mr-1" />}
                  {playing ? 'Parar' : 'Ouvir'}
                </Button>
                <Button
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setPortuguesePreferences({
                      preferredPortugueseSpeechRate: preset.rate,
                      preferredPortuguesePitch: preset.pitch,
                      preferredPortugueseMode: 'natural',
                    })
                  }
                  className={`h-8 shrink-0 ${selected ? 'bg-green-600 hover:bg-green-700' : 'border-gray-200'}`}
                >
                  {selected ? <Check className="w-3.5 h-3.5 mr-1" /> : null}
                  {selected ? 'Selecionada' : 'Mais natural'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}