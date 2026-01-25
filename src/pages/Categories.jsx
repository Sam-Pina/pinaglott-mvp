import React, { useState, useEffect } from "react";
import { Word } from "@/entities/Word";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Layers, Loader2, ArrowLeft, BookOpen, ChevronRight, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "../components/language/LanguageSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FlashcardItem from "../components/flashcards/FlashcardItem";
import { motion, AnimatePresence } from "framer-motion";
import { STATIC_FLASHCARDS } from "../components/categoryFlashcards";

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

  const loadFlashcards = (categoryId, inLang, outLang) => {
    // Buscar flashcards estáticos da categoria e idioma de saída selecionados
    const categoryFlashcards = STATIC_FLASHCARDS[categoryId]?.[outLang] || [];
    
    // Adicionar IDs temporários e campos necessários
    const flashcardsWithIds = categoryFlashcards.map((card, index) => ({
      ...card,
      id: `static-${categoryId}-${outLang}-${index}`,
      mastery_level: 0,
      times_reviewed: 0,
      times_reviewed_today: 0,
      favorite: false,
      category: categoryId
    }));
    
    setFlashcards(flashcardsWithIds);
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
  };

  const handleExitStudy = () => {
    setStudyMode(false);
    setCurrentStudyIndex(0);
    setFlippedInStudy(false);
  };

  const handleNextCard = () => {
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
      const { id, ...dataToSave } = flashcard;
      await Word.create(dataToSave);
      
      setFlashcards(prev => 
        prev.map(f => f.id === id ? { ...f, isSaved: true } : f)
      );
    } catch (error) {
      console.error("Erro ao salvar flashcard:", error);
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
    
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
              Modo de Estudo: {selectedCategory.name} ({currentStudyIndex + 1} de {flashcards.length})
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
                <Badge className="capitalize py-1 px-2 text-sm">{selectedCategory.name}</Badge>
              </div>
              
              <div 
                className="cursor-pointer min-h-[250px] sm:min-h-[300px] flex flex-col items-center justify-center text-center py-6 sm:py-10"
                onClick={() => setFlippedInStudy(!flippedInStudy)}
              >
                {!flippedInStudy ? (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                      {currentCard.input_word}
                    </h2>
                    {currentCard.image_url && (
                      <div className="mt-4 mb-6 sm:mb-8 rounded-md overflow-hidden border border-gray-100 max-w-xs sm:max-w-sm">
                        <img 
                          src={currentCard.image_url} 
                          alt={currentCard.input_word} 
                          className="w-full h-40 sm:h-48 object-cover"
                        />
                      </div>
                    )}
                    <p className="text-blue-600 text-base">Clique para ver a tradução</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl sm:text-4xl font-bold text-indigo-600 mb-2">
                      {currentCard.output_translation}
                    </h2>
                    <p className="text-gray-600 text-base mb-4 sm:mb-6">{currentCard.input_word}</p>
                    
                    {currentCard.example && (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-md border border-gray-100 mb-4 max-w-md text-base">
                        <p className="text-gray-700 mb-1 sm:mb-2">"{currentCard.example}"</p>
                        {currentCard.example_translation && (
                          <p className="text-gray-500 italic text-sm">{currentCard.example_translation}</p>
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
              
              <Button
                onClick={() => flippedInStudy ? handleNextCard() : setFlippedInStudy(true)}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 px-5 text-base"
              >
                {!flippedInStudy ? "Ver Tradução" : (currentStudyIndex === flashcards.length - 1 ? "Finalizar" : "Próximo")}
                {flippedInStudy && <ArrowRight className="w-4 h-4 ml-2" />}
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
                        onEditMastery={() => {}}
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
      </div>
    </div>
  );
}