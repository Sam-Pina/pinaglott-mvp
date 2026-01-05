import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search, Book, ArrowRight, CheckCircle, Zap, BarChart, Eye,
  MessageSquare, PenTool, Brain, BookOpen, Layers,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { InvokeLLM, GenerateImage } from "@/integrations/Core";
import TranslationResult from "../components/search/TranslationResult";
import UserProgressDashboard from "../components/dashboard/UserProgressDashboard";

export default function Home() {
  const { toasts, showToast, removeToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showResult, setShowResult] = useState(false); 

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowResult(false);

    try {
      // Step 1: Detect language and get English equivalent and Portuguese translation
      const languageDetectionResponse = await InvokeLLM({
        prompt: `Analyze the term "${searchTerm}" and determine:
                1. Is it in English or Portuguese? (language)
                2. If it's in Portuguese, translate it to English. If it's already in English, keep it as is. (english_word)
                3. What is the Portuguese translation of the English word? (portuguese_translation)
                
                Return ONLY a valid JSON with these fields:
                {
                  "language": "english" or "portuguese",
                  "english_word": "the word in English",
                  "portuguese_translation": "tradução em português"
                }`,
        response_json_schema: {
          type: "object",
          properties: {
            language: { type: "string", enum: ["english", "portuguese"] },
            english_word: { type: "string" },
            portuguese_translation: { type: "string" }
          },
          required: ["language", "english_word", "portuguese_translation"]
        }
      });

      const englishWord = languageDetectionResponse.english_word;
      const portugueseTranslation = languageDetectionResponse.portuguese_translation;

      // Step 2: Get detailed information about the English word
      const wordDetailsResponse = await InvokeLLM({
        prompt: `Provide detailed information about the English word "${englishWord}":
                1. The English word (english)
                2. The Portuguese translation (portuguese) 
                3. The phonetic transcription (phonetic) - preferably IPA for American English
                4. Part of speech (partOfSpeech) like "noun", "verb", "adjective", etc.
                5. A good example sentence in English (example)
                6. Translation of the example sentence to Portuguese (example_translation)
                7. Up to 3 definitions in English with their Portuguese translations (definitions) - each definition should be an object with "text" and "translation" properties
                8. Up to 5 synonyms (synonyms)
                
                Return ONLY a valid JSON with these fields. For definitions, use this format:
                "definitions": [
                  {"text": "Definition in English", "translation": "Definição em português"},
                  {"text": "Another definition", "translation": "Outra definição"}
                ]`,
        response_json_schema: {
          type: "object",
          properties: {
            english: { type: "string" },
            portuguese: { type: "string" },
            phonetic: { type: "string" },
            partOfSpeech: { type: "string" },
            example: { type: "string" },
            example_translation: { type: "string" },
            definitions: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  text: { type: "string" },
                  translation: { type: "string" }
                }
              } 
            },
            synonyms: { type: "array", items: { type: "string" } }
          },
          // Make fields optional for robustness, as LLM might not always provide all
          // or some might not be applicable (e.g., phonetic for uncommon words)
          additionalProperties: true
        }
      });

      // Step 3: Generate image for the English word
      const imageResponse = await GenerateImage({
        prompt: `A clean, minimalist illustration representing the concept of "${englishWord}" without any text or words. High quality, educational, simple visual representation suitable for language learning. Neutral background, clear subject matter, artistic style.`
      });

      // Step 4: Combine all data into the final result object
      const wordData = {
        english: englishWord,
        portuguese: portugueseTranslation,
        phonetic: wordDetailsResponse.phonetic || "",
        partOfSpeech: wordDetailsResponse.partOfSpeech || "",
        example: wordDetailsResponse.example || "",
        example_translation: wordDetailsResponse.example_translation || "",
        definitions: wordDetailsResponse.definitions || [],
        synonyms: wordDetailsResponse.synonyms || [],
        image_url: imageResponse.url,
        category: "basic"
      };

      setResult(wordData);
      setShowResult(true); 
    } catch (err) {
      console.error("Erro na pesquisa:", err);
      setError("Não foi possível obter a tradução. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResult(null);
  };

  const handleFlashcardSaved = () => {
    showToast("Flashcard salvo com sucesso");
    handleCloseResult();
  };

  // Adicionar listener para atualizações de flashcards
  useEffect(() => {
    const handleStorageChange = () => {
      // Forçar re-render do UserProgressDashboard
      window.location.reload();
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-blue-600 mb-6">
                Aprenda idiomas de forma contextualizada e visual
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Desenvolva seu vocabulário em múltiplos idiomas com traduções contextualizadas, exemplos práticos, imagens e flashcards personalizados. Suporte para Português, Inglês, Espanhol e Francês!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={createPageUrl("Search")}>
                  <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                    <Search className="w-5 h-5 mr-2" />
                    Começar a Pesquisar
                  </Button>
                </Link>
                <Link to={createPageUrl("Flashcards")}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Book className="w-5 h-5 mr-2" />
                    Ver Flashcards
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-5/12">
              <UserProgressDashboard key={Date.now()} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Como o Pinaglott te ajuda a aprender</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nossa abordagem única combina vários elementos para tornar seu aprendizado de idiomas mais eficiente e memorável.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Search className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Traduções Contextualizadas</h3>
              <p className="text-gray-600">
                Veja o significado das palavras em diferentes idiomas junto com frases de exemplo que demonstram o uso correto.
              </p>
              <Link
                to={createPageUrl("Search")}
                className="flex items-center text-blue-600 font-medium mt-4 hover:text-blue-700"
              >
                Experimentar agora <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                <Book className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Flashcards Personalizados</h3>
              <p className="text-gray-600">
                Crie seu próprio banco de palavras com flashcards personalizados para revisão e estudo contínuo em múltiplos idiomas.
              </p>
              <Link
                to={createPageUrl("Flashcards")}
                className="flex items-center text-indigo-600 font-medium mt-4 hover:text-indigo-700"
              >
                Ver meus flashcards <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Reforço Visual e Auditivo</h3>
              <p className="text-gray-600">
                Associe imagens e áudio nativo aos flashcards para melhorar a memorização e criar conexões visuais e auditivas.
              </p>
              <Link
                to={createPageUrl("Search")}
                className="flex items-center text-purple-600 font-medium mt-4 hover:text-purple-700"
              >
                Ver exemplos <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Como funciona</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Siga estes passos simples para começar a expandir seu vocabulário em múltiplos idiomas hoje mesmo.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="md:w-1/2 order-2 md:order-1">
              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha os idiomas de entrada e saída</h3>
                    <p className="text-gray-600">
                      Selecione entre Português, Inglês, Espanhol ou Francês como idiomas de origem e destino.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Veja a tradução contextualizada</h3>
                    <p className="text-gray-600">
                      Obtenha a tradução no idioma escolhido, definições, frases de exemplo e imagens relacionadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Salve como flashcard</h3>
                    <p className="text-gray-600">
                      Adicione a palavra à sua coleção pessoal de flashcards organizados por idioma para revisão posterior.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-bold">4</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Revise e pratique</h3>
                    <p className="text-gray-600">
                      Estude regularmente seus flashcards com áudio nativo para fixar as palavras na memória de longo prazo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-5/12 order-1 md:order-2">
              <div className="relative">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-100 rounded-full opacity-30"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-100 rounded-full opacity-30"></div>
                <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="p-6 flex flex-col items-center">
                    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl w-full flex items-center justify-center">
                      <Brain className="w-28 h-28 text-blue-500 opacity-80" />
                    </div>
                    <div className="text-center space-y-4">
                      <h3 className="text-xl font-semibold text-gray-800">Memorização Eficiente</h3>
                      <p className="text-gray-600">
                        Use flashcards para melhorar sua memorização e aprendizado de vocabulário em inglês.
                        Combine imagens, exemplos e contexto para fixar melhor cada palavra.
                      </p>
                      <div className="flex justify-center space-x-8 pt-4">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <Eye className="w-5 h-5 text-blue-600" />
                          </div>
                          <p className="text-sm text-gray-600">Aprendizado Visual</p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                          </div>
                          <p className="text-sm text-gray-600">Contexto</p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <PenTool className="w-5 h-5 text-purple-600" />
                          </div>
                          <p className="text-sm text-gray-600">Prática</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Torne-se um poliglota hoje
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-3xl mx-auto">
            Junte-se a milhares de estudantes que estão expandindo seu vocabulário em múltiplos idiomas de forma eficiente e divertida.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to={createPageUrl("Search")}>
              <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50">
                <Search className="w-5 h-5 mr-2" />
                Começar a Pesquisar
              </Button>
            </Link>
            <Link to={createPageUrl("Flashcards")}>
              <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50">
                <Book className="w-5 h-5 mr-2" />
                Ver Flashcards
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Supported Languages Section */}
      <section className="py-16 bg-white px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Idiomas Suportados</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-12">
            Crie conexões entre qualquer combinação destes idiomas e acelere seu aprendizado!
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col items-center justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <span className="text-4xl sm:text-5xl mb-3 sm:mb-4">🇧🇷</span>
              <span className="font-semibold text-base sm:text-lg text-gray-700">Português</span>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col items-center justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <span className="text-4xl sm:text-5xl mb-3 sm:mb-4">🇺🇸</span>
              <span className="font-semibold text-base sm:text-lg text-gray-700">Inglês</span>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col items-center justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <span className="text-4xl sm:text-5xl mb-3 sm:mb-4">🇪🇸</span>
              <span className="font-semibold text-base sm:text-lg text-gray-700">Espanhol</span>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col items-center justify-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <span className="text-4xl sm:text-5xl mb-3 sm:mb-4">🇫🇷</span>
              <span className="font-semibold text-base sm:text-lg text-gray-700">Francês</span>
            </div>
          </div>
        </div>
      </section>

      {/* Result Modal */}
      {showResult && result && (
        <TranslationResult
          word={result}
          onClose={handleCloseResult}
          onSaveFlashcard={handleFlashcardSaved}
        />
      )}
    </div>
  );
}