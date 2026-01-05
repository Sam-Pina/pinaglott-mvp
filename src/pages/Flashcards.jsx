import React, { useState, useEffect, useCallback } from "react";
import { Word } from "@/entities/Word";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Search, Plus, BookOpen, Filter, 
  Star, StarOff, SortAsc, SortDesc, Trash2, Grid, List,
  Layers, CheckSquare, RotateCw, Shuffle, Loader2,
  ArrowRight, ArrowLeft, ChevronRight, Pencil, Volume2, Volume1
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
} from "@/components/ui/popover";

import FlashcardItem from "../components/flashcards/FlashcardItem";
import DailyGoalWidget from '../components/flashcards/DailyGoalWidget';
import StudySessionModal from '../components/flashcards/StudySessionModal';
import { LANGUAGES } from "../components/language/LanguageSelector";
import LanguageStudyModal from '../components/study/LanguageStudyModal';

export default function Flashcards() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [flashcards, setFlashcards] = useState([]);
  const [filteredFlashcards, setFilteredFlashcards] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); 
  const [viewMode, setViewMode] = useState("grid"); 
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const [studyMode, setStudyMode] = useState(false);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);
  const [studyFlashcards, setStudyFlashcards] = useState([]);
  const [flippedInStudy, setFlippedInStudy] = useState(false);
  
  const [editingFlashcard, setEditingFlashcard] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [userStats, setUserStats] = useState({
    totalCards: 0,
    favoritedCards: 0,
    masteredCards: 0,
    learningCards: 0, 
    newCards: 0,      
    categories: []
  });

  const [dailyGoal, setDailyGoal] = useState(10);
  const [weeklyGoal, setWeeklyGoal] = useState(50);
  const [wordsAddedToday, setWordsAddedToday] = useState(0); 
  const [wordsAddedThisWeek, setWordsAddedThisWeek] = useState(0); // Renamed from weeklyReviews
  const [weeklyReviewCount, setWeeklyReviewCount] = useState(0); // New state for weekly reviews
  const [showInitialGoalSetup, setShowInitialGoalSetup] = useState(false);

  const [studySessionData, setStudySessionData] = useState({
    studiedWords: [],
    showModal: false
  });

  const [languageFilter, setLanguageFilter] = useState("all");
  const [showLanguageStudyModal, setShowLanguageStudyModal] = useState(null); // Stores { open: boolean, shuffled: boolean }

  const MAX_DAILY_REVIEWS_PER_CARD = 5; 

  // Helper to get current date/start of week in Brazil timezone
  const getBrazilTimeInfo = () => {
    const now = new Date();
    const brazilOffset = -3; // UTC-3
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brazilTime = new Date(utc + (brazilOffset * 3600000));
    
    const todayStr = brazilTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const dayOfWeek = (brazilTime.getDay() + 6) % 7; // 0 for Monday, 1 for Tuesday, ..., 6 for Sunday
    const startOfWeek = new Date(brazilTime);
    startOfWeek.setDate(brazilTime.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    return { brazilTime, todayStr, startOfWeek, startOfWeekStr };
  };

  const loadFlashcards = useCallback(async () => {
    try {
      const words = await Word.list("-created_date");
      setFlashcards(words);
    } catch (error) {
      console.error("Erro ao carregar flashcards:", error);
    } 
  }, []);

  // Centralized reset logic for daily/weekly stats on component load
  const performInitialResets = useCallback(async (userData) => {
    const { todayStr, startOfWeekStr } = getBrazilTimeInfo();
    
    const allWords = await Word.list(); // Fetch all words once for resets
    const wordsToUpdatePromises = [];

    // 1. Daily Added Words Reset (words_added_today)
    if (userData.last_addition_date !== todayStr) {
      await User.updateMyUserData({ 
        words_added_today: 0, 
        last_addition_date: todayStr 
      });
      setWordsAddedToday(0);
    } else {
      setWordsAddedToday(userData.words_added_today || 0);
    }

    // 2. Daily Card Review Count Reset (times_reviewed_today)
    if (userData.last_addition_date !== todayStr) { // If it's a new day, reset daily reviews for all cards
      allWords.forEach(word => {
        if ((word.times_reviewed_today || 0) > 0) {
          wordsToUpdatePromises.push(Word.update(word.id, { times_reviewed_today: 0 }));
        }
      });
    }

    // 3. Weekly Review Count Reset (times_reviewed_this_week)
    const lastReviewResetDate = userData.last_review_reset_date || "1970-01-01"; // Default to old date if not set
    if (lastReviewResetDate < startOfWeekStr) { // If last reset was before current week's start
      await User.updateMyUserData({
        last_review_reset_date: startOfWeekStr
      });
      // Iterate through words to reset their weekly review count
      allWords.forEach(word => {
        if ((word.times_reviewed_this_week || 0) > 0) {
          wordsToUpdatePromises.push(Word.update(word.id, { times_reviewed_this_week: 0 }));
        }
      });
    }

    // Perform bulk word updates if any
    if (wordsToUpdatePromises.length > 0) {
      await Promise.all(wordsToUpdatePromises);
    }
  }, []);

  // Função para incrementar contador quando flashcard é ADICIONADO
  const incrementDailyAddedCount = async () => {
    try {
      const { todayStr } = getBrazilTimeInfo();
      const userData = await User.me(); // Re-fetch to ensure latest words_added_today

      const newCount = (userData.words_added_today || 0) + 1;

      await User.updateMyUserData({
        words_added_today: newCount,
        last_addition_date: todayStr // Ensure this is always current
      });

      setWordsAddedToday(newCount);
      
    } catch (error) {
      console.error("Erro ao incrementar contador de palavras adicionadas:", error);
    }
  };

  // Função para resetar manualmente o progresso (Daily and Weekly)
  const resetDailyProgress = async () => {
    try {
      const { todayStr, startOfWeekStr } = getBrazilTimeInfo();
      
      // Reset daily added count for user
      await User.updateMyUserData({ 
        words_added_today: 0,
        last_addition_date: todayStr, // Update to current day to prevent re-reset
        last_review_reset_date: startOfWeekStr // Update to current week's start to prevent re-reset
      });
      setWordsAddedToday(0);
      setWeeklyReviewCount(0); // Optimistically update UI

      // Reset times_reviewed_today and times_reviewed_this_week for all cards
      const allWords = await Word.list();
      const wordUpdatePromises = allWords.map(word => {
        const changes = {};
        if ((word.times_reviewed_today || 0) > 0) {
          changes.times_reviewed_today = 0;
        }
        if ((word.times_reviewed_this_week || 0) > 0) {
          changes.times_reviewed_this_week = 0;
        }
        if (Object.keys(changes).length > 0) {
          return Word.update(word.id, changes);
        }
        return Promise.resolve();
      });
      await Promise.all(wordUpdatePromises);

      await loadFlashcards(); // Reload to reflect changes

    } catch (error) {
      console.error("Erro ao resetar progresso manualmente:", error);
    }
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      setIsLoading(true);
      try {
        const userData = await User.me();
        setIsAuthenticated(true);
        
        // Perform all initial resets based on user data
        await performInitialResets(userData);

        setDailyGoal(userData.daily_goal || 10);
        setWeeklyGoal(userData.weekly_goal || 50);
        if (!userData.daily_goal && userData.daily_goal !== 0) {
          setShowInitialGoalSetup(true);
        }
        
        await loadFlashcards();
      } catch (error) {
        setIsAuthenticated(false);
        navigate(createPageUrl("Home"));
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndLoadData();
  }, [navigate, performInitialResets, loadFlashcards]);

  // Renamed function to calculate words ADDED this week
  const calculateWordsAddedThisWeek = useCallback((words) => {
    const { startOfWeek } = getBrazilTimeInfo();

    const addedThisWeek = words.filter(word => {
      const createdDate = new Date(word.created_date);
      return createdDate >= startOfWeek;
    }).length;
    setWordsAddedThisWeek(addedThisWeek);
  }, []);

  // New function to calculate total reviews this week
  const calculateWeeklyReviewCount = useCallback((words) => {
    const totalWeeklyReviews = words.reduce((sum, word) => sum + (word.times_reviewed_this_week || 0), 0);
    setWeeklyReviewCount(totalWeeklyReviews);
  }, []);

  useEffect(() => {
    updateStats(flashcards);
    calculateWordsAddedThisWeek(flashcards); // Renamed for clarity
    calculateWeeklyReviewCount(flashcards); // New call
  }, [flashcards, calculateWordsAddedThisWeek, calculateWeeklyReviewCount]);

  // Listener para recarregar flashcards quando houver atualizações
  useEffect(() => {
    const handleStorageChange = () => {
      loadFlashcards();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadFlashcards();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadFlashcards]);

  const updateStats = (words) => {
    const favoritedCards = words.filter(card => card.favorite).length;
    const masteredCards = words.filter(card => (card.mastery_level || 0) === 5).length;
    const learningCards = words.filter(card => (card.mastery_level || 0) > 0 && (card.mastery_level || 0) < 5).length;
    const newCards = words.filter(card => (card.mastery_level || 0) === 0).length;
    
    const categoryCounts = {};
    words.forEach(word => {
      const cat = word.category || "basic";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    const categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    setUserStats({
      totalCards: words.length,
      favoritedCards,
      masteredCards,
      learningCards,
      newCards,
      categories
    });
  };

  const handleIKnowThis = async (cardId) => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;

    const timesReviewedTodayForCard = card.times_reviewed_today || 0;
    const timesReviewedThisWeekForCard = card.times_reviewed_this_week || 0;

    if (timesReviewedTodayForCard >= MAX_DAILY_REVIEWS_PER_CARD && card.mastery_level !== 5) {
      console.log("Limite de revisões diárias para este card atingido.");
      return; 
    }
    
    const newMasteryLevel = card.mastery_level === 5 ? 5 : Math.min(5, (card.mastery_level || 0) + 1);
    const reviewIncrement = card.mastery_level === 5 ? 0 : 1;

    try {
      const updatedData = {
        mastery_level: newMasteryLevel,
        times_reviewed: (card.times_reviewed || 0) + reviewIncrement,
        times_reviewed_today: timesReviewedTodayForCard + reviewIncrement,
        times_reviewed_this_week: timesReviewedThisWeekForCard + reviewIncrement,
        last_review_date: new Date().toISOString()
      };

      await Word.update(cardId, updatedData);

      setFlashcards(prev => prev.map(f => 
        f.id === cardId 
          ? { ...f, ...updatedData }
          : f
      ));
      
      localStorage.setItem('flashcard_updated', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      
    } catch (error) {
      console.error("Erro ao atualizar flashcard (Sei isso):", error);
    }
  };
  
  const filterFlashcardsByStatus = (cards, tab) => {
    switch (tab) {
      case "learning":
        return cards.filter(card => 
          (card.mastery_level || 0) > 0 && (card.mastery_level || 0) < 5
        );
      case "mastered":
        return cards.filter(card => (card.mastery_level || 0) === 5);
      case "not_started":
        return cards.filter(card => (card.mastery_level || 0) === 0);
      case "all":
      default:
        return cards;
    }
  };

  useEffect(() => {
    let tempFiltered = [...flashcards];
    
    if (searchTerm) {
      tempFiltered = tempFiltered.filter(card => 
        (card.english || card.input_word)?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (card.portuguese || card.output_translation)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (category !== "all") {
      tempFiltered = tempFiltered.filter(card => card.category === category);
    }

    if (languageFilter !== "all") {
      tempFiltered = tempFiltered.filter(card => card.output_language === languageFilter);
    }
    
    if (favoritesOnly) {
      tempFiltered = tempFiltered.filter(card => card.favorite);
    }
    
    tempFiltered = filterFlashcardsByStatus(tempFiltered, activeTab);
    
    tempFiltered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_date) - new Date(a.created_date);
        case "oldest":
          return new Date(a.created_date) - new Date(b.created_date);
        case "az":
          return (a.english || a.input_word).localeCompare(b.english || b.input_word);
        case "za":
          return (b.english || b.input_word).localeCompare(a.english || a.input_word);
        case "mastery_asc":
          return (a.mastery_level || 0) - (b.mastery_level || 0);
        case "mastery_desc":
          return (b.mastery_level || 0) - (a.mastery_level || 0);
        default:
          return 0;
      }
    });
    
    setFilteredFlashcards(tempFiltered);
  }, [flashcards, searchTerm, category, languageFilter, sortBy, favoritesOnly, activeTab]);

  const handleDeleteFlashcard = async (idToDelete) => {
    setFlashcards(prev => prev.filter(card => card.id !== idToDelete));
  };

  const handleToggleFavorite = (id, isFavorite) => {
    setFlashcards(prev => 
      prev.map(card => 
        card.id === id ? { ...card, favorite: isFavorite } : card
      )
    );
  };

  const handleMasteryChangeFromItem = (id, newMasteryLevel) => {
    setFlashcards(prev => 
      prev.map(card => {
        if (card.id === id) {
          const reviewIncrement = 1; // Assume this is a review, so increment by 1
          return { 
            ...card, 
            mastery_level: newMasteryLevel, 
            times_reviewed: (card.times_reviewed || 0) + reviewIncrement,
            times_reviewed_today: (card.times_reviewed_today || 0) + reviewIncrement,
            times_reviewed_this_week: (card.times_reviewed_this_week || 0) + reviewIncrement,
            last_review_date: new Date().toISOString()
          };
        }
        return card;
      })
    );
  };

  const getAvailableLanguagesForStudy = () => {
    const languageCounts = {};
    
    flashcards.forEach(card => {
      const outputLang = card.output_language || 'pt';
      if (languageCounts[outputLang]) {
        languageCounts[outputLang]++;
      } else {
        languageCounts[outputLang] = 1;
      }
    });

    return Object.entries(languageCounts).map(([code, count]) => ({
      code,
      count
    }));
  };

  const startStudyMode = (shuffled = false, selectedLanguage = null) => {
    let studySet = [];
    
    if (selectedLanguage && selectedLanguage !== 'all') {
      // Filtrar apenas flashcards do idioma selecionado
      studySet = flashcards.filter(card => card.output_language === selectedLanguage);
    } else if (activeTab === "all") {
      studySet = [...flashcards];
    } else {
      studySet = [...filteredFlashcards];
    }
    
    if (studySet.length > 20 && activeTab === "all" && (!selectedLanguage || selectedLanguage === 'all')) { 
        studySet = studySet.slice(0, 20);
    }
    
    if (shuffled) {
      for (let i = studySet.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [studySet[i], studySet[j]] = [studySet[j], studySet[i]];
      }
    }
    
    setStudyFlashcards(studySet);
    setCurrentStudyIndex(0);
    setFlippedInStudy(false);
    setStudyMode(true);
    
    // Reset session data
    setStudySessionData({
      studiedWords: [],
      showModal: false
    });
  };

  const handleStartStudy = (shuffled = false) => {
    const availableLanguages = getAvailableLanguagesForStudy();
    
    if (flashcards.length === 0) {
      // No flashcards to study, do nothing.
      return;
    }
    
    if (availableLanguages.length <= 1) { // If only one language or zero (shouldn't happen if flashcards.length > 0)
      // Only one language available, start directly with it
      startStudyMode(shuffled, availableLanguages.length === 1 ? availableLanguages[0].code : null);
    } else {
      // Multiple languages, show language selection modal
      setShowLanguageStudyModal({ open: true, shuffled });
    }
  };

  const handleLanguageSelection = (selectedLanguage, isShuffled = false) => {
    setShowLanguageStudyModal(null); // Close the modal
    startStudyMode(isShuffled, selectedLanguage);
  };

  const exitStudyMode = () => {
    setStudyMode(false);
    
    // Mostrar modal de sessão concluída se houver palavras estudadas
    if (studySessionData.studiedWords.length > 0) {
      setStudySessionData(prev => ({ ...prev, showModal: true }));
    }
    
    loadFlashcards(); 
  };

  const nextCardInStudy = async (markAsKnown) => {
    const currentCard = studyFlashcards[currentStudyIndex];
    if (!currentCard) {
      exitStudyMode();
      return;
    }

    if (markAsKnown) {
        const timesReviewedTodayForCard = currentCard.times_reviewed_today || 0;
        const timesReviewedThisWeekForCard = currentCard.times_reviewed_this_week || 0;
        
        if (currentCard.mastery_level < 5 && timesReviewedTodayForCard < MAX_DAILY_REVIEWS_PER_CARD) {
            const newMasteryLevel = Math.min(5, (currentCard.mastery_level || 0) + 1);
            
            const updatedCardData = { 
                mastery_level: newMasteryLevel,
                times_reviewed: (currentCard.times_reviewed || 0) + 1,
                times_reviewed_today: timesReviewedTodayForCard + 1,
                times_reviewed_this_week: timesReviewedThisWeekForCard + 1, // Increment weekly count
                last_review_date: new Date().toISOString()
            };

            try {
                await Word.update(currentCard.id, updatedCardData);
                
                const fullUpdatedCard = { ...currentCard, ...updatedCardData };
                
                setStudyFlashcards(prevStudyCards => prevStudyCards.map((card, index) => 
                    index === currentStudyIndex ? fullUpdatedCard : card
                ));

                // Add to studiedWords or update if already there
                setStudySessionData(prev => ({
                  ...prev,
                  studiedWords: prev.studiedWords.some(w => w.id === fullUpdatedCard.id)
                    ? prev.studiedWords.map(w => w.id === fullUpdatedCard.id ? fullUpdatedCard : w)
                    : [...prev.studiedWords, fullUpdatedCard],
                }));

                // Forçar atualização do dashboard da home
                localStorage.setItem('flashcard_updated', Date.now().toString());
                window.dispatchEvent(new Event('storage'));

            } catch (error) {
                console.error("Error updating card in study mode:", error);
            }
        } else {
            // Card is mastered or hit daily limit, but still add to studiedWords for session tracking
            setStudySessionData(prev => ({
                ...prev,
                studiedWords: prev.studiedWords.some(w => w.id === currentCard.id) 
                  ? prev.studiedWords 
                  : [...prev.studiedWords, currentCard],
            }));
        }
    } else if (currentCard) {
      // If not marked as known, just add to studiedWords if not already there
      setStudySessionData(prev => ({
        ...prev,
        studiedWords: prev.studiedWords.some(w => w.id === currentCard.id) 
          ? prev.studiedWords 
          : [...prev.studiedWords, currentCard]
      }));
    }

    if (currentStudyIndex < studyFlashcards.length - 1) {
      setCurrentStudyIndex(prev => prev + 1);
      setFlippedInStudy(false);
    } else {
      exitStudyMode();
    }
  };

  const prevCardInStudy = () => {
    if (currentStudyIndex > 0) {
      setCurrentStudyIndex(prev => prev - 1);
      setFlippedInStudy(false);
    }
  };

  const handleStudyAgain = () => {
    setStudySessionData(prev => ({ ...prev, showModal: false }));
    startStudyMode(showLanguageStudyModal?.shuffled || false, null); // Reinicia com as mesmas palavras (não aleatório)
  };

  const handleCloseSessionModal = () => {
    setStudySessionData(prev => ({ ...prev, showModal: false }));
  };

  const handleEditFlashcard = (flashcard) => {
    setEditingFlashcard({...flashcard}); 
    setEditDialogOpen(true);
  };

  const saveEditedFlashcard = async () => {
    if (!editingFlashcard) return;
    
    try {
      const { id, created_date, updated_date, created_by, ...dataToUpdate } = editingFlashcard;
      await Word.update(id, dataToUpdate);
      
      setFlashcards(prev => 
        prev.map(card => 
          card.id === editingFlashcard.id ? { ...card, ...dataToUpdate } : card
        )
      );
      setEditDialogOpen(false);
      setEditingFlashcard(null);
    } catch (error) {
      console.error("Erro ao atualizar flashcard:", error);
    }
  };

  const handleShowDetails = (flashcard) => {
    setSelectedFlashcard(flashcard);
    setDetailsOpen(true);
  };

  const getMasteryLabel = (level) => {
    const labels = ["Novo", "Nível 1", "Nível 2", "Nível 3", "Nível 4", "Dominado"];
    return labels[level || 0];
  };

  const getMasteryColor = (level) => {
    const colors = [
      "bg-gray-100 text-gray-600",  
      "bg-red-100 text-red-600",    
      "bg-orange-100 text-orange-600", 
      "bg-yellow-100 text-yellow-600", 
      "bg-lime-100 text-lime-600",  
      "bg-green-100 text-green-600" 
    ];
    return colors[level || 0];
  };

  const playAudio = (text, languageCode = 'en', rate = 1.0) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
      console.error("Speech Synthesis not supported.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    
    // Definir idioma correto baseado no código
    const languageMap = {
      'pt': 'pt-BR',
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR'
    };
    
    // Ensure languageCode is valid for the map, default to 'en' if not found
    const actualLangCode = languageCode in languageMap ? languageCode : 'en';
    utterance.lang = languageMap[actualLangCode] || 'en-US';

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Procurar voz específica para o idioma (melhor qualidade)
      let selectedVoice = null;
      
      // Prioridade 1: Vozes do sistema nativo (melhor qualidade)
      const preferredVoices = {
        'pt': ['Google português do Brasil', 'Microsoft Maria - Portuguese (Brazil)', 'Luciana', 'Joana'],
        'en': ['Google US English', 'Microsoft David - English (United States)', 'Samantha', 'Alex'],
        'es': ['Google español', 'Microsoft Helena - Spanish (Spain)', 'Monica', 'Jorge'],
        'fr': ['Google français', 'Microsoft Hortense - French (France)', 'Amelie', 'Thomas']
      };
      
      // Tentar encontrar uma voz preferida
      if (preferredVoices[actualLangCode]) {
        selectedVoice = voices.find(v => 
          preferredVoices[actualLangCode].some(preferred => 
            v.name.toLowerCase().includes(preferred.toLowerCase())
          ) && v.lang.startsWith(actualLangCode)
        );
      }
      
      // Prioridade 2: Qualquer voz nativa do idioma específico
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang === utterance.lang && v.localService
        );
      }
      
      // Prioridade 3: Qualquer voz do idioma (mesmo que não seja nativa)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith(actualLangCode) || v.lang === utterance.lang
        );
      }
      
      // Prioridade 4: Voz padrão se nada for encontrado
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
  
  const handleBulkDeleteFiltered = async () => {
    if (filteredFlashcards.length === 0) return;
    setIsLoading(true);
    try {
      const deletePromises = filteredFlashcards.map(card => Word.delete(card.id));
      await Promise.all(deletePromises);
      await loadFlashcards();
    } catch (error) {
      console.error("Erro ao excluir flashcards filtrados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlashcardAdded = async () => {
    await incrementDailyAddedCount();
    await loadFlashcards(); 
  };

  if (isLoading && !studyMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando seus flashcards...</p>
        </div>
      </div>
    );
  }

  if (studyMode) {
    const currentCard = studyFlashcards[currentStudyIndex];
     if (!currentCard && studyFlashcards.length > 0 && currentStudyIndex >= studyFlashcards.length) {
        exitStudyMode();
        return null;
    }
    if (!currentCard) {
        if (isLoading) return <div className="p-6 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /><p>Carregando...</p></div>;
        exitStudyMode();
        return <p className="p-6 text-center text-gray-600">Nenhum card para estudar nesta seleção.</p>;
    }
    
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Header Mobile Otimizado */}
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
              Modo de Estudo ({currentStudyIndex + 1} de {studyFlashcards.length})
            </h1>
            <Button 
              variant="outline" 
              onClick={exitStudyMode}
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
                onClick={prevCardInStudy}
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
                      onClick={() => nextCardInStudy(false)} 
                      className="border-orange-200 text-orange-600 hover:bg-orange-50 flex-1 sm:flex-none h-11 px-3 sm:px-5 text-base"
                    >
                      Revisar Depois
                    </Button>
                 )}
                  
                  <Button
                    onClick={() => flippedInStudy ? nextCardInStudy(true) : setFlippedInStudy(true)}
                    className={`h-11 px-5 text-base flex-1 sm:flex-none ${
                      !flippedInStudy ? "bg-blue-600 hover:bg-blue-700" 
                      : (currentCard.mastery_level === 5 || (currentCard.times_reviewed_today || 0) >= MAX_DAILY_REVIEWS_PER_CARD ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")
                    }`}
                    disabled={flippedInStudy && (currentCard.mastery_level === 5 || (currentCard.times_reviewed_today || 0) >= MAX_DAILY_REVIEWS_PER_CARD)}
                  >
                    {!flippedInStudy ? (
                        "Ver Tradução"
                    ) : (
                        <><CheckSquare className="w-4 h-4 mr-2" /> {currentCard.mastery_level === 5 ? "Dominado!" : "Sei isso"}</>
                    )}
                  </Button>
              </div>
               
              <Button
                onClick={() => nextCardInStudy(false)}
                variant="outline"
                className="border-gray-200 w-full sm:w-auto h-11 px-5 text-base"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Modal de Sessão Concluída */}
        <StudySessionModal
          isOpen={studySessionData.showModal}
          onClose={handleCloseSessionModal}
          studiedWords={studySessionData.studiedWords}
          onStudyAgain={handleStudyAgain}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Meus Flashcards</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Gerencie e estude sua coleção personalizada de palavras
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleStartStudy(true)}
              disabled={flashcards.length === 0}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto h-11 min-h-[44px] text-base px-4"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Estudo Aleatório
            </Button>
            
            <Button
              onClick={() => handleStartStudy(false)}
              disabled={flashcards.length === 0}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 min-h-[44px] text-base px-4"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Iniciar Estudo
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:gap-6">
          <div className="lg:flex-1 flex flex-col w-full">
            <DailyGoalWidget 
              dailyGoal={dailyGoal}
              weeklyGoal={weeklyGoal}
              dailyProgress={wordsAddedToday}
              weeklyProgress={wordsAddedThisWeek}
              onDailyGoalSet={async (newGoalValue) => {
                await User.updateMyUserData({ daily_goal: newGoalValue });
                setDailyGoal(newGoalValue); 
                setShowInitialGoalSetup(false);
              }}
              onWeeklyGoalSet={async (newGoalValue) => {
                await User.updateMyUserData({ weekly_goal: newGoalValue });
                setWeeklyGoal(newGoalValue);
              }}
              onResetProgress={resetDailyProgress}
              // Update key to include new state variables
              key={`${dailyGoal}-${weeklyGoal}-${wordsAddedToday}-${wordsAddedThisWeek}-${weeklyReviewCount}`}
            />
            
            <Card className="flex-grow">
              <CardHeader className="pb-4 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <nav
                      role="tablist"
                      className="flex overflow-x-auto whitespace-nowrap pb-2 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0"
                    >
                      <TabsList className="flex-1 text-sm sm:text-base">
                        <TabsTrigger value="all" className="flex-shrink-0 px-3 sm:px-4 py-2">
                          Todos ({userStats.totalCards})
                        </TabsTrigger>
                        <TabsTrigger value="learning" className="flex-shrink-0 px-3 sm:px-4 py-2">
                          Aprendendo ({userStats.learningCards})
                        </TabsTrigger>
                        <TabsTrigger value="mastered" className="flex-shrink-0 px-3 sm:px-4 py-2">
                          Dominados ({userStats.masteredCards})
                        </TabsTrigger>
                        <TabsTrigger value="not_started" className="flex-shrink-0 px-3 sm:px-4 py-2">
                          Não Estudados ({userStats.newCards})
                        </TabsTrigger>
                      </TabsList>
                    </nav>
                  </Tabs>
                  
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge variant="outline" className="text-sm py-1 px-2">
                      {filteredFlashcards.length} {filteredFlashcards.length === 1 ? 'flashcard' : 'flashcards'}
                    </Badge>
                    <div className="flex border rounded-md overflow-hidden">
                      <Button 
                        variant={viewMode === "list" ? "default" : "ghost"} 
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-none border-0 p-2 h-9"
                      >
                        <List className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant={viewMode === "grid" ? "default" : "ghost"} 
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-none border-0 p-2 h-9"
                      >
                        <Grid className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pb-0 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
                  <div className="flex-1 min-w-[200px] sm:min-w-[240px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        placeholder="Pesquisar flashcards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 text-base"
                      />
                    </div>
                  </div>
                  
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] h-11 text-base">
                      <Filter className="h-5 w-5 mr-2" />
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-base">Todas Categorias</SelectItem>
                      <SelectItem value="basic" className="text-base">Básico</SelectItem>
                      <SelectItem value="intermediate" className="text-base">Intermediário</SelectItem>
                      <SelectItem value="advanced" className="text-base">Avançado</SelectItem>
                      <SelectItem value="business" className="text-base">Negócios</SelectItem>
                      <SelectItem value="travel" className="text-base">Viagem</SelectItem>
                      <SelectItem value="food" className="text-base">Comida</SelectItem>
                      <SelectItem value="technology" className="text-base">Tecnologia</SelectItem>
                      <SelectItem value="nature" className="text-base">Natureza</SelectItem>
                      <SelectItem value="entertainment" className="text-base">Entretenimento</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={languageFilter} onValueChange={setLanguageFilter}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] h-11 text-base">
                      <Layers className="h-5 w-5 mr-2" />
                      <SelectValue placeholder="Idioma de Saída" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-base">Todos os Idiomas</SelectItem>
                      {Object.values(LANGUAGES).map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-base">
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] h-11 text-base">
                      {sortBy.includes('asc') || sortBy.includes('az') ? <SortAsc className="h-5 w-5 mr-2" /> : <SortDesc className="h-5 w-5 mr-2" />}
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest" className="text-base">Mais recentes</SelectItem>
                      <SelectItem value="oldest" className="text-base">Mais antigos</SelectItem>
                      <SelectItem value="az" className="text-base">A-Z</SelectItem>
                      <SelectItem value="za" className="text-base">Z-A</SelectItem>
                      <SelectItem value="mastery_asc" className="text-base">Domínio (menor)</SelectItem>
                      <SelectItem value="mastery_desc" className="text-base">Domínio (maior)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant={favoritesOnly ? "default" : "outline"}
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    className={`w-full sm:w-auto h-11 text-base min-h-[44px] px-4 ${favoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-gray-200"}`}
                  >
                    {favoritesOnly ? (
                      <>
                        <StarOff className="h-5 w-5 mr-2" />
                        Mostrar Todos
                      </>
                    ) : (
                      <>
                        <Star className="h-5 w-5 mr-2" />
                        Apenas Favoritos
                      </>
                    )}
                  </Button>
                </div>
                
                {isLoading ? (
                     <div className="text-center py-16 border-t border-gray-100">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-base">Carregando...</p>
                    </div>
                ) : filteredFlashcards.length === 0 ? (
                  <div className="text-center py-16 border-t border-gray-100">
                    {flashcards.length === 0 ? (
                      <div>
                        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                          Você ainda não tem flashcards
                        </h3>
                        <p className="text-gray-500 mb-6 text-base">
                          Pesquise palavras em inglês e salve-as como flashcards para estudar depois
                        </p>
                        <Button 
                          onClick={() => navigate(createPageUrl("Search"))}
                          className="bg-blue-600 hover:bg-blue-700 h-11 min-h-[44px] text-base px-5"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Criar Flashcards
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                          Nenhum flashcard encontrado
                        </h3>
                        <p className="text-gray-500 text-base">
                          Tente ajustar seus filtros ou mudar de aba para encontrar o que procura.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 border-t border-gray-100 pt-6">
                        <AnimatePresence>
                          {filteredFlashcards.map((flashcard) => (
                            <motion.div 
                              key={flashcard.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="h-full"
                            >
                              <FlashcardItem
                                word={flashcard}
                                onDelete={handleDeleteFlashcard} 
                                onToggleFavorite={handleToggleFavorite} 
                                onEditMastery={handleIKnowThis} 
                                onEdit={handleEditFlashcard}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : ( 
                      <div className="overflow-x-auto border-t border-gray-100 pt-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-base">Inglês</TableHead>
                              <TableHead className="text-base">Português</TableHead>
                              <TableHead className="text-base hidden md:table-cell">Categoria</TableHead>
                              <TableHead className="text-base hidden sm:table-cell">Nível</TableHead>
                              <TableHead className="text-right text-base">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredFlashcards.map((flashcard) => (
                              <TableRow key={flashcard.id}>
                                <TableCell className="font-medium flex items-center gap-2 text-base">
                                  {flashcard.favorite && (
                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                  )}
                                  {flashcard.input_word || flashcard.english}
                                </TableCell>
                                <TableCell className="text-base">{flashcard.output_translation || flashcard.portuguese}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant="outline" className="capitalize text-sm py-1 px-2">
                                    {flashcard.category?.replace('_', ' ') || "basic"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge className={`${getMasteryColor(flashcard.mastery_level)} text-sm py-1 px-2`}>
                                    {getMasteryLabel(flashcard.mastery_level)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => handleShowDetails(flashcard)} className="p-2 h-9">
                                      <ChevronRight className="w-5 h-5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-6 pb-4 gap-3 sm:gap-2 px-4 sm:px-6">
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Search"))}
                  className="border-blue-200 text-blue-600 w-full sm:w-auto h-11 min-h-[44px] text-base"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Adicionar mais palavras
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto h-11 min-h-[44px] text-base"
                      disabled={filteredFlashcards.length === 0 || isLoading}
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      Excluir {filteredFlashcards.length > 0 ? `${filteredFlashcards.length} ` : ''}Flashcards
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl">Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        Esta ação excluirá permanentemente {filteredFlashcards.length} {filteredFlashcards.length === 1 ? 'flashcard' : 'flashcards'} que correspondem aos seus filtros e aba atuais.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="h-10 text-base">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 h-10 text-base"
                        onClick={handleBulkDeleteFiltered}
                        disabled={isLoading}
                      >
                        {isLoading ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
          
          <div className="lg:w-1/3 lg:max-w-sm mt-6 lg:mt-0 w-full">
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl">Estatísticas</CardTitle>
                <CardDescription className="text-sm sm:text-base">Seu progresso de aprendizado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-4 sm:px-6 text-base">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total de flashcards</span>
                    <span className="font-medium">{userStats.totalCards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Palavras favoritas</span>
                    <span className="font-medium">{userStats.favoritedCards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Palavras dominadas</span>
                    <span className="font-medium">{userStats.masteredCards}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Categorias populares</h4>
                  <div className="space-y-2">
                    {userStats.categories.slice(0, 5).map(cat => (
                      <div 
                        key={cat.name} 
                        className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                      >
                        <span className="text-gray-700 capitalize">
                          {cat.name.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" className="text-sm py-1 px-2">
                          {cat.count} {cat.count === 1 ? 'palavra' : 'palavras'}
                        </Badge>
                      </div>
                    ))}
                    {userStats.categories.length === 0 && <p className="text-sm text-gray-500">Nenhuma categoria ainda.</p>}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Níveis de domínio</h4>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.round((userStats.masteredCards / (userStats.totalCards || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 text-blue-700 p-2 rounded-md">
                      <p className="text-xl font-bold">{userStats.newCards}</p>
                      <p className="text-xs">Não iniciados</p>
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 p-2 rounded-md">
                      <p className="text-xl font-bold">{userStats.learningCards}</p>
                      <p className="text-xs">Aprendendo</p>
                    </div>
                    <div className="bg-green-50 text-green-700 p-2 rounded-md">
                      <p className="text-xl font-bold">{userStats.masteredCards}</p>
                      <p className="text-xs">Dominados</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Modal de detalhes do flashcard */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-xl sm:text-2xl">
                <span>{selectedFlashcard?.input_word || selectedFlashcard?.english}</span>
                <div className="flex items-center gap-2">
                  {selectedFlashcard && (
                    <>
                      <Badge className={`${getMasteryColor(selectedFlashcard.mastery_level)} py-1 px-2 text-sm`}>
                        {getMasteryLabel(selectedFlashcard.mastery_level)}
                      </Badge>
                      <Badge className="capitalize bg-blue-100 text-blue-800 py-1 px-2 text-sm">
                        {selectedFlashcard?.category?.replace('_', ' ') || "basic"}
                      </Badge>
                    </>
                  )}
                </div>
              </DialogTitle>
              <DialogDescription className="text-lg sm:text-xl text-gray-800">
                {selectedFlashcard?.output_translation || selectedFlashcard?.portuguese}
              </DialogDescription>
            </DialogHeader>
            
            {selectedFlashcard && (
              <div className="grid gap-6 py-4 text-base">
                {selectedFlashcard.image_url && (
                  <div className="rounded-md overflow-hidden border border-gray-200">
                    <img 
                      src={selectedFlashcard.image_url} 
                      alt={selectedFlashcard.input_word || selectedFlashcard.english} 
                      className="w-full h-56 sm:h-64 object-cover" 
                    />
                  </div>
                )}
                
                {selectedFlashcard.example && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Exemplo:</h3>
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <p className="text-gray-800 italic">"{selectedFlashcard.example}"</p>
                      {selectedFlashcard.example_translation && (
                        <p className="text-gray-600 mt-2">"{selectedFlashcard.example_translation}"</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
             <DialogFooter className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-3 sm:gap-2">
                <div className="flex gap-2 w-full sm:w-auto">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="border-red-200 text-red-600 hover:bg-red-50 flex-1 sm:flex-none h-11 min-h-[44px] text-base"
                            >
                              <Trash2 className="w-5 w-5 mr-2" />
                              Excluir
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl">Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription className="text-base">
                                Deseja excluir o flashcard "{selectedFlashcard?.english}"?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="h-10 text-base">Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700 h-10 text-base"
                                onClick={async () => {
                                    if (selectedFlashcard) {
                                    await Word.delete(selectedFlashcard.id);
                                    handleDeleteFlashcard(selectedFlashcard.id); 
                                    setDetailsOpen(false);
                                    }
                                }}
                                >Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button 
                      variant="outline" 
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none h-11 min-h-[44px] text-base"
                      onClick={() => {
                        if (selectedFlashcard) {
                            handleEditFlashcard(selectedFlashcard);
                            setDetailsOpen(false);
                        }
                      }}
                    >
                      <Pencil className="w-5 w-5 mr-2" />
                      Editar
                    </Button>
                  </div>
                  
                  <div>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 min-h-[44px] text-base"
                      onClick={async () => {
                        if (selectedFlashcard) {
                            handleIKnowThis(selectedFlashcard.id); 
                            setDetailsOpen(false);
                        }
                      }}
                      disabled={!selectedFlashcard || selectedFlashcard.mastery_level === 5 || (selectedFlashcard.times_reviewed_today || 0) >= MAX_DAILY_REVIEWS_PER_CARD}
                    >
                      <CheckSquare className="w-5 w-5 mr-2" />
                      Sei isso
                    </Button>
                  </div>
             </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog de edição de flashcard */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Editar Flashcard</DialogTitle>
              <DialogDescription className="text-base">
                Modifique as informações do flashcard conforme necessário.
              </DialogDescription>
            </DialogHeader>
            
            {editingFlashcard && (
              <div className="grid gap-4 py-4 text-base">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="english" className="text-right text-sm col-span-1">
                    Inglês
                  </label>
                  <Input
                    id="english"
                    value={editingFlashcard.input_word || ''}
                    onChange={(e) => setEditingFlashcard({...editingFlashcard, input_word: e.target.value})}
                    className="col-span-3 h-11 text-base"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="portuguese" className="text-right text-sm col-span-1">
                    Português
                  </label>
                  <Input
                    id="portuguese"
                    value={editingFlashcard.output_translation || ''}
                    onChange={(e) => setEditingFlashcard({...editingFlashcard, output_translation: e.target.value})}
                    className="col-span-3 h-11 text-base"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="example" className="text-right text-sm col-span-1">
                    Exemplo
                  </label>
                  <Input
                    id="example"
                    value={editingFlashcard.example || ''}
                    onChange={(e) => setEditingFlashcard({...editingFlashcard, example: e.target.value})}
                    className="col-span-3 h-11 text-base"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="example_translation" className="text-right text-sm col-span-1">
                    Tradução Ex.
                  </label>
                  <Input
                    id="example_translation"
                    value={editingFlashcard.example_translation || ''}
                    onChange={(e) => setEditingFlashcard({...editingFlashcard, example_translation: e.target.value})}
                    className="col-span-3 h-11 text-base"
                  />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="image_url" className="text-right text-sm col-span-1">
                    URL Imagem
                  </label>
                  <Input
                    id="image_url"
                    value={editingFlashcard.image_url || ''}
                    onChange={(e) => setEditingFlashcard({...editingFlashcard, image_url: e.target.value})}
                    className="col-span-3 h-11 text-base"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="category" className="text-right text-sm col-span-1">
                    Categoria
                  </label>
                  <Select
                    value={editingFlashcard.category || 'basic'}
                    onValueChange={(value) => setEditingFlashcard({...editingFlashcard, category: value})}
                  >
                    <SelectTrigger className="col-span-3 h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic" className="text-base">Básico</SelectItem>
                      <SelectItem value="intermediate" className="text-base">Intermediário</SelectItem>
                      <SelectItem value="advanced" className="text-base">Avançado</SelectItem>
                      <SelectItem value="business" className="text-base">Negócios</SelectItem>
                      <SelectItem value="travel" className="text-base">Viagem</SelectItem>
                      <SelectItem value="food" className="text-base">Comida</SelectItem>
                      <SelectItem value="technology" className="text-base">Tecnologia</SelectItem>
                      <SelectItem value="nature" className="text-base">Natureza</SelectItem>
                      <SelectItem value="entertainment" className="text-base">Entretenimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="mastery_level_edit" className="text-right text-sm col-span-1">
                        Nível Dom.
                    </label>
                    <Select
                        value={String(editingFlashcard.mastery_level || 0)}
                        onValueChange={(value) => setEditingFlashcard({...editingFlashcard, mastery_level: Number(value)})}
                    >
                        <SelectTrigger className="col-span-3 h-11 text-base">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {[0,1,2,3,4,5].map(level => (
                            <SelectItem key={level} value={String(level)} className="text-base">{getMasteryLabel(level)}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingFlashcard(null); }} className="h-11 text-base px-5">
                Cancelar
              </Button>
              <Button onClick={saveEditedFlashcard} disabled={!editingFlashcard} className="h-11 text-base px-5 bg-blue-600 hover:bg-blue-700">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal de seleção de idioma para estudo */}
        <LanguageStudyModal
          isOpen={showLanguageStudyModal?.open || false}
          onClose={() => setShowLanguageStudyModal(null)}
          onSelectLanguage={(lang) => handleLanguageSelection(lang, showLanguageStudyModal?.shuffled || false)}
          availableLanguages={getAvailableLanguagesForStudy()}
        />

        {/* Modal de Sessão Concluída (Renderizado aqui para estar disponível fora do studyMode) */}
        <StudySessionModal
          isOpen={studySessionData.showModal}
          onClose={handleCloseSessionModal}
          studiedWords={studySessionData.studiedWords}
          onStudyAgain={handleStudyAgain}
        />
      </div>
    </div>
  );
}