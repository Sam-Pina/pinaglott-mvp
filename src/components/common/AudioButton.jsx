import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { speak, cancelSpeech, subscribe, hasVoiceForLanguage, loadVoices } from '@/lib/speechService';

let audioCounter = 0;

/**
 * Botão de pronúncia padronizado em todo o app.
 * Recebe apenas `text` e `language` e cuida de voz, reprodução,
 * interrupção, estado ativo e fallback.
 */
export default function AudioButton({
  text,
  language = 'en',
  label = null,
  variant = 'ghost',
  size = 'icon',
  className,
  iconClassName,
  ariaLabel,
}) {
  const { toast } = useToast();
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = `audio-btn-${audioCounter++}`;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadVoices();
    return subscribe((curId) => setSpeaking(curId === idRef.current));
  }, []);

  const handleClick = (event) => {
    event.stopPropagation();
    if (!text) return;
    if (speaking) {
      cancelSpeech();
      return;
    }
    if (!hasVoiceForLanguage(language)) {
      toast({
        title: 'Voz indisponível',
        description: 'Não encontramos uma voz compatível com este idioma neste navegador.',
      });
      return;
    }
    speak(text, language, { id: idRef.current });
  };

  if (label) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        aria-label={ariaLabel || label}
        className={className}
      >
        {speaking
          ? <Square className="w-4 h-4 mr-2 fill-current" />
          : <Volume2 className="w-4 h-4 mr-2" />}
        {speaking ? 'Parar' : label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel || 'Ouvir pronúncia'}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-2 transition-colors hover:bg-black/5',
        speaking && 'animate-pulse',
        className
      )}
    >
      {speaking
        ? <Square className={cn('w-5 h-5 fill-current', iconClassName)} />
        : <Volume2 className={cn('w-5 h-5', iconClassName)} />}
    </button>
  );
}