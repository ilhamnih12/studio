import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeType = 'light' | 'dark' | 'system';
type LanguageType = 'id' | 'en';

interface SettingsStore {
  theme: ThemeType;
  language: LanguageType;
  customApiKey: string | null;
  setTheme: (theme: ThemeType) => void;
  setLanguage: (language: LanguageType) => void; 
  setCustomApiKey: (apiKey: string | null) => void;
  toggleLanguage: () => void;  // Add this line
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      language: 'id',
      customApiKey: null,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => {
        set({ language });
        // Force update by triggering a state change
        set((state) => ({ ...state }));
      },
      setCustomApiKey: (customApiKey) => set({ customApiKey }),
      toggleLanguage: () => {
        const currentLang = get().language;
        set({ language: currentLang === 'en' ? 'id' : 'en' });
      },
    }),
    {
      name: 'settings-storage',
      skipHydration: true, // Add this to fix hydration issues
    }
  )
);
