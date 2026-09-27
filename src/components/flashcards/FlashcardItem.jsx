import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Pencil, Trash2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Word } from '@/entities/Word';
import AudioButton from '@/components/common/AudioButton';
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

export default function FlashcardItem({ word, onDelete, onToggleFavorite, onEditMastery, onEdit }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const categoryColors = {
    basic: "bg-blue-100 text-blue-800",
    intermediate: "bg-indigo-100 text-indigo-800",
    advanced: "bg-purple-100 text-purple-800",
    business: "bg-amber-100 text-amber-800",
    travel: "bg-emerald-100 text-emerald-800",
    food: "bg-red-100 text-red-800",
    technology: "bg-cyan-100 text-cyan-800",
    nature: "bg-green-100 text-green-800",
    entertainment: "bg-pink-100 text-pink-800"
  };

  const handleToggleFavorite = async () => {
    setIsUpdating(true);
    try {
      await Word.update(word.id, { favorite: !word.favorite });
      if (onToggleFavorite) onToggleFavorite(word.id, !word.favorite);
    } catch (error) {
      console.error("Erro ao atualizar favorito:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateMastery = async () => {
    setIsUpdating(true);
    const newMasteryLevel = Math.min(5, (word.mastery_level || 0) + 1);
    
    try {
      // Se o flashcard ainda não foi salvo (ID temporário), usar o callback
      if (typeof word.id === 'string' && word.id.startsWith('static-')) {
        if (onEditMastery) {
          await onEditMastery(word.id, newMasteryLevel);
        }
      } else {
        // Flashcard já salvo, atualizar diretamente
        await Word.update(word.id, { 
          mastery_level: newMasteryLevel,
          times_reviewed: (word.times_reviewed || 0) + 1,
          times_reviewed_today: (word.times_reviewed_today || 0) + 1
        });
        if (onEditMastery) onEditMastery(word.id, newMasteryLevel);
      }
    } catch (error) {
      console.error("Erro ao atualizar nível de domínio:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await Word.delete(word.id);
      if (onDelete) onDelete(word.id);
    } catch (error) {
      console.error("Erro ao excluir flashcard:", error);
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (word.mastery_level === 5) {
      return <Badge className="bg-green-100 text-green-800">Dominado</Badge>;
    }
    if ((word.times_reviewed || 0) > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Aprendendo</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Novo</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col bg-white border border-gray-200 hover:border-blue-200 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex flex-col h-full relative">
          {/* Cabeçalho com status e categoria */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-800">
                  {word.input_word || word.english}
                </h3>
                <AudioButton
                  text={word.input_word || word.english}
                  language={word.input_language || 'en'}
                  className="text-blue-600 hover:bg-blue-50"
                  ariaLabel="Ouvir pronúncia"
                />
              </div>
              <p className="text-gray-600">{word.output_translation || word.portuguese}</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {getStatusBadge()}
              <Badge className={`${categoryColors[word.category] || categoryColors.basic} capitalize`}>
                {word.category?.replace('_', ' ') || 'basic'}
              </Badge>
            </div>
          </div>

          {/* Progresso com bolinhas - Atualizado para 5 revisões */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">Revisões hoje:</span>
              <span className="text-sm font-medium">
                {word.times_reviewed_today || 0} de 5
              </span>
            </div>
            <div className="flex gap-1 justify-center">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    i < (word.times_reviewed_today || 0) ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1">
            {/* Imagem */}
            {word.image_url && (
              <div className="relative aspect-[3/2] mb-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <img 
                  src={word.image_url} 
                  alt={word.input_word || word.english} 
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Exemplo */}
            {word.example && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 text-sm">
                <p className="text-gray-700 mb-1">"{word.example}"</p>
                {word.example_translation && (
                  <p className="text-gray-500 italic">"{word.example_translation}"</p>
                )}
              </div>
            )}
          </div>

          {/* Botão "Sei isso" e ações */}
          <div className="mt-auto pt-3 flex flex-col gap-2">
            <Button
              onClick={handleUpdateMastery}
              disabled={isUpdating || (word.times_reviewed_today || 0) >= 5 || word.mastery_level === 5}
              className={`w-full ${
                (word.times_reviewed_today || 0) >= 5 || word.mastery_level === 5
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              {word.mastery_level === 5 ? "Dominado!" : "Sei isso"}
            </Button>

            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-md w-[90vw] max-w-sm mx-auto rounded-xl fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-lg">Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">
                        Tem certeza que deseja excluir o flashcard "{word.input_word || word.english}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                        onClick={confirmDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Excluindo..." : "Excluir"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => onEdit && onEdit(word)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>

                <button
                  onClick={handleToggleFavorite}
                  disabled={isUpdating}
                  className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star className={`w-4 h-4 ${word.favorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
                </button>
              </div>

              {/* Nível de masteridade */}
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-6 rounded-sm ${
                      i < (word.mastery_level || 0) ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}