import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Word } from '@/entities/Word';
import { Target, Trophy, Calendar, TrendingUp, Book, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

export default function UserProgressDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    weeklyGoal: 50,
    weeklyProgress: 0,
    dailyGoal: 10,
    dailyProgress: 0,
    totalFlashcards: 0,
    studyStreak: 0,
    weeklyReviews: 0
  });

  useEffect(() => {
    const loadUserProgress = async () => {
      try {
        const userData = await User.me();
        setIsAuthenticated(true);
        
        const words = await Word.list();
        
        // Calcular progresso da semana
        const now = new Date();
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(now.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        // Contar palavras ADICIONADAS esta semana (para meta semanal)
        const weeklyAdditions = words.filter(word => {
          const createdDate = new Date(word.created_date);
          return createdDate >= weekStart;
        }).length;

        // Contar TODAS as revisões (total geral)
        const totalReviews = words.reduce((count, word) => {
          return count + (word.times_reviewed || 0);
        }, 0);

        // Progresso diário (palavras adicionadas hoje)
        const today = new Date().toISOString().split('T')[0];
        const dailyProgress = userData.last_addition_date === today ? 
          (userData.words_added_today || 0) : 0;

        setStats({
          weeklyGoal: userData.weekly_goal || 50, // Usar meta semanal do usuário
          weeklyProgress: weeklyAdditions, // Usar palavras adicionadas na semana em vez de revisadas
          dailyGoal: userData.daily_goal || 10,
          dailyProgress: dailyProgress,
          totalFlashcards: words.length,
          studyStreak: userData.study_streak || 0,
          weeklyReviews: totalReviews
        });
        
      } catch (error) {
        console.error("Failed to load user progress:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProgress();
    
    // Adicionar um listener para recarregar quando voltar para a página
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserProgress();
      }
    };
    
    // Listener para recarregar quando um flashcard é atualizado ou adicionado
    const handleStorageChange = () => {
      loadUserProgress();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    
    // Recarregar a cada 30 segundos para manter atualizado
    const interval = setInterval(loadUserProgress, 30000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  if (isLoading) {
    return (
      <div className="relative">
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-100 rounded-full opacity-50"></div>
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-100 rounded-full opacity-50"></div>
        <Card className="relative bg-white rounded-2xl shadow-xl border border-gray-100">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative">
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-100 rounded-full opacity-50"></div>
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-100 rounded-full opacity-50"></div>
        <Card className="relative bg-white rounded-2xl shadow-xl border border-gray-100">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Acompanhe seu Progresso
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Faça login para ver suas estatísticas de aprendizado e conquistas pessoais.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">Metas</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-1">
                    <Trophy className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-600">Conquistas</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600">Progresso</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weeklyPercentage = Math.min(100, (stats.weeklyProgress / stats.weeklyGoal) * 100);
  const dailyPercentage = Math.min(100, (stats.dailyProgress / stats.dailyGoal) * 100);

  return (
    <div className="relative">
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-100 rounded-full opacity-50"></div>
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-100 rounded-full opacity-50"></div>
      <Card className="relative bg-white rounded-2xl shadow-xl border border-gray-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Seu Progresso</h3>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">{stats.studyStreak} dias</span>
            </div>
          </div>

          {/* Progresso Semanal */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Meta Semanal</span>
              <span className="text-sm text-gray-600">{stats.weeklyProgress}/{stats.weeklyGoal}</span>
            </div>
            <Progress value={weeklyPercentage} className="h-3 mb-1" />
            <p className="text-xs text-gray-500">{weeklyPercentage.toFixed(0)}% da meta semanal concluída</p>
          </div>

          {/* Progresso Diário */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Meta Diária</span>
              <span className="text-sm text-gray-600">{stats.dailyProgress}/{stats.dailyGoal}</span>
            </div>
            <Progress value={dailyPercentage} className="h-2" />
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Book className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-blue-700">{stats.totalFlashcards}</p>
              <p className="text-xs text-blue-600">Flashcards</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center">
              <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-700">{stats.weeklyReviews}</p>
              <p className="text-xs text-green-600">Total de revisões</p>
            </div>
          </div>

          {/* Motivação */}
          <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 text-center">
            <Star className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-purple-700 font-medium">
              {stats.studyStreak > 0 
                ? `Parabéns! Você está em uma sequência de ${stats.studyStreak} dias!` 
                : 'Comece sua jornada de aprendizado hoje!'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}