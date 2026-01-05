
import React, { useState, useEffect } from "react";
import { InvokeLLM, GenerateImage } from "@/integrations/Core";
import { Search as SearchIcon, Loader2, History, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast, ToastContainer } from "@/components/ui/toast";
import TranslationResult from "../components/search/TranslationResult";
import LanguageSelector, { LANGUAGES } from "../components/language/LanguageSelector";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Search() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Novos estados para idiomas
  const [inputLanguage, setInputLanguage] = useState('en');
  const [outputLanguage, setOutputLanguage] = useState('pt');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await User.me();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  const getLanguagePromptName = (languageCode) => {
    const languageNames = {
      'pt': 'Portuguese',
      'en': 'English', 
      'es': 'Spanish',
      'fr': 'French'
    };
    return languageNames[languageCode] || 'English';
  };

  const handleSearch = async (searchTermToSearch) => {
    const currentSearchTerm = searchTermToSearch || searchTerm;
    if (!currentSearchTerm.trim()) return;
    
    // Verificar se os idiomas são diferentes
    if (inputLanguage === outputLanguage) {
      setError("Por favor, selecione idiomas diferentes para entrada e saída.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowResult(false);
    
    try {
      const inputLangName = getLanguagePromptName(inputLanguage);
      const outputLangName = getLanguagePromptName(outputLanguage);
      
      // 1. Obter tradução e definição
      const translationResponse = await InvokeLLM({
        prompt: `Given the word "${currentSearchTerm}" in ${inputLangName}, provide:
                1. The word itself in ${inputLangName} (input_word)
                2. Translation to ${outputLangName} (output_translation)  
                3. Definition of the word in ${inputLangName} (definition)
                3a. Translation of the definition to ${outputLangName} (definition_translation)
                4. An example sentence using the word in ${inputLangName} (example)
                5. Translation of the example sentence to ${outputLangName} (example_translation)
                6. Part of speech in English (part_of_speech)
                7. Up to 3 synonyms in ${inputLangName} (synonyms)
                
                Return ONLY a valid JSON with these exact fields:`,
        response_json_schema: {
          type: "object",
          properties: {
            input_word: { type: "string" },
            output_translation: { type: "string" },
            definition: { type: "string" },
            definition_translation: { type: "string" }, // Adicionado
            example: { type: "string" },
            example_translation: { type: "string" },
            part_of_speech: { type: "string" },
            synonyms: { type: "array", items: { type: "string" } }
          },
          required: ["input_word", "output_translation", "definition"]
        }
      });

      // 2. Gerar imagem ilustrativa
      const imageResponse = await GenerateImage({
        prompt: `A clean, minimalist illustration representing the concept of "${translationResponse.input_word}" without any text or words. High quality, educational, simple visual representation suitable for language learning. Neutral background, clear subject matter, artistic style.`
      });

      // 3. Combinar todos os resultados
      const wordData = {
        input_word: translationResponse.input_word,
        output_translation: translationResponse.output_translation,
        input_language: inputLanguage,
        output_language: outputLanguage,
        definition: translationResponse.definition || "",
        definition_translation: translationResponse.definition_translation || "", // Adicionado
        part_of_speech: translationResponse.part_of_speech || "",
        example: translationResponse.example || "",
        example_translation: translationResponse.example_translation || "",
        synonyms: translationResponse.synonyms || [],
        image_url: imageResponse.url,
        category: "basic",
        // Campos de compatibilidade
        english: inputLanguage === 'en' ? translationResponse.input_word : translationResponse.output_translation,
        portuguese: outputLanguage === 'pt' ? translationResponse.output_translation : translationResponse.input_word
      };
      
      setResult(wordData);
      setShowResult(true);
      
      // Adicionar ao histórico se autenticado
      if (isAuthenticated) {
        const newHistory = [currentSearchTerm, ...searchHistory.filter(item => item !== currentSearchTerm)].slice(0, 10);
        setSearchHistory(newHistory);
      }
      
    } catch (err) {
      console.error("Erro na pesquisa:", err);
      setError("Não foi possível obter a tradução. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResult(null);
  };

  const handleFlashcardSaved = () => {
    showToast("Flashcard salvo com sucesso");
    handleCloseResult();
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Pesquisar palavras em múltiplos idiomas</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Selecione os idiomas de entrada e saída, digite uma palavra para obter tradução, definição, exemplos e mais.
          </p>
        </div>

        {/* Seletor de idiomas */}
        <LanguageSelector
          inputLanguage={inputLanguage}
          outputLanguage={outputLanguage}
          onInputLanguageChange={setInputLanguage}
          onOutputLanguageChange={setOutputLanguage}
        />

        <div className="bg-white rounded-xl shadow-md p-6 mb-10">
          {/* Barra de pesquisa */}
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder={`Pesquise em ${LANGUAGES[inputLanguage]?.name || 'Inglês'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-3 h-12 w-full"
                disabled={isLoading}
              />
            </div>
          </form>

          {/* Botões centralizados */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Flashcards"))}
              className="w-full sm:w-48 border-blue-200 text-blue-600 hover:bg-blue-50 h-11 px-5"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Ver Flashcards
            </Button>
            <Button
              onClick={() => handleSearch(searchTerm)}
              disabled={isLoading || !searchTerm.trim() || inputLanguage === outputLanguage}
              className="w-full sm:w-48 bg-blue-600 hover:bg-blue-700 text-white h-11 px-5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <SearchIcon className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>

          {/* Histórico de pesquisas */}
          {isAuthenticated && searchHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500 flex items-center">
                  <History className="h-4 w-4 mr-1" />
                  Pesquisas recentes
                </h3>
                <button 
                  onClick={handleClearHistory} 
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, index) => (
                  <Button 
                    key={index} 
                    size="sm" 
                    variant="outline" 
                    className="text-gray-600 border-gray-200 h-8"
                    onClick={() => {
                      setSearchTerm(term);
                      handleSearch(term);
                    }}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-20">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Processando tradução e gerando conteúdo...</p>
            <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg inline-block">
              <p>{error}</p>
            </div>
          </div>
        )}

        {showResult && result && (
          <TranslationResult 
            word={result} 
            onClose={handleCloseResult}
            onSaveFlashcard={handleFlashcardSaved}
          />
        )}

        <div className="py-6 px-8 bg-blue-50 rounded-xl border border-blue-100">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Dicas para aprender com múltiplos idiomas</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                <span className="text-blue-600 text-xs font-bold">1</span>
              </div>
              <p className="ml-3 text-gray-600">Escolha idiomas diferentes para criar conexões efetivas entre línguas.</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                <span className="text-blue-600 text-xs font-bold">2</span>
              </div>
              <p className="ml-3 text-gray-600">Use as definições no idioma de entrada para compreender melhor o contexto.</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                <span className="text-blue-600 text-xs font-bold">3</span>
              </div>
              <p className="ml-3 text-gray-600">Aproveite os exemplos práticos para ver como usar a palavra corretamente.</p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                <span className="text-blue-600 text-xs font-bold">4</span>
              </div>
              <p className="ml-3 text-gray-600">Salve como flashcard e pratique regularmente para fixar o vocabulário.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
