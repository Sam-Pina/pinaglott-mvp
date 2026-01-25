import React, { useState, useEffect } from "react";
import { Word } from "@/entities/Word";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Layers, Loader2, ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LANGUAGES } from "../components/language/LanguageSelector";
import FlashcardItem from "../components/flashcards/FlashcardItem";
import { motion, AnimatePresence } from "framer-motion";
import { STATIC_FLASHCARDS } from "../components/data/categoryFlashcards.js";

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
  }
];



export default function Categories() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [flashcards, setFlashcards] = useState([]);


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
    setSelectedLanguage(null);
    setFlashcards([]);
  };

  const handleLanguageSelect = (languageCode) => {
    setSelectedLanguage(languageCode);
    
    // Buscar flashcards estáticos da categoria e idioma selecionados
    const categoryFlashcards = STATIC_FLASHCARDS[selectedCategory.id]?.[languageCode] || [];
    
    // Adicionar IDs temporários e campos necessários
    const flashcardsWithIds = categoryFlashcards.map((card, index) => ({
      ...card,
      id: `static-${selectedCategory.id}-${languageCode}-${index}`,
      mastery_level: 0,
      times_reviewed: 0,
      times_reviewed_today: 0,
      favorite: false,
      category: selectedCategory.id
    }));
    
    setFlashcards(flashcardsWithIds);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedLanguage(null);
    setFlashcards([]);
  };

  const handleBackToLanguages = () => {
    setSelectedLanguage(null);
    setFlashcards([]);
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
                      10 palavras
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

  // Tela de Seleção de Idioma
  if (selectedCategory && !selectedLanguage) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button
            variant="outline"
            onClick={handleBackToCategories}
            className="mb-6 border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Categorias
          </Button>

          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-4">
              <span className="text-5xl mr-3">{selectedCategory.icon}</span>
              <h1 className="text-3xl font-bold text-gray-800">{selectedCategory.name}</h1>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto mb-2">
              Selecione o idioma para o qual deseja traduzir as palavras desta categoria.
            </p>
            <Badge variant="outline" className="text-sm">
              10 palavras disponíveis
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <motion.div
                key={code}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  onClick={() => handleLanguageSelect(code)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{lang.flag}</span>
                        <CardTitle className="text-xl">{lang.name}</CardTitle>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tela de Flashcards
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={handleBackToLanguages}
            className="border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Idiomas
          </Button>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">{selectedCategory.icon}</span>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-800">{selectedCategory.name}</h2>
              <p className="text-sm text-gray-500 flex items-center">
                <span className="mr-2">{LANGUAGES[selectedLanguage].flag}</span>
                {LANGUAGES[selectedLanguage].name}
              </p>
            </div>
          </div>
        </div>

        {flashcards.length > 0 ? (
          <>
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Flashcards da Categoria</h3>
              <p className="text-gray-600">
                {flashcards.length} flashcards disponíveis
              </p>
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