import React from 'react';
import { Book, Save, ExternalLink, X, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from '@/entities/User';
import { Word } from '@/entities/Word';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LANGUAGES } from '../language/LanguageSelector';
import AudioButton from '@/components/common/AudioButton';
import { speak } from '@/lib/speechService';

export default function TranslationResult({ word, onSaveFlashcard, onClose }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [hasSavedCard, setHasSavedCard] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        await User.me();
        setIsLoggedIn(true);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleSaveFlashcard = async () => {
    if (!isLoggedIn) {
      await User.login();
      return;
    }

    setIsSaving(true);
    try {
      await Word.create({
        input_word: word.input_word,
        output_translation: word.output_translation,
        input_language: word.input_language,
        output_language: word.output_language,
        definition: word.definition,
        definition_translation: word.definition_translation, // Added definition_translation
        example: word.example,
        example_translation: word.example_translation,
        image_url: word.image_url,
        audio_url: word.audio_url,
        category: word.category || 'basic',
        // Campos de compatibilidade
        english: word.english || word.input_word,
        portuguese: word.portuguese || word.output_translation
      });
      
      const userData = await User.me();
      
      const now = new Date();
      const brazilOffset = -3;
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const brazilTime = new Date(utc + (brazilOffset * 3600000));
      const today = brazilTime.toISOString().split('T')[0];
      
      const lastAdditionDate = userData.last_addition_date;

      let newCount = 1;
      if (lastAdditionDate === today) {
        newCount = (userData.words_added_today || 0) + 1;
      }

      await User.updateMyUserData({
        words_added_today: newCount,
        last_addition_date: today
      });

      setSaved(true);
      setHasSavedCard(true);

      // Disparar evento para atualizar o dashboard
      localStorage.setItem('flashcard_updated', Date.now().toString());
      window.dispatchEvent(new Event('storage'));

      if (onSaveFlashcard) onSaveFlashcard(word);
    } catch (error) {
      console.error("Erro ao salvar flashcard:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToFlashcards = () => {
    navigate(createPageUrl("Flashcards"));
    onClose();
  };

  if (!word) return null;

  const inputLang = LANGUAGES[word.input_language] || LANGUAGES['en'];
  const outputLang = LANGUAGES[word.output_language] || LANGUAGES['pt'];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-sm">
      <Card className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1 sm:mb-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{word.input_word}</h2>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">{inputLang.flag}</span>
                  <AudioButton
                    text={word.input_word}
                    language={word.input_language}
                    className="text-blue-600 hover:bg-blue-100"
                    iconClassName="w-[18px] h-[18px]"
                    ariaLabel="Ouvir pronúncia"
                  />
                </div>
                {word.part_of_speech && (
                  <Badge variant="outline" className="text-gray-500 text-xs sm:text-sm py-0.5 px-1.5 sm:py-1 sm:px-2">
                    {word.part_of_speech}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg sm:text-xl text-indigo-700">{word.output_translation}</p>
                <span className="text-sm text-gray-500">{outputLang.flag}</span>
                <AudioButton
                  text={word.output_translation}
                  language={word.output_language}
                  className="text-indigo-600 hover:bg-indigo-100"
                  iconClassName="w-[18px] h-[18px]"
                  ariaLabel="Ouvir tradução"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-700 text-xs sm:text-sm py-0.5 px-1.5 sm:py-1 sm:px-2">
                  {inputLang.name} → {outputLang.name}
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 text-xs sm:text-sm py-0.5 px-1.5 sm:py-1 sm:px-2 capitalize">
                  {word.category || 'basic'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-h-[calc(80vh-200px)] sm:max-h-[calc(80vh-180px)] overflow-y-auto">
          <div className="space-y-4 sm:space-y-6">

            {/* Imagem */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-xs h-48 sm:h-64 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                {word.image_url ? (
                  <img
                    src={word.image_url}
                    alt={word.input_word}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageOff size={48} />
                    <p className="mt-2 text-sm">Imagem não disponível</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Exemplo */}
            {word.example && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 text-sm sm:text-base">Exemplo:</h3>
                  <AudioButton
                    text={word.example}
                    language={word.input_language}
                    mode="example"
                    className="text-gray-600 hover:bg-gray-100"
                    iconClassName="w-4 h-4"
                    ariaLabel="Ouvir exemplo"
                  />
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100 text-sm sm:text-base">
                  <p className="text-gray-700">"{word.example}"</p>
                  {word.example_translation && (
                    <p className="text-gray-500 italic mt-2 flex items-center gap-1">
                      "{word.example_translation}"
                      <AudioButton
                        text={word.example_translation}
                        language={word.output_language}
                        mode="example"
                        className="text-gray-500 hover:bg-gray-100"
                        iconClassName="w-4 h-4"
                        ariaLabel="Ouvir tradução do exemplo"
                      />
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Definição */}
            {word.definition && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-700 text-sm sm:text-base">Definição:</h3>
                  <AudioButton
                    text={word.definition}
                    language={word.input_language}
                    mode="example"
                    className="text-gray-600 hover:bg-gray-100"
                    iconClassName="w-4 h-4"
                    ariaLabel="Ouvir definição"
                  />
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100 text-sm sm:text-base">
                  <p className="text-gray-700">{word.definition}</p>
                  {word.definition_translation && (
                    <p className="text-gray-500 italic mt-2 flex items-center gap-1">
                      "{word.definition_translation}"
                      <AudioButton
                        text={word.definition_translation}
                        language={word.output_language}
                        mode="example"
                        className="text-gray-500 hover:bg-gray-100"
                        iconClassName="w-4 h-4"
                        ariaLabel="Ouvir tradução da definição"
                      />
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sinônimos */}
            {word.synonyms && word.synonyms.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-700 text-sm sm:text-base">Sinônimos:</h3>
                <div className="flex flex-wrap gap-2">
                  {word.synonyms.map((synonym, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer text-xs sm:text-sm py-1 px-2"
                      onClick={() => speak(synonym, word.input_language)}
                    >
                      {synonym}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-200 flex-1 sm:flex-none h-11 text-sm sm:text-base"
            >
              Cancelar
            </Button>
            {!saved && (
              <Button
                onClick={handleSaveFlashcard}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none h-11 text-sm sm:text-base"
              >
                <Book className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Flashcard'}
              </Button>
            )}
            {saved && (
              <Button
                disabled
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none h-11 text-sm sm:text-base"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvo!
              </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {hasSavedCard && (
              <Button
                onClick={handleGoToFlashcards}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto h-11 text-sm sm:text-base"
              >
                Ver meus Flashcards
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}