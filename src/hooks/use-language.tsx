'use client';

import { useSettings } from '@/stores/settings';
import { useState, useEffect } from 'react';

export function useLanguage() {
  const { language, setLanguage } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'id' : 'en';
    setLanguage(newLang);
  };

  return {
    language: mounted ? language : 'id',
    toggleLanguage
  };
}
