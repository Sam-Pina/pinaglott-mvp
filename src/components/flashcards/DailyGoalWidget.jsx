
import React, { useState } from 'react';
import { Target, Save, Edit3, Loader2, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { User } from '@/entities/User';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DailyGoalWidget({ 
  dailyGoal, 
  weeklyGoal, 
  dailyProgress, 
  weeklyProgress,
  onDailyGoalSet, 
  onWeeklyGoalSet,
  onResetProgress 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingType, setEditingType] = useState('daily'); // 'daily' or 'weekly'
  // Initialize newGoalValue to an empty string. It will be populated by openEditModal when needed.
  const [newGoalValue, setNewGoalValue] = useState(''); 
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveGoal = async () => {
    // Check for valid number, allowing 0 as a valid goal.
    // parseInt('') results in NaN, which will fail the check.
    // parseInt('5') is 5.
    // If newGoalValue is an empty string, it will be treated as invalid.
    const goalValue = parseInt(newGoalValue, 10);
    if (isNaN(goalValue) || goalValue < 0) {
      alert("Por favor, insira um valor válido para a meta (um número maior ou igual a zero).");
      return;
    }

    setIsSaving(true);
    try {
      if (editingType === 'daily') {
        await User.updateMyUserData({ daily_goal: goalValue });
        if (onDailyGoalSet) onDailyGoalSet(goalValue);
      } else {
        await User.updateMyUserData({ weekly_goal: goalValue });
        if (onWeeklyGoalSet) onWeeklyGoalSet(goalValue);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      alert("Não foi possível salvar a meta. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetProgress = async () => {
    setIsResetting(true);
    try {
      if (onResetProgress) {
        await onResetProgress();
      }
    } catch (error) {
      console.error("Erro ao resetar progresso:", error);
      alert("Não foi possível resetar o progresso. Tente novamente.");
    } finally {
      setIsResetting(false);
    }
  };
  
  const dailyProgressPercentage = dailyGoal > 0 ? Math.min(100, (dailyProgress / dailyGoal) * 100) : 0;
  const weeklyProgressPercentage = weeklyGoal > 0 ? Math.min(100, (weeklyProgress / weeklyGoal) * 100) : 0;

  const openEditModal = (type) => {
    setEditingType(type);
    // Ensure newGoalValue is set to the current prop value when opening the modal
    setNewGoalValue(type === 'daily' ? dailyGoal : weeklyGoal);
    setIsEditing(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Metas */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Meta Diária */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-baseline">
                <h3 className="font-medium text-gray-800 text-base">Meta Diária</h3>
                <span className="text-sm text-gray-500">{dailyProgress}/{dailyGoal}</span>
              </div>
              <Progress 
                value={dailyProgressPercentage} 
                className="w-full h-2 transition-all duration-300"
                indicatorClassName={dailyProgress >= dailyGoal && dailyGoal > 0 ? "bg-yellow-500" : "bg-blue-600"}
              />
            </div>
          </div>

          {/* Meta Semanal */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-baseline">
                <h3 className="font-medium text-gray-800 text-base">Meta Semanal</h3>
                <span className="text-sm text-gray-500">{weeklyProgress}/{weeklyGoal}</span>
              </div>
              <Progress 
                value={weeklyProgressPercentage} 
                className="w-full h-2 transition-all duration-300"
                indicatorClassName="bg-green-600"
              />
            </div>
          </div>
        </div>
        
        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Button 
            variant="outline"
            className="w-full sm:w-auto border-blue-200 text-blue-600 hover:bg-blue-50 text-sm py-2.5 px-4 h-auto min-h-[44px]"
            onClick={() => openEditModal('daily')}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Meta Diária
          </Button>
          <Button 
            variant="outline"
            className="w-full sm:w-auto border-green-200 text-green-600 hover:bg-green-50 text-sm py-2.5 px-4 h-auto min-h-[44px]"
            onClick={() => openEditModal('weekly')}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Meta Semanal
          </Button>
          <Button 
            variant="outline"
            onClick={handleResetProgress}
            disabled={isResetting}
            className="w-full sm:w-auto border-orange-200 text-orange-600 hover:bg-orange-50 text-sm py-2.5 px-4 h-auto min-h-[44px]"
          >
            {isResetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Resetar Dia
          </Button>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Definir Meta {editingType === 'daily' ? 'Diária' : 'Semanal'}</DialogTitle>
            <DialogDescription>
              Quantas {editingType === 'daily' ? 'palavras deseja adicionar' : 'revisões deseja fazer'} por {editingType === 'daily' ? 'dia' : 'semana'}?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="goal-input" className="text-right col-span-1 text-base">
                Meta
              </label>
              <Input
                id="goal-input"
                type="number"
                min="0"
                value={newGoalValue}
                onChange={(e) => setNewGoalValue(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="col-span-3 h-11 text-base"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-11 text-base px-5">
              Cancelar
            </Button>
            <Button onClick={handleSaveGoal} disabled={isSaving} className="h-11 text-base px-5 bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
