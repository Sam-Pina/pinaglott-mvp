import React, { useState, useEffect } from "react";
import { Category } from "@/entities/Category";
import { CategoryCard } from "@/entities/CategoryCard";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Layers, Loader2, ArrowLeft, ArrowRight, GraduationCap,
  Volume2, CheckSquare, ChevronRight, Check, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { LANGUAGES } from "../components/language/LanguageSelector";
import { recordProgress, getProgress, XP_REWARDS } from "@/lib/gamification";

const STUDIED_LANGUAGES = ["en", "es", "fr"];
const LANG_MAP = { en: "en-US", es: "es-ES", fr: "fr-FR", pt: "pt-BR" };

function playAudio(text, lang = "en") {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_MAP[lang] || "en-US";
  u.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang.startsWith((lang || "en").slice(0, 2)));
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function Categories() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [completed, setCompleted] = useState([]);
  const [studiedLanguage, setStudiedLanguage] = useState("en");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  const [studyMode, setStudyMode] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      await User.me();
      const [cats, allCards, progress] = await Promise.all([
        Category.filter({ active: true }, "order"),
        CategoryCard.list("-created_date", 500),
        getProgress(),
      ]);
      const countMap = {};
      allCards.forEach((c) => {
        countMap[c.category_slug] = (countMap[c.category_slug] || 0) + 1;
      });
      setCategories(cats);
      setCounts(countMap);
      setCompleted(progress?.completed_categories || []);
    } catch (error) {
      navigate(createPageUrl("Home"));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);
    setCardsLoading(true);
    try {
      const list = await CategoryCard.filter({
        category_slug: category.slug,
        language: studiedLanguage,
      });
      setCards(list);
    } catch (error) {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setCards([]);
    setStudyMode(false);
    setFinished(false);
  };

  const startStudy = () => {
    if (cards.length === 0) return;
    setIndex(0);
    setFlipped(false);
    setFinished(false);
    setStudyMode(true);
  };

  const completeCategory = async () => {
    setFinished(true);
    setStudyMode(false);
    if (!completed.includes(selectedCategory.slug)) {
      setCompleted((prev) => [...prev, selectedCategory.slug]);
    }
    await recordProgress({
      xp: cards.length * XP_REWARDS.flashcard + XP_REWARDS.categoryComplete,
      flashcards: cards.length,
      categoryComplete: selectedCategory.slug,
    });
  };

  const handleNext = () => {
    if (index < cards.length - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    } else {
      completeCategory();
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setFlipped(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Modo de estudo
  if (studyMode && cards.length > 0) {
    const card = cards[index];
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
              {selectedCategory.name}
            </h1>
            <Badge variant="outline" className="text-base">
              Flashcard {index + 1} de {cards.length}
            </Badge>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6">
            <div
              className="cursor-pointer min-h-[280px] flex flex-col items-center justify-center text-center p-6"
              onClick={() => setFlipped(!flipped)}
            >
              {!flipped ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">{card.word}</h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(card.word, card.language);
                      }}
                      className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                    >
                      <Volume2 className="w-6 h-6 text-blue-600" />
                    </button>
                  </div>
                  {card.image_url && (
                    <div className="mt-2 mb-4 rounded-lg overflow-hidden border border-gray-100 max-w-xs">
                      <img
                        src={card.image_url}
                        alt={card.word}
                        className="w-full h-44 object-cover"
                      />
                    </div>
                  )}
                  <p className="text-blue-600 text-base">Clique para ver a tradução</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl sm:text-4xl font-bold text-indigo-600">
                      {card.translation}
                    </h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(card.translation, card.translation_language);
                      }}
                      className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
                    >
                      <Volume2 className="w-6 h-6 text-indigo-600" />
                    </button>
                  </div>
                  <p className="text-gray-600 mb-4">{card.word}</p>
                  {card.example && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 max-w-md">
                      <p className="text-gray-700">"{card.example}"</p>
                      {card.example_translation && (
                        <p className="text-gray-500 italic text-sm mt-1">
                          "{card.example_translation}"
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={index === 0}
                className="border-gray-200 w-full sm:w-auto h-11"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
              </Button>
              <Button
                onClick={() => (flipped ? handleNext() : setFlipped(true))}
                className={`h-11 px-6 w-full sm:w-auto ${
                  !flipped ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {!flipped ? (
                  "Ver Tradução"
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {index < cards.length - 1 ? "Próximo" : "Concluir"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                className="border-gray-200 w-full sm:w-auto h-11"
              >
                {index < cards.length - 1 ? "Próximo" : "Concluir"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={handleBack} className="text-gray-600">
              Sair do estudo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de categoria concluída
  if (finished && selectedCategory) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-xl text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Categoria concluída!</h1>
          <p className="text-gray-600 mb-6">
            Você estudou {cards.length} palavras de {selectedCategory.name} e ganhou{" "}
            {cards.length * XP_REWARDS.flashcard + XP_REWARDS.categoryComplete} XP.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleBack} className="border-gray-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar às categorias
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={startStudy}>
              Estudar de novo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Detalhe da categoria
  if (selectedCategory) {
    const isCompleted = completed.includes(selectedCategory.slug);
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="outline" onClick={handleBack} className="border-gray-200 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Categorias
          </Button>

          <Card className="mb-6 overflow-hidden">
            <div className="h-40 sm:h-56 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              {selectedCategory.image_url ? (
                <img
                  src={selectedCategory.image_url}
                  alt={selectedCategory.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-6xl">{selectedCategory.icon}</span>
              )}
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <span>{selectedCategory.icon}</span>
                  {selectedCategory.name}
                </CardTitle>
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-700">
                    <Check className="w-3 h-3 mr-1" /> Concluída
                  </Badge>
                )}
              </div>
              <CardDescription>{selectedCategory.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  {LANGUAGES[studiedLanguage]?.flag} {LANGUAGES[studiedLanguage]?.name} →{" "}
                  {LANGUAGES["pt"]?.flag} Português
                </span>
                <span>{counts[selectedCategory.slug] || 0} palavras</span>
              </div>
              <Progress value={isCompleted ? 100 : 0} className="h-2 mb-4" />
              <Button
                onClick={startStudy}
                disabled={cards.length === 0 || cardsLoading}
                className="bg-blue-600 hover:bg-blue-700 h-11 px-6"
              >
                {cardsLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <GraduationCap className="w-5 h-5 mr-2" />
                )}
                Estudar categoria
              </Button>
            </CardContent>
          </Card>

          {!cardsLoading && cards.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-gray-600">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                Nenhum flashcard disponível para este idioma ainda.
              </CardContent>
            </Card>
          )}

          {cards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((c) => (
                <Card key={c.id} className="overflow-hidden">
                  {c.image_url && (
                    <img src={c.image_url} alt={c.word} className="w-full h-32 object-cover" />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">{c.word}</h3>
                      <button
                        onClick={() => playAudio(c.word, c.language)}
                        className="p-1 hover:bg-blue-50 rounded-full"
                      >
                        <Volume2 className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                    <p className="text-gray-500 text-sm">{c.translation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lista de categorias
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <Layers className="w-10 h-10 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Estudar por Categorias</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            Escolha uma categoria e aprenda vocabulário com flashcards prontos.
          </p>
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-gray-500">Idioma estudado:</span>
            <Select value={studiedLanguage} onValueChange={setStudiedLanguage}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUDIED_LANGUAGES.map((code) => (
                  <SelectItem key={code} value={code}>
                    <span className="flex items-center gap-2">
                      <span>{LANGUAGES[code]?.flag}</span>
                      <span>{LANGUAGES[code]?.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const isCompleted = completed.includes(category.slug);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full overflow-hidden"
                  onClick={() => handleSelectCategory(category)}
                >
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">{category.icon}</span>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{counts[category.slug] || 0} palavras</Badge>
                      {isCompleted && (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="w-3 h-3 mr-1" /> Concluída
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}