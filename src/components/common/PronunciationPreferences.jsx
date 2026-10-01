import React, { useState, useEffect } from 'react';
import { Volume2, Square, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  getPortugueseVoices,
  getPortuguesePreferences,
  setPortuguesePreferences,
  subscribeVoices,
  subscribe,
  speak,
  cancelSpeech,
  loadVoices,
  isSupported,
  PORTUGUESE_TEST_PHRASES,
} from '@/lib/speechService';
import PortugueseVoiceLab from './PortugueseVoiceLab';

const TEST_ID = 'pronunciation-voice-test';

/**
 * Preferências de pronúncia em Português (Perfil).
 * Voz, modo (Natural / Falar devagar) e frases de teste — tudo local ao dispositivo.
 */
export default function PronunciationPreferences() {
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

  if (!isSupported()) return null;

  const isSlow = prefs.preferredPortugueseMode === 'slow';
  const selectValue = voices.some((v) => v.name === prefs.preferredPortugueseVoice)
    ? prefs.preferredPortugueseVoice
    : 'auto';

  const handlePlay = (id, text) => {
    if (speakingId === id) {
      cancelSpeech();
      return;
    }
    speak(text, 'pt', { id, mode: 'example' });
  };

  return (
    <div className="border-t border-gray-100 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-medium text-gray-700">Preferências de pronúncia</h4>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-500 block mb-2">
          Voz em Português
        </label>
        <Select
          value={selectValue}
          onValueChange={(value) => setPortuguesePreferences({ preferredPortugueseVoice: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automática (melhor voz disponível)</SelectItem>
            {voices.map((voice) => (
              <SelectItem key={voice.name} value={voice.name}>
                {voice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Falar devagar</p>
          <p className="text-xs text-gray-400">Modo de estudo (ritmo mais lento)</p>
        </div>
        <Switch
          checked={isSlow}
          onCheckedChange={(checked) =>
            setPortuguesePreferences({ preferredPortugueseMode: checked ? 'slow' : 'natural' })
          }
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Frases para teste</p>
        <div className="space-y-2">
          {PORTUGUESE_TEST_PHRASES.map((phrase, index) => {
            const id = `${TEST_ID}-phrase-${index}`;
            const playing = speakingId === id;
            return (
              <div key={id} className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
                <p className="flex-1 text-sm text-gray-700">{phrase}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlay(id, phrase)}
                  className="h-8 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  {playing
                    ? <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                    : <Volume2 className="w-3.5 h-3.5 mr-1" />}
                  {playing ? 'Parar' : 'Ouvir'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <PortugueseVoiceLab />

      <p className="text-xs text-gray-400">
        A pronúncia usa as vozes do seu próprio dispositivo — sem serviços externos.
      </p>
    </div>
  );
}