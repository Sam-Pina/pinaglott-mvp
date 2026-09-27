
import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { Word } from "@/entities/Word";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar, BookOpen, Trophy, BarChart2,
  Award, Clock, Loader2, CheckCircle,
  Brain, UserCog, LogOut, ChevronLeft, ChevronRight, Camera, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, parseISO, subDays, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import AchievementPopup from '../components/achievements/AchievementPopup';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flashcards, setFlashcards] = useState([]);
  const [studyLevel, setStudyLevel] = useState("beginner");
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("progress");
  const [displayDate, setDisplayDate] = useState(new Date());
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const [previousAchievements, setPreviousAchievements] = useState(new Set());

  const [stats, setStats] = useState({
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    newWords: 0,
    reviewedToday: 0,
    lastStudyDate: null,
    categoryDistribution: [],
    studyStreak: 0,
    averageMastery: 0,
    studyHistory: {},
    totalReviews: 0
  });

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const userData = await User.me();
        setUser(userData);
        setStudyLevel(userData.level || "beginner");
        setPreferredCategories(userData.preferred_categories || []);
        setAvatarUrl(userData.avatar_url);

        const wordsData = await Word.list();
        setFlashcards(wordsData);

        // This is now the definitive call to calculate and check everything.
        await calculateStats(wordsData, userData);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        if (error.message.includes("User not authenticated")) {
            navigate(createPageUrl("Home"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  const checkForNewAchievements = (newStats) => {
    const currentAchievements = new Set();
    
    // Verificar todas as conquistas
    const achievements = [
      'first_steps_1', 'first_steps_2', 'first_steps_3',
      'learner_1', 'learner_2', 'learner_3',
      'consistency_1', 'consistency_2', 'consistency_3',
      'collector_1', 'collector_2', 'collector_3',
      'vocabulary_growth_1', 'vocabulary_growth_2', 'vocabulary_growth_3',
      'weekly_habit_1', 'weekly_habit_2', 'weekly_habit_3'
    ];

    achievements.forEach(achievement => {
      if (isAchievementUnlocked(achievement, newStats)) {
        currentAchievements.add(achievement);
      }
    });

    // Verificar se há novas conquistas
    const newAchievements = [...currentAchievements].filter(
      achievement => !previousAchievements.has(achievement)
    );

    if (newAchievements.length > 0) {
      setShowAchievementPopup(true);
    }

    setPreviousAchievements(currentAchievements);
  };

  const calculateStats = async (words, userData) => {
    const totalWords = words.length;
    const masteredWords = words.filter(w => (w.mastery_level || 0) === 5).length;
    const learningWords = words.filter(w => (w.mastery_level || 0) > 0 && (w.mastery_level || 0) < 5).length;
    const newWords = words.filter(w => !w.mastery_level || w.mastery_level === 0).length;
    const totalMastery = words.reduce((sum, word) => sum + (word.mastery_level || 0), 0);
    const averageMastery = totalWords > 0 ? ((totalMastery / totalWords) * 2).toFixed(1) : 0;
    const totalReviews = words.reduce((sum, word) => sum + (word.times_reviewed || 0), 0);
    
    // Calcular palavras revisadas hoje baseado em times_reviewed_today
    const reviewedToday = words.reduce((sum, word) => sum + (word.times_reviewed_today || 0), 0);

    // Obter todas as datas com atividade (criação ou revisão)
    const activityDates = new Set();
    words.forEach(word => {
      if (word.created_date) {
        const createdDate = format(parseISO(word.created_date), 'yyyy-MM-dd');
        activityDates.add(createdDate);
      }
      if (word.last_review_date) {
        const reviewDate = format(parseISO(word.last_review_date), 'yyyy-MM-dd');
        activityDates.add(reviewDate);
      }
    });

    // Calcular sequência de estudo mais precisa
    const today = format(new Date(), 'yyyy-MM-dd');
    let studyStreak = 0;

    // Verificar se houve atividade hoje
    if (activityDates.has(today)) {
      studyStreak = 1;
      
      // Contar dias consecutivos para trás
      let currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - 1); // Começar de ontem
      
      while (true) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        if (activityDates.has(dateStr)) {
          studyStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    // Se não houve atividade hoje, sequência é 0

    // Determinar a data do último estudo
    let lastStudyDate = null;
    
    // Se houve revisões hoje, usar a data de hoje
    if (reviewedToday > 0) {
      lastStudyDate = new Date().toISOString();
    } else {
      // Caso contrário, usar a data mais recente de atividade
      const datesWithActivity = words.map(w => {
        const createdDate = w.created_date ? new Date(w.created_date) : null;
        const reviewDate = w.last_review_date ? new Date(w.last_review_date) : null;
        return reviewDate || createdDate;
      }).filter(date => date !== null).sort((a, b) => b - a);

      if (datesWithActivity.length > 0) {
        lastStudyDate = datesWithActivity[0].toISOString();
      }
    }

    const categories = {};
    words.forEach(word => {
      const category = word.category || "basic";
      categories[category] = (categories[category] || 0) + 1;
    });
    const categoryDistribution = Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const studyHistoryData = generateStudyHistory(words);

    const newStats = {
      totalWords,
      masteredWords,
      learningWords,
      newWords,
      reviewedToday,
      lastStudyDate,
      categoryDistribution,
      studyStreak,
      averageMastery,
      studyHistory: studyHistoryData,
      totalReviews
    };

    setStats(newStats);
    
    // On the first render, we populate the "previousAchievements" without showing the popup.
    // On subsequent renders (e.g., re-visiting the page), we check for new achievements.
    if (previousAchievements.size === 0) {
        const initialAchievements = new Set();
        const achievementsToCheck = [
          'first_steps_1', 'first_steps_2', 'first_steps_3',
          'learner_1', 'learner_2', 'learner_3',
          'consistency_1', 'consistency_2', 'consistency_3',
          'collector_1', 'collector_2', 'collector_3',
          'vocabulary_growth_1', 'vocabulary_growth_2', 'vocabulary_growth_3',
          'weekly_habit_1', 'weekly_habit_2', 'weekly_habit_3'
        ];
        achievementsToCheck.forEach(ach => {
            if (isAchievementUnlocked(ach, newStats)) {
                initialAchievements.add(ach);
            }
        });
        setPreviousAchievements(initialAchievements);
    } else {
        checkForNewAchievements(newStats);
    }

    try {
      await User.updateMyUserData({
        level: userData.level,
        preferred_categories: userData.preferred_categories,
        study_streak: studyStreak,
        words_learned: masteredWords,
      });
    } catch (error) {
      console.error("Erro ao atualizar dados do usuário:", error);
    }

    return newStats; 
  };

  const calculateStudyStreak = (words) => {
    // Esta função agora é chamada apenas para compatibilidade
    // A lógica principal está em calculateStats
    const activityDates = new Set();
    words.forEach(word => {
      if (word.created_date) activityDates.add(format(parseISO(word.created_date), 'yyyy-MM-dd'));
      if (word.last_review_date) activityDates.add(format(parseISO(word.last_review_date), 'yyyy-MM-dd'));
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (!activityDates.has(today)) {
      return 0; // Se não estudou hoje, sequência é 0
    }

    let streak = 1; // Começar com 1 (dia de hoje)
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Começar de ontem

    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      if (activityDates.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const generateStudyHistory = (words) => {
    const activityMap = {};
    words.forEach(word => {
      if (word.created_date) {
        const date = format(parseISO(word.created_date), 'yyyy-MM-dd');
        activityMap[date] = (activityMap[date] || 0) + 1;
      }
      if (word.last_review_date) {
        const date = format(parseISO(word.last_review_date), 'yyyy-MM-dd');
        activityMap[date] = (activityMap[date] || 0) + (word.times_reviewed > 0 ? word.times_reviewed : 1);
      }
    });
    const history = {};
    let date = new Date();
    for (let i = 0; i < 30; i++) {
        const dateKey = format(date, 'yyyy-MM-dd');
        history[dateKey] = activityMap[dateKey] || 0;
        date = subDays(date, 1);
    }
    return history;
  };

  const renderCalendar = (dateToDisplay) => {
    const year = dateToDisplay.getFullYear();
    const month = dateToDisplay.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const today = new Date();

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = format(new Date(year, month, day), 'yyyy-MM-dd');
      const hasActivity = stats.studyHistory && stats.studyHistory[dateString];
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      days.push(
        <div
          key={day}
          className={`h-8 w-8 flex items-center justify-center text-xs rounded-full ${
            hasActivity
              ? 'bg-green-500 text-white font-medium'
              : isToday
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {day}
        </div>
      );
    }

    const monthActivities = Object.keys(stats.studyHistory || {}).filter(day => format(parseISO(day), 'yyyy-MM') === format(dateToDisplay, 'yyyy-MM'));

    if (monthActivities.length === 0) {
      return <div className="text-center py-8 text-gray-500">Sem atividades neste mês.</div>;
    }

    return (
      <>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dayName => (
            <div key={dayName} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-500">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
        <div className="mt-4 text-xs text-center text-gray-500">
          <span className="inline-flex items-center mr-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            Dias com atividade
          </span>
          <span className="inline-flex items-center">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full mr-1"></div>
            Hoje
          </span>
        </div>
      </>
    );
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({
        level: studyLevel,
        preferred_categories: preferredCategories,
        words_learned: stats.masteredWords,
        study_streak: stats.studyStreak,
      });
      setUser(prevUser => ({
        ...prevUser,
        level: studyLevel,
        preferred_categories: preferredCategories
      }));
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCategory = (category) => {
    if (preferredCategories.includes(category)) {
      setPreferredCategories(prev => prev.filter(cat => cat !== category));
    } else {
      setPreferredCategories(prev => [...prev, category]);
    }
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { file_url } = await UploadFile({ file });
      await User.updateMyUserData({ avatar_url: file_url });
      setAvatarUrl(file_url);
    } catch (error) {
            console.error("Erro ao fazer upload do avatar:", error);
            // Optionally, show a toast or alert to the user
        } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await User.updateMyUserData({ avatar_url: null });
      setAvatarUrl(null);
    } catch (error) {
      console.error("Erro ao remover avatar:", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getAchievementProgress = (achievement, statsData = stats) => {
    const achievementConfig = {
      // Primeiros Passos (1/3, 2/3, 3/3)
      'first_steps_1': { target: 10, current: statsData.totalWords },
      'first_steps_2': { target: 25, current: statsData.totalWords },
      'first_steps_3': { target: 50, current: statsData.totalWords },
      
      // Aprendiz (1/3, 2/3, 3/3)
      'learner_1': { target: 5, current: statsData.masteredWords },
      'learner_2': { target: 15, current: statsData.masteredWords },
      'learner_3': { target: 30, current: statsData.masteredWords },
      
      // Consistência (1/3, 2/3, 3/3)
      'consistency_1': { target: 3, current: statsData.studyStreak },
      'consistency_2': { target: 7, current: statsData.studyStreak },
      'consistency_3': { target: 15, current: statsData.studyStreak },
      
      // Colecionador (1/3, 2/3, 3/3)
      'collector_1': { target: 50, current: statsData.totalWords },
      'collector_2': { target: 100, current: statsData.totalWords },
      'collector_3': { target: 200, current: statsData.totalWords },
      
      // Vocabulário Crescente (1/3, 2/3, 3/3)
      'vocabulary_growth_1': { target: 25, current: statsData.masteredWords },
      'vocabulary_growth_2': { target: 50, current: statsData.masteredWords },
      'vocabulary_growth_3': { target: 100, current: statsData.masteredWords },
      
      // Hábito Semanal (1/3, 2/3, 3/3)
      'weekly_habit_1': { target: 7, current: statsData.studyStreak },
      'weekly_habit_2': { target: 14, current: statsData.studyStreak },
      'weekly_habit_3': { target: 30, current: statsData.studyStreak }
    };

    const config = achievementConfig[achievement];
    if (!config || config.target === 0) return 0;

    return Math.min(100, (config.current / config.target) * 100);
  };

  const isAchievementUnlocked = (achievementKey, statsData = stats) => getAchievementProgress(achievementKey, statsData) >= 100;

  const getCurrentAchievementLevel = (baseAchievement, statsData = stats) => {
    // Determinar qual nível da conquista mostrar (1, 2 ou 3)
    // If level 3 is unlocked, display level 3 (all completed)
    if (isAchievementUnlocked(`${baseAchievement}_3`, statsData)) return 3;
    // If level 2 is unlocked, display level 3 (next target)
    if (isAchievementUnlocked(`${baseAchievement}_2`, statsData)) return 3;
    // If level 1 is unlocked, display level 2 (next target)
    if (isAchievementUnlocked(`${baseAchievement}_1`, statsData)) return 2;
    // Otherwise, display level 1
    return 1;
  };

  const getAchievementData = (baseAchievement, statsData = stats) => {
    const level = getCurrentAchievementLevel(baseAchievement, statsData);
    const achievementKey = `${baseAchievement}_${level}`;
    
    const achievementInfo = {
      'first_steps': {
        title: 'Primeiros Passos',
        description: level === 1 ? 'Adicione 10 palavras' : level === 2 ? 'Adicione 25 palavras' : 'Adicione 50 palavras',
        icon: 'Award',
        progress: getAchievementProgress(achievementKey, statsData),
        current: statsData.totalWords,
        target: level === 1 ? 10 : level === 2 ? 25 : 50,
        level: level
      },
      'learner': {
        title: 'Aprendiz',
        description: level === 1 ? 'Domine 5 palavras' : level === 2 ? 'Domine 15 palavras' : 'Domine 30 palavras',
        icon: 'Brain',
        progress: getAchievementProgress(achievementKey, statsData),
        current: statsData.masteredWords,
        target: level === 1 ? 5 : level === 2 ? 15 : 30,
        level: level
      },
      'consistency': {
        title: 'Consistência',
        description: level === 1 ? 'Estude por 3 dias consecutivos' : level === 2 ? 'Estude por 7 dias consecutivos' : 'Estude por 15 dias consecutivos',
        icon: 'Calendar',
        progress: getAchievementProgress(achievementKey, statsData),
        current: statsData.studyStreak,
        target: level === 1 ? 3 : level === 2 ? 7 : 15,
        level: level
      },
      'collector': {
        title: 'Colecionador',
        description: level === 1 ? 'Adicione 50 palavras' : level === 2 ? 'Adicione 100 palavras' : 'Adicione 200 palavras',
        icon: 'BookOpen',
        progress: getAchievementProgress(achievementKey, statsData),
        current: statsData.totalWords,
        target: level === 1 ? 50 : level === 2 ? 100 : 200,
        level: level
      },
      'vocabulary_growth': {
        title: 'Vocabulário Crescente',
        description: level === 1 ? 'Domine 25 palavras' : level === 2 ? 'Domine 50 palavras' : 'Domine 100 palavras',
        icon: 'Trophy',
        progress: getAchievementProgress(achievementKey, statsData),
        current: statsData.masteredWords,
        target: level === 1 ? 25 : level === 2 ? 50 : 100,
        level: level
      },
      'weekly_habit': {
        title: 'Hábito Semanal',
        description: level === 1 ? 'Estude por 7 dias consecutivos' : level === 2 ? 'Estude por 14 dias consecutivos' : 'Estude por 30 dias consecutivos',
        icon: 'BarChart2',
        progress: getAchievementProgress(achievementKey, statsData),
        current: statsData.studyStreak,
        target: level === 1 ? 7 : level === 2 ? 14 : 30,
        level: level
      }
    };

    return achievementInfo[baseAchievement];
  };

  const handleViewAchievements = () => {
    setShowAchievementPopup(false);
    setActiveTab('achievements');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600">Não foi possível carregar os dados do usuário. Tente novamente mais tarde.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User profile */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle>Perfil do Usuário</CardTitle>
              <CardDescription>Suas informações e preferências</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                />
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar do usuário" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}</span>
                    )}
                  </div>
                   {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                       <Loader2 className="w-6 h-6 mr-2 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-lg">{user.full_name || "Usuário"}</h3>
                  <span className="email-text text-gray-500 text-sm">{user.email}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current.click()}
                    disabled={isUploadingAvatar}
                    className="h-8 text-xs"
                  >
                    <Camera className="w-3 h-3 mr-2" />
                    Alterar Foto
                  </Button>
                  {avatarUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Remover Foto
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Nível de estudo
                </label>
                <Select value={studyLevel} onValueChange={setStudyLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">
                  Categorias de interesse
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "business", label: "Negócios" },
                    { id: "travel", label: "Viagem" },
                    { id: "food", label: "Comida" },
                    { id: "technology", label: "Tecnologia" },
                    { id: "nature", label: "Natureza" },
                    { id: "entertainment", label: "Entretenimento" }
                  ].map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleToggleCategory(category.id)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        preferredCategories.includes(category.id)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-800">Sequência de estudo: </span>
                <span className="font-bold">{stats.studyStreak} dias</span>
              </div>

              <div className="text-center">
                <Button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Preferências"
                  )}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="pt-2 justify-center">
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da conta
              </Button>
            </CardFooter>
          </Card>

          {/* Statistics and progress */}
          <Card className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-4 px-4 sm:px-6">
                <div className="flex flex-col">
                  {/* Título mobile (exibido acima das abas) */}
                  <CardTitle className="text-xl sm:text-2xl mb-4 lg:hidden">Estatísticas de Aprendizado</CardTitle>
                  <div className="flex justify-center">
                    <TabsList className="h-auto rounded-lg bg-gray-100 p-1 flex flex-wrap justify-center">
                      <TabsTrigger value="progress" className="px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:shadow-md">Progresso</TabsTrigger>
                      <TabsTrigger value="history" className="px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:shadow-md">Histórico</TabsTrigger>
                      <TabsTrigger value="achievements" className="px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:shadow-md">Conquistas</TabsTrigger>
                    </TabsList>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-6">
                <TabsContent value="progress" className="mt-0">
                  {/* Título desktop (exibido dentro da aba) */}
                  <div className="hidden lg:block mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Estatísticas de Aprendizado</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold">{stats.masteredWords}</h3>
                        <p className="text-gray-500 text-sm">Palavras dominadas</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 flex flex-col items-center">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                          <Brain className="w-6 h-6 text-yellow-600" />
                        </div>
                        <h3 className="text-2xl font-bold">{stats.learningWords}</h3>
                        <p className="text-gray-500 text-sm">Aprendendo</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 flex flex-col items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                          <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold">{stats.totalWords}</h3>
                        <p className="text-gray-500 text-sm">Total de palavras</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Distribuição por categoria</h3>
                    <div className="space-y-4">
                      {stats.categoryDistribution.length > 0 ? stats.categoryDistribution.map(category => (
                        <div key={category.name}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm capitalize">{category.name.replace("_", " ")}</span>
                            <span className="text-sm text-gray-500">
                              {category.count} ({stats.totalWords > 0 ? Math.round((category.count / stats.totalWords) * 100) : 0}%)
                            </span>
                          </div>
                          <Progress
                            value={stats.totalWords > 0 ? Math.round((category.count / stats.totalWords) * 100) : 0}
                            className="h-2"
                          />
                        </div>
                      )) : <p className="text-sm text-gray-500">Nenhuma categoria para exibir.</p>}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Progresso de domínio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Progresso geral</span>
                          <span className="text-sm font-medium">
                            {stats.masteredWords} de {stats.totalWords} palavras
                          </span>
                        </div>
                        <Progress
                          value={Math.round((stats.masteredWords / (stats.totalWords || 1)) * 100)}
                          className="h-2.5"
                        />
                        <div className="grid grid-cols-3 text-center mt-2">
                          <div className="text-sm">
                            <p className="font-medium text-blue-600">{stats.newWords}</p>
                            <p className="text-gray-500">Novas</p>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-yellow-600">{stats.learningWords}</p>
                            <p className="text-gray-500">Aprendendo</p>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-green-600">{stats.masteredWords}</p>
                            <p className="text-gray-500">Dominadas</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center">
                        <div className="w-24 h-24 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-indigo-700">{stats.averageMastery}</p>
                            <p className="text-xs text-indigo-600">de 10</p>
                          </div>
                        </div>
                        <p className="text-center text-gray-600">Nível médio de domínio</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Atividade recente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-gray-700">Palavras revisadas hoje</span>
                        </div>
                        <span className="font-medium">{stats.reviewedToday}</span>
                      </div>

                      <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                          <span className="text-gray-700">Sequência de estudo</span>
                        </div>
                        <span className="font-medium">{stats.studyStreak} dias</span>
                      </div>

                      <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <BarChart2 className="w-5 h-5 text-blue-500 mr-2" />
                          <span className="text-gray-700">Total de revisões</span>
                        </div>
                        <span className="font-medium">{stats.totalReviews}</span>
                      </div>

                      {stats.lastStudyDate && (
                        <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <Clock className="w-5 h-5 text-blue-500 mr-2" />
                            <span className="text-gray-700">Último estudo</span>
                          </div>
                          <span className="font-medium">
                            {format(new Date(stats.lastStudyDate), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => navigate(createPageUrl("Flashcards"))}
                            className="w-full sm:w-auto h-11 px-4 text-base text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Estudar agora
                        </Button>
                        <Button
                            onClick={() => navigate(createPageUrl("Search"))}
                            className="w-full sm:w-auto h-11 px-4 text-base bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Continuar Aprendendo
                        </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <div className="hidden lg:block mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Estatísticas de Aprendizado</h2>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2 sm:mb-4">
                        Atividade de Estudo <span className="block sm:inline">(últimos 30 dias)</span>
                    </h3>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex justify-between items-center mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setDisplayDate(prev => subMonths(prev, 1))}>
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h4 className="text-center font-medium capitalize">
                          {format(displayDate, 'MMMM \'de\' yyyy', { locale: ptBR })}
                        </h4>
                        <Button variant="ghost" size="icon" onClick={() => setDisplayDate(prev => addMonths(prev, 1))}>
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                      {renderCalendar(displayDate)}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Estatísticas de estudo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-gray-500 text-sm mb-1">Palavras aprendidas</p>
                          <p className="text-2xl font-bold">{stats.totalWords}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-gray-500 text-sm mb-1">Revisões</p>
                          <p className="text-2xl font-bold">{stats.totalReviews}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-gray-500 text-sm mb-1">Maior sequência</p>
                          <p className="text-2xl font-bold">{user?.study_streak_max || stats.studyStreak || 0} dias</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-gray-500 text-sm mb-1">Nível médio</p>
                          <p className="text-2xl font-bold">{stats.averageMastery} de 10</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="achievements" className="mt-0">
                  <div className="hidden lg:block mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Conquistas</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['first_steps', 'learner', 'consistency', 'collector', 'vocabulary_growth', 'weekly_habit'].map(baseAchievement => {
                      const achievement = getAchievementData(baseAchievement);
                      const isCompleted = achievement.progress >= 100;
                      
                      return (
                        <Card key={baseAchievement} className={`${isCompleted ? "border-green-200 bg-green-50" : "opacity-60"}`}>
                          <CardContent className="p-4 flex items-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mr-4 ${
                              isCompleted ? "bg-green-100" : "bg-gray-100"
                            }`}>
                              {achievement.icon === 'Award' && <Award className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />}
                              {achievement.icon === 'Brain' && <Brain className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />}
                              {achievement.icon === 'Calendar' && <Calendar className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />}
                              {achievement.icon === 'BookOpen' && <BookOpen className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />}
                              {achievement.icon === 'Trophy' && <Trophy className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />}
                              {achievement.icon === 'BarChart2' && <BarChart2 className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{achievement.title}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  achievement.level === 3 ? 'bg-yellow-100 text-yellow-700' : 
                                  achievement.level === 2 ? 'bg-blue-100 text-blue-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {achievement.level}/3
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">{achievement.description}</p>
                              <Progress
                                value={achievement.progress}
                                className="h-1.5 mt-2"
                              />
                              <p className="text-xs text-gray-500 mt-1">{achievement.current}/{achievement.target}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
      
      {/* Pop-up de conquista */}
      <AchievementPopup
        isVisible={showAchievementPopup}
        onClose={() => setShowAchievementPopup(false)}
        onViewAchievements={handleViewAchievements}
      />
    </div>
  );
}
