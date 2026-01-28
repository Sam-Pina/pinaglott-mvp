import React, { useState, useEffect } from "react";
import { Word } from "@/entities/Word";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Layers, Loader2, ArrowLeft, BookOpen, ChevronRight, GraduationCap, ArrowRight, Volume2, Volume1, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "../components/language/LanguageSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FlashcardItem from "../components/flashcards/FlashcardItem";
import { motion, AnimatePresence } from "framer-motion";
import { STATIC_FLASHCARDS } from "../components/categoryFlashcards";
import StudySessionModal from '../components/flashcards/StudySessionModal';

const CATEGORIES = [
  {
    id: "sports",
    name: "Esportes",
    icon: "⚽",
    description: "Vocabulário relacionado a esportes e atividades físicas"
  },
  {
    id: "house",
    name: "Itens de Casa",
    icon: "🏠",
    description: "Objetos e cômodos encontrados em uma casa"
  },
  {
    id: "objects",
    name: "Objetos",
    icon: "📦",
    description: "Objetos do dia a dia e utensílios diversos"
  },
  {
    id: "clothes",
    name: "Roupas",
    icon: "👕",
    description: "Vestuário e acessórios de moda"
  },
  {
    id: "food",
    name: "Alimentos",
    icon: "🍎",
    description: "Comidas, bebidas e ingredientes"
  },
  {
    id: "technology",
    name: "Tecnologia",
    icon: "💻",
    description: "Termos técnicos e dispositivos eletrônicos"
  },
  {
    id: "professions",
    name: "Profissões",
    icon: "👔",
    description: "Carreiras e ocupações profissionais"
  },
  {
    id: "animals",
    name: "Animais",
    icon: "🐶",
    description: "Animais domésticos e selvagens"
  },
  {
    id: "colors",
    name: "Cores",
    icon: "🎨",
    description: "Cores e tonalidades diversas"
  }
];



export default function Categories() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [inputLanguage, setInputLanguage] = useState('en');
  const [outputLanguage, setOutputLanguage] = useState('pt');
  const [studyMode, setStudyMode] = useState(false);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [flippedInStudy, setFlippedInStudy] = useState(false);
  const [studySessionData, setStudySessionData] = useState({
    studiedWords: [],
    showModal: false
  });


  useEffect(() => {
    const checkAuth = async () => {
      try {
        await User.me();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate(createPageUrl("Home"));
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    loadFlashcards(category.id, inputLanguage, outputLanguage);
  };

  const loadFlashcards = async (categoryId, inLang, outLang) => {
    // Buscar flashcards estáticos da categoria e idioma de saída selecionados
    const categoryFlashcards = STATIC_FLASHCARDS[categoryId]?.[outLang] || [];
    
    // Buscar flashcards salvos do banco de dados
    try {
      const savedCards = await Word.list();
      
      // Buscar revisões locais do localStorage
      const localReviews = getLocalReviews(categoryId);
      
      // Mapear flashcards estáticos com dados salvos (se existir)
      const flashcardsWithIds = categoryFlashcards.map((card, index) => {
        // Procurar se esse flashcard já foi salvo
        const savedCard = savedCards.find(sc => 
          sc.input_word === card.input_word && 
          sc.output_translation === card.output_translation &&
          sc.input_language === card.input_language &&
          sc.output_language === card.output_language
        );
        
        const cardKey = `${card.input_word}-${card.output_translation}`;
        const localReview = localReviews[cardKey] || { times_reviewed_today: 0, mastery_level: 0 };
        
        if (savedCard) {
          // Se foi salvo, usar os dados do banco (com ID real) + revisões locais
          return {
            ...savedCard,
            times_reviewed_today: localReview.times_reviewed_today,
            mastery_level: localReview.mastery_level,
            isSaved: true,
            category: categoryId
          };
        }
        
        // Se não foi salvo, usar dados estáticos + revisões locais
        return {
          ...card,
          id: `static-${categoryId}-${outLang}-${index}`,
          mastery_level: localReview.mastery_level,
          times_reviewed: 0,
          times_reviewed_today: localReview.times_reviewed_today,
          favorite: false,
          category: categoryId,
          isSaved: false
        };
      });
      
      setFlashcards(flashcardsWithIds);
    } catch (error) {
      console.error("Erro ao carregar flashcards:", error);
      // Fallback para flashcards estáticos
      const localReviews = getLocalReviews(categoryId);
      
      const flashcardsWithIds = categoryFlashcards.map((card, index) => {
        const cardKey = `${card.input_word}-${card.output_translation}`;
        const localReview = localReviews[cardKey] || { times_reviewed_today: 0, mastery_level: 0 };
        
        return {
          ...card,
          id: `static-${categoryId}-${outLang}-${index}`,
          mastery_level: localReview.mastery_level,
          times_reviewed: 0,
          times_reviewed_today: localReview.times_reviewed_today,
          favorite: false,
          category: categoryId,
          isSaved: false
        };
      });
      setFlashcards(flashcardsWithIds);
    }
  };

  const getLocalReviews = (categoryId) => {
    try {
      const storageKey = `category_reviews_${categoryId}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return {};
      
      const data = JSON.parse(stored);
      const today = new Date().toDateString();
      
      // Se a data armazenada não é hoje, resetar
      if (data.date !== today) {
        localStorage.removeItem(storageKey);
        return {};
      }
      
      return data.reviews || {};
    } catch (error) {
      console.error("Erro ao buscar revisões locais:", error);
      return {};
    }
  };

  const saveLocalReview = (categoryId, cardKey, reviewData) => {
    try {
      const storageKey = `category_reviews_${categoryId}`;
      const today = new Date().toDateString();
      
      const stored = localStorage.getItem(storageKey);
      let data = { date: today, reviews: {} };
      
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          data = parsed;
        }
      }
      
      data.reviews[cardKey] = reviewData;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Erro ao salvar revisão local:", error);
    }
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setFlashcards([]);
    setStudyMode(false);
    setCurrentStudyIndex(0);
    setFlippedInStudy(false);
  };

  const handleStartStudy = () => {
    if (flashcards.length === 0) return;
    setStudyMode(true);
    setCurrentStudyIndex(0);
    setFlippedInStudy(false);
    setStudySessionData({
      studiedWords: [],
      showModal: false
    });
  };

  const handleExitStudy = () => {
    setStudyMode(false);
    
    if (studySessionData.studiedWords.length > 0) {
      setStudySessionData(prev => ({ ...prev, showModal: true }));
    }
  };

  const handleNextCard = async (markAsKnown) => {
    const currentCard = flashcards[currentStudyIndex];
    if (!currentCard) {
      handleExitStudy();
      return;
    }

    if (markAsKnown) {
      const newMasteryLevel = Math.min(5, (currentCard.mastery_level || 0) + 1);
      
      const updatedCard = {
        ...currentCard,
        mastery_level: newMasteryLevel,
        times_reviewed: (currentCard.times_reviewed || 0) + 1,
        times_reviewed_today: (currentCard.times_reviewed_today || 0) + 1,
        times_reviewed_this_week: (currentCard.times_reviewed_this_week || 0) + 1,
        last_review_date: new Date().toISOString()
      };
      
      try {
        const { id, isSaved, ...dataToSave } = updatedCard;
        const savedCard = await Word.create(dataToSave);
        
        setFlashcards(prev => prev.map((card, index) => 
          index === currentStudyIndex ? { ...updatedCard, isSaved: true, dbId: savedCard.id } : card
        ));
        
        setStudySessionData(prev => {
          const alreadyStudied = prev.studiedWords.find(w => 
            w.input_word === savedCard.input_word && 
            w.output_translation === savedCard.output_translation &&
            w.input_language === savedCard.input_language &&
            w.output_language === savedCard.output_language
          );
          
          if (alreadyStudied) {
            return prev;
          }
          
          return {
            ...prev,
            studiedWords: [...prev.studiedWords, savedCard]
          };
        });
      } catch (error) {
        console.error("Erro ao salvar flashcard:", error);
      }
    }

    if (currentStudyIndex < flashcards.length - 1) {
      setCurrentStudyIndex(prev => prev + 1);
      setFlippedInStudy(false);
    } else {
      handleExitStudy();
    }
  };

  const handlePrevCard = () => {
    if (currentStudyIndex > 0) {
      setCurrentStudyIndex(prev => prev - 1);
      setFlippedInStudy(false);
    }
  };

  const handleSaveFlashcard = async (flashcard) => {
    try {
      const { id, isSaved, ...dataToSave } = flashcard;
      const savedCard = await Word.create(dataToSave);
      
      setFlashcards(prev => 
        prev.map(f => f.id === id ? { ...savedCard, isSaved: true, category: flashcard.category } : f)
      );
    } catch (error) {
      console.error("Erro ao salvar flashcard:", error);
    }
  };

  const handleUpdateMastery = async (flashcard) => {
    const newMasteryLevel = Math.min(5, (flashcard.mastery_level || 0) + 1);
    const newTimesReviewedToday = (flashcard.times_reviewed_today || 0) + 1;
    
    // Salvar revisão no localStorage
    const cardKey = `${flashcard.input_word}-${flashcard.output_translation}`;
    saveLocalReview(selectedCategory.id, cardKey, {
      times_reviewed_today: newTimesReviewedToday,
      mastery_level: newMasteryLevel
    });
    
    // Atualizar apenas localmente, sem salvar no banco
    setFlashcards(prev => 
      prev.map(f => f.id === flashcard.id ? { 
        ...f, 
        mastery_level: newMasteryLevel,
        times_reviewed: (f.times_reviewed || 0) + 1,
        times_reviewed_today: newTimesReviewedToday,
        times_reviewed_this_week: (f.times_reviewed_this_week || 0) + 1,
        last_review_date: new Date().toISOString()
      } : f)
    );
    
    // Se o flashcard já estava salvo no banco, atualizar também lá
    if (flashcard.isSaved && typeof flashcard.id !== 'string') {
      try {
        await Word.update(flashcard.id, { 
          mastery_level: newMasteryLevel,
          times_reviewed: (flashcard.times_reviewed || 0) + 1,
          times_reviewed_today: newTimesReviewedToday,
          times_reviewed_this_week: (flashcard.times_reviewed_this_week || 0) + 1,
          last_review_date: new Date().toISOString()
        });
      } catch (error) {
        console.error("Erro ao atualizar flashcard salvo:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Tela de Categorias
  if (!selectedCategory) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <Layers className="w-10 h-10 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-800">Estudar por Categorias</h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Escolha uma categoria de palavras para estudar. Depois, selecione o idioma de tradução desejado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full"
                  onClick={() => handleCategorySelect(category)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-4xl">{category.icon}</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="text-sm">
                      12 palavras
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Modo de Estudo
  if (studyMode && flashcards.length > 0) {
    const currentCard = flashcards[currentStudyIndex];
    
    const playAudio = (text, languageCode = 'en', rate = 1.0) => {
      if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
        console.error("Speech Synthesis not supported.");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      
      const languageMap = {
        'pt': 'pt-BR',
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR'
      };
      
      const actualLangCode = languageCode in languageMap ? languageCode : 'en';
      utterance.lang = languageMap[actualLangCode] || 'en-US';

      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;
        
        const preferredVoices = {
          'pt': ['Google português do Brasil', 'Microsoft Maria - Portuguese (Brazil)', 'Luciana', 'Joana'],
          'en': ['Google US English', 'Microsoft David - English (United States)', 'Samantha', 'Alex'],
          'es': ['Google español', 'Microsoft Helena - Spanish (Spain)', 'Monica', 'Jorge'],
          'fr': ['Google français', 'Microsoft Hortense - French (France)', 'Amelie', 'Thomas']
        };
        
        if (preferredVoices[actualLangCode]) {
          selectedVoice = voices.find(v => 
            preferredVoices[actualLangCode].some(preferred => 
              v.name.toLowerCase().includes(preferred.toLowerCase())
            ) && v.lang.startsWith(actualLangCode)
          );
        }
        
        if (!selectedVoice) {
          selectedVoice = voices.find(v => 
            v.lang === utterance.lang && v.localService
          );
        }
        
        if (!selectedVoice) {
          selectedVoice = voices.find(v => 
            v.lang.startsWith(actualLangCode) || v.lang === utterance.lang
          );
        }
        
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.default);
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
      }
    };
    
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
              Modo de Estudo ({currentStudyIndex + 1} de {flashcards.length})
            </h1>
            <Button 
              variant="outline" 
              onClick={handleExitStudy}
              className="border-gray-200 h-11 px-5 text-base"
            >
              Sair do modo de estudo
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
            <div className="p-6 pb-0">
              <div className="flex justify-between items-center mb-4">
                <Badge className="capitalize py-1 px-2 text-sm">{currentCard.category?.replace('_', ' ') || 'basic'}</Badge>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < (currentCard.mastery_level || 0) ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div 
                className="cursor-pointer min-h-[250px] sm:min-h-[300px] flex flex-col items-center justify-center text-center py-6 sm:py-10"
                onClick={() => setFlippedInStudy(!flippedInStudy)}
              >
                {!flippedInStudy ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">
                        {currentCard.input_word || currentCard.english}
                      </h2>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          playAudio(
                            currentCard.input_word || currentCard.english, 
                            currentCard.input_language || 'en'
                          ); 
                        }}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                      >
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </button>
                    </div>
                    {currentCard.image_url && (
                      <div className="mt-4 mb-6 sm:mb-8 rounded-md overflow-hidden border border-gray-100 max-w-xs sm:max-w-sm">
                        <img 
                          src={currentCard.image_url} 
                          alt={currentCard.input_word || currentCard.english} 
                          className="w-full h-40 sm:h-48 object-cover"
                        />
                      </div>
                    )}
                    <p className="text-blue-600 text-base">Clique para ver a tradução</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl sm:text-4xl font-bold text-indigo-600">
                        {currentCard.output_translation || currentCard.portuguese}
                      </h2>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          playAudio(
                            currentCard.output_translation || currentCard.portuguese, 
                            currentCard.output_language || 'pt'
                          ); 
                        }}
                        className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
                      >
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <p className="text-gray-600 text-base">{currentCard.input_word || currentCard.english}</p>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          playAudio(
                            currentCard.input_word || currentCard.english, 
                            currentCard.input_language || 'en'
                          ); 
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Volume1 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                    </div>
                    
                    {currentCard.example && (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-md border border-gray-100 mb-4 max-w-md text-base">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <p className="text-gray-700">"{currentCard.example}"</p>
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              playAudio(
                                currentCard.example, 
                                currentCard.input_language || 'en',
                                0.8
                              ); 
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"
                          >
                            <Volume1 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          </button>
                        </div>
                        {currentCard.example_translation && (
                          <div className="flex items-center justify-between">
                            <p className="text-gray-500 italic text-sm">{currentCard.example_translation}</p>
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                playAudio(
                                  currentCard.example_translation, 
                                  currentCard.output_language || 'pt',
                                  0.8
                                ); 
                              }}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"
                            >
                              <Volume1 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-2">
              <Button
                variant="outline"
                onClick={handlePrevCard}
                disabled={currentStudyIndex === 0}
                className="border-gray-200 w-full sm:w-auto h-11 px-5 text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              
              <div className="flex gap-2 w-full sm:w-auto">
                {flippedInStudy && (
                  <Button
                    variant="outline"
                    onClick={() => handleNextCard(false)} 
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 flex-1 sm:flex-none h-11 px-3 sm:px-5 text-base"
                  >
                    Revisar Depois
                  </Button>
                )}
                
                <Button
                  onClick={() => flippedInStudy ? handleNextCard(true) : setFlippedInStudy(true)}
                  className={`h-11 px-5 text-base flex-1 sm:flex-none ${
                    !flippedInStudy ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {!flippedInStudy ? (
                    "Ver Tradução"
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Sei isso
                    </>
                  )}
                </Button>
              </div>
              
              <Button
                onClick={() => handleNextCard(false)}
                variant="outline"
                className="border-gray-200 w-full sm:w-auto h-11 px-5 text-base"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Flashcards
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <Button
            variant="outline"
            onClick={handleBackToCategories}
            className="border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Categorias
          </Button>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">{selectedCategory.icon}</span>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-800">{selectedCategory.name}</h2>
              <p className="text-sm text-gray-500 flex items-center">
                <span className="mr-2">{LANGUAGES[outputLanguage].flag}</span>
                {LANGUAGES[outputLanguage].name}
              </p>
            </div>
          </div>
        </div>

        {/* Seletores de Idioma */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurar Idiomas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma de entrada (palavra principal)
              </label>
              <Select
                value={inputLanguage}
                onValueChange={(value) => {
                  setInputLanguage(value);
                  if (selectedCategory) {
                    loadFlashcards(selectedCategory.id, value, outputLanguage);
                  }
                }}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([code, lang]) => (
                    <SelectItem key={code} value={code} className="text-base">
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma de saída (tradução)
              </label>
              <Select
                value={outputLanguage}
                onValueChange={(value) => {
                  setOutputLanguage(value);
                  if (selectedCategory) {
                    loadFlashcards(selectedCategory.id, inputLanguage, value);
                  }
                }}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([code, lang]) => (
                    <SelectItem key={code} value={code} className="text-base">
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
          {inputLanguage === outputLanguage && (
            <p className="text-sm text-orange-600 mt-3">
              ⚠️ Idiomas de entrada e saída são iguais. Escolha idiomas diferentes para uma melhor experiência.
            </p>
          )}
        </div>

        {flashcards.length > 0 ? (
          <>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Flashcards da Categoria</h3>
                <p className="text-gray-600">
                  {flashcards.length} flashcards disponíveis
                </p>
              </div>
              <Button
                onClick={handleStartStudy}
                className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Estudar Categoria
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {flashcards.map((flashcard) => (
                  <motion.div
                    key={flashcard.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative">
                      <FlashcardItem
                        word={flashcard}
                        onDelete={() => {}}
                        onToggleFavorite={() => {}}
                        onEditMastery={async (wordId, newMastery) => {
                          await handleUpdateMastery(flashcard);
                        }}
                        onEdit={() => {}}
                      />
                      {!flashcard.isSaved && (
                        <div className="absolute top-2 right-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveFlashcard(flashcard)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      )}
                      {flashcard.isSaved && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-600 text-white">Salvo!</Badge>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">
                Nenhum flashcard disponível para esta combinação de categoria e idioma.
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Modal de Sessão Concluída */}
        <StudySessionModal
          isOpen={studySessionData.showModal}
          onClose={() => {
            setStudySessionData({ studiedWords: [], showModal: false });
          }}
          studiedWords={studySessionData.studiedWords}
          onStudyAgain={() => {
            setStudySessionData({ studiedWords: [], showModal: false });
            handleStartStudy();
          }}
        />
      </div>
    </div>
  );
}