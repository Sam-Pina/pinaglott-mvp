import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LANGUAGES } from '../language/LanguageSelector';

export default function LanguageStudyModal({ 
  isOpen, 
  onClose, 
  onSelectLanguage,
  availableLanguages = []
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="relative bg-white shadow-xl">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Escolha o Idioma para Estudar
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Selecione qual idioma você gostaria de praticar nesta sessão
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {availableLanguages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Você ainda não tem flashcards em nenhum idioma.
                  </p>
                  <Button onClick={onClose} variant="outline">
                    Adicionar Flashcards
                  </Button>
                </div>
              ) : (
                <>
                  {availableLanguages.map((lang) => {
                    const langInfo = LANGUAGES[lang.code] || { name: lang.code.toUpperCase(), flag: '🌐' };
                    return (
                      <Button
                        key={lang.code}
                        onClick={() => onSelectLanguage(lang.code)}
                        variant="outline"
                        className="w-full h-16 flex items-center justify-between p-4 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{langInfo.flag}</span>
                          <div className="text-left">
                            <p className="font-medium text-base">{langInfo.name}</p>
                            <p className="text-sm text-gray-500">
                              {lang.count} {lang.count === 1 ? 'flashcard' : 'flashcards'}
                            </p>
                          </div>
                        </div>
                        <div className="text-blue-600">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      </Button>
                    );
                  })}
                  
                  <div className="pt-4 border-t border-gray-100">
                    <Button
                      onClick={() => onSelectLanguage('all')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Estudar Todos os Idiomas
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}