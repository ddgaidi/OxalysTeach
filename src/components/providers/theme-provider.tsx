"use client";

import * as React from "react";

type DataAttribute = `data-${string}`;
type ThemeAttribute = "class" | DataAttribute;

type ThemeProviderProps = React.PropsWithChildren<{
  themes?: string[];
  forcedTheme?: string | undefined;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  defaultTheme?: string;
  attribute?: ThemeAttribute | ThemeAttribute[];
  value?: Record<string, string>;
}>;

type UseThemeProps = {
  themes: string[];
  forcedTheme?: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  theme?: string;
  resolvedTheme?: "light" | "dark";
  systemTheme?: "light" | "dark";
};

const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);

const FALLBACK_THEMES = ["light", "dark"];
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => document.head.removeChild(style), 1);
  };
}

function applyThemeToDom({
  attribute,
  value,
  themes,
  activeTheme,
  enableColorScheme,
  defaultTheme,
}: {
  attribute: ThemeAttribute | ThemeAttribute[];
  value: Record<string, string> | undefined;
  themes: string[];
  activeTheme: string;
  enableColorScheme: boolean;
  defaultTheme: string;
}) {
  const root = document.documentElement;
  const attributes = Array.isArray(attribute) ? attribute : [attribute];
  const mappedTheme = value?.[activeTheme] ?? activeTheme;

  for (const attr of attributes) {
    if (attr === "class") {
      const mappedThemeList = themes.map((themeName) => value?.[themeName] ?? themeName);
      root.classList.remove(...mappedThemeList);
      root.classList.add(mappedTheme);
    } else if (mappedTheme) {
      root.setAttribute(attr, mappedTheme);
    } else {
      root.removeAttribute(attr);
    }
  }

  if (!enableColorScheme) return;
  const colorScheme =
    activeTheme === "system"
      ? getSystemTheme()
      : activeTheme === "light" || activeTheme === "dark"
        ? activeTheme
        : defaultTheme === "dark"
          ? "dark"
          : "light";
  root.style.colorScheme = colorScheme;
}

export function ThemeProvider({
  children,
  forcedTheme,
  enableSystem = true,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  storageKey = "theme",
  themes = FALLBACK_THEMES,
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "data-theme",
  value,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(defaultTheme);
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    setSystemTheme(getSystemTheme());
    const media = window.matchMedia(SYSTEM_THEME_QUERY);
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setThemeState(saved);
      } else {
        setThemeState(defaultTheme);
      }
    } catch {
      setThemeState(defaultTheme);
    }
  }, [defaultTheme, storageKey]);

  const resolvedTheme =
    (forcedTheme ?? theme) === "system" && enableSystem ? systemTheme : (forcedTheme ?? theme);
  const resolvedThemeSafe: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  React.useEffect(() => {
    const themeToApply = forcedTheme ?? theme;
    const activeTheme = themeToApply === "system" && enableSystem ? systemTheme : themeToApply;

    const cleanupTransition = disableTransitionOnChange ? disableTransitionsTemporarily() : undefined;
    applyThemeToDom({
      attribute,
      value,
      themes,
      activeTheme,
      enableColorScheme,
      defaultTheme,
    });
    cleanupTransition?.();
  }, [
    forcedTheme,
    theme,
    enableSystem,
    systemTheme,
    attribute,
    value,
    themes,
    enableColorScheme,
    defaultTheme,
    disableTransitionOnChange,
  ]);

  const setTheme: React.Dispatch<React.SetStateAction<string>> = React.useCallback(
    (nextTheme) => {
      setThemeState((currentTheme) => {
        const valueToSet = typeof nextTheme === "function" ? nextTheme(currentTheme) : nextTheme;
        try {
          localStorage.setItem(storageKey, valueToSet);
        } catch {
          // Ignore localStorage errors (private mode, blocked access, etc).
        }
        return valueToSet;
      });
    },
    [storageKey],
  );

  const contextValue = React.useMemo<UseThemeProps>(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme: resolvedThemeSafe,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem ? systemTheme : undefined,
    }),
    [theme, setTheme, forcedTheme, resolvedThemeSafe, enableSystem, themes, systemTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): UseThemeProps {
  const context = React.useContext(ThemeContext);
  if (context) return context;
  return {
    setTheme: () => undefined,
    themes: [],
    theme: undefined,
    resolvedTheme: "light",
    systemTheme: undefined,
    forcedTheme: undefined,
  };
}
