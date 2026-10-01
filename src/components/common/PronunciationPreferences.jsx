import React, { useState, useEffect } from 'react';
import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getPortugueseVoices,
  getVoicePreference,
  setVoicePreference,
  subscribeVoices,
  subscribe,
  speak,
  cancelSpeech,
  loadVoices,
  isSupported,
} from '@/lib/speechService';

const TEST_ID = 'pronunciation-voice-test';
const TEST_SENTENCE = 'Olá! Vamos aprender novas palavras em português.';

/**
 * Preferências de pronúncia em Português (Perfil).
 * Mostra apenas vozes realmente disponíveis no dispositivo e permite testá-las.
 */
export default function PronunciationPreferences() {
  const [voices, setVoices] = useState([]);
  const [preference, setPreference] = useState('auto');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadVoices();
    setPreference(getVoicePreference());
    const unsubscribeVoices = subscribeVoices(() => setVoices(getPortugueseVoices()));
    const unsubscribe = subscribe((currentId) => setSpeaking(currentId === TEST_ID));
    return () => {
      unsubscribeVoices();
      unsubscribe();
    };
  }, []);

  if (!isSupported()) return null;

  const handleChange = (value) => {
    setPreference(value);
    setVoicePreference(value);
  };

  const handleTest = () => {
    if (speaking) {
      cancelSpeech();
      return;
    }
    speak(TEST_SENTENCE, 'pt', { id: TEST_ID, mode: 'example' });
  };

  const selectValue = voices.some((v) => v.name === preference) ? preference : 'auto';

  return (
    <div className="border-t border-gray-100 pt-4">
      <label className="text-sm font-medium text-gray-500 block mb-2">
        Voz em Português
      </label>
      <div className="flex items-center gap-2">
        <Select value={selectValue} onValueChange={handleChange}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automática</SelectItem>
            {voices.map((voice) => (
              <SelectItem key={voice.name} value={voice.name}>
                {voice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTest}
          className="h-9 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          {speaking ? (
            <>
              <Square className="w-3.5 h-3.5 mr-1 fill-current" />
              Parar
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 mr-1" />
              Testar voz
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        A pronúncia usa as vozes do seu próprio dispositivo — sem serviços externos.
      </p>
    </div>
  );
}