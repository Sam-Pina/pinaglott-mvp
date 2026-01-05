import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, RotateCcw, ArrowLeft, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StudySessionModal({ 
  isOpen, 
  onClose, 
  studiedWords, 
  onStudyAgain 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md sm:max-w-2xl"
      >
        <Card className="bg-white">
          <CardHeader className="text-center pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              Sessão Concluída!
            </CardTitle>
            <p className="text-base sm:text-lg text-gray-600">Excelente!</p>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Estatísticas Simplificadas */}
            <div className="flex justify-center text-center">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{studiedWords.length}</p>
                <p className="text-xs sm:text-sm text-gray-600">Flashcards estudados</p>
              </div>
            </div>

            {/* Lista de palavras revisadas */}
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2 sm:mb-3 text-gray-800">Palavras revisadas:</h3>
              <div className="max-h-48 sm:max-h-60 overflow-y-auto space-y-2 bg-gray-50 p-3 sm:p-4 rounded-lg">
                {studiedWords.map((word, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 sm:p-3 rounded-md border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{word.english}</p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{word.portuguese}</p>
                    </div>
                    {word.mastery_level === 5 ? (
                      <Badge className="bg-green-100 text-green-700 flex items-center gap-1 text-xs px-2 py-1 ml-2 flex-shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Dominado
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 text-xs px-2 py-1 ml-2 flex-shrink-0">
                        <Brain className="w-3 h-3" />
                        Aprendendo
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-2 sm:gap-3 pt-2 sm:pt-4">
              <Button
                variant="outline"
                onClick={onStudyAgain}
                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Estudar Novamente
              </Button>
              <Button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Flashcards
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}