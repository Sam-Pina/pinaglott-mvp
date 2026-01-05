import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from 'lucide-react';

const LANGUAGES = {
  'pt': { code: 'pt', name: 'Português', flag: '🇧🇷' },
  'en': { code: 'en', name: 'Inglês', flag: '🇺🇸' },
  'es': { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
  'fr': { code: 'fr', name: 'Francês', flag: '🇫🇷' }
};

export default function LanguageSelector({ 
  inputLanguage, 
  outputLanguage, 
  onInputLanguageChange, 
  onOutputLanguageChange 
}) {
  const showWarning = inputLanguage && outputLanguage && inputLanguage === outputLanguage;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Idioma de Entrada
          </label>
          <Select value={inputLanguage} onValueChange={onInputLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LANGUAGES).map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:block text-gray-400 mt-6">→</div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Idioma de Saída
          </label>
          <Select value={outputLanguage} onValueChange={onOutputLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LANGUAGES).map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showWarning && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <span className="text-sm text-orange-700">
            Selecione idiomas diferentes para criar flashcards eficazes.
          </span>
        </div>
      )}
    </div>
  );
}

export { LANGUAGES };