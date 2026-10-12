import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { safeStorage } from '@/utils/storage';

export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'themeMode';

const getStoredMode = (): ThemeMode => {
  const value = safeStorage.get(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : 'auto';
};

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const ThemeModeContext = createContext<{
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}>({
  isDark: false,
  mode: 'auto',
  setMode: () => {},
});

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  const isDark = mode === 'auto' ? systemDark : mode === 'dark';

  // Expose the resolved theme to CSS: `.dark` drives Tailwind's dark variant,
  // color-scheme keeps native UI (scrollbars, form controls) in sync.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      mode,
      setMode: (next: ThemeMode) => {
        setModeState(next);
        // 存储不可用（隐私模式等）时写入静默失败，主题仍在内存里生效
        if (next === 'auto') {
          safeStorage.remove(STORAGE_KEY);
        } else {
          safeStorage.set(STORAGE_KEY, next);
        }
      },
    }),
    [isDark, mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeModeContext);
