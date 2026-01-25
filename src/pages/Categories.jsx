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
import { InvokeLLM, GenerateImage } from "@/integrations/Core";
import FlashcardItem from "../components/flashcards/FlashcardItem";
import { motion, AnimatePresence } from "framer-motion";

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

const CATEGORY_WORDS = {
  sports: ["soccer", "basketball", "tennis", "swimming", "running", "volleyball", "baseball", "golf", "cycling", "boxing"],
  house: ["kitchen", "bedroom", "bathroom", "living room", "door", "window", "table", "chair", "bed", "sofa"],
  objects: ["book", "pen", "phone", "key", "bag", "wallet", "watch", "glasses", "umbrella", "bottle"],
  clothes: ["shirt", "pants", "dress", "shoes", "hat", "jacket", "socks", "skirt", "sweater", "coat"],
  food: ["apple", "banana", "bread", "cheese", "chicken", "rice", "salad", "pizza", "coffee", "water"],
  technology: ["computer", "laptop", "smartphone", "tablet", "keyboard", "mouse", "screen", "software", "internet", "application"],
  professions: ["doctor", "teacher", "engineer", "lawyer", "nurse", "chef", "architect", "programmer", "designer", "manager"]
};

export default function Categories() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

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

  const handleLanguageSelect = async (languageCode) => {
    setSelectedLanguage(languageCode);
    setIsGenerating(true);
    setFlashcards([]);

    const words = CATEGORY_WORDS[selectedCategory.id];
    setGenerationProgress({ current: 0, total: words.length });

    const generatedFlashcards = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      setGenerationProgress({ current: i + 1, total: words.length });

      try {
        const inputLang = 'en';
        const outputLang = languageCode;

        const translationResponse = await InvokeLLM({
          prompt: `Given the word "${word}" in English, provide:
1. The word itself in English (input_word)
2. Translation to ${LANGUAGES[outputLang].name} (output_translation)
3. Definition of the word in English (definition)
4. Translation of the definition to ${LANGUAGES[outputLang].name} (definition_translation)
5. An example sentence using the word in English (example)
6. Translation of the example sentence to ${LANGUAGES[outputLang].name} (example_translation)

Return ONLY a valid JSON with these exact fields:`,
          response_json_schema: {
            type: "object",
            properties: {
              input_word: { type: "string" },
              output_translation: { type: "string" },
              definition: { type: "string" },
              definition_translation: { type: "string" },
              example: { type: "string" },
              example_translation: { type: "string" }
            },
            required: ["input_word", "output_translation"]
          }
        });

        const imageResponse = await GenerateImage({
          prompt: `A high-quality stylized illustration representing the concept of "${word}".
Clean, refined lineart with smooth, well-defined strokes and balanced proportions.
Modern digital illustration style with elegant shapes, subtle depth, and minimal yet expressive details.
Professional, minimalist, and visually polished aesthetic suitable for educational and language-learning applications.
Single clear subject, centered composition, no text or typography.
Soft lighting, controlled shading, flat colors with slight gradients.
Neutral solid-color background.
Consistent, premium illustration style.`
        });

        const flashcard = {
          id: `temp-${Date.now()}-${i}`,
          input_word: translationResponse.input_word,
          output_translation: translationResponse.output_translation,
          input_language: inputLang,
          output_language: outputLang,
          definition: translationResponse.definition || "",
          definition_translation: translationResponse.definition_translation || "",
          example: translationResponse.example || "",
          example_translation: translationResponse.example_translation || "",
          image_url: imageResponse.url,
          category: selectedCategory.id,
          mastery_level: 0,
          times_reviewed: 0,
          times_reviewed_today: 0,
          favorite: false,
          english: translationResponse.input_word,
          portuguese: translationResponse.output_translation
        };

        generatedFlashcards.push(flashcard);
        setFlashcards([...generatedFlashcards]);
      } catch (error) {
        console.error(`Erro ao gerar flashcard para "${word}":`, error);
      }
    }

    setIsGenerating(false);
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
                      {CATEGORY_WORDS[category.id].length} palavras
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
              {CATEGORY_WORDS[selectedCategory.id].length} palavras disponíveis
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

        {isGenerating && (
          <Card className="mb-6">
            <CardContent className="py-8">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Gerando Flashcards...
                </h3>
                <p className="text-gray-600 mb-4">
                  Criando {generationProgress.current} de {generationProgress.total} flashcards
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-md mx-auto">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(generationProgress.current / generationProgress.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {flashcards.length > 0 && (
          <>
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Flashcards Gerados</h3>
              <p className="text-gray-600">
                {flashcards.length} de {CATEGORY_WORDS[selectedCategory.id].length} flashcards
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
        )}
      </div>
    </div>
  );
}