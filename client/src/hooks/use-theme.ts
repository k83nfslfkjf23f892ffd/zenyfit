import { useTheme } from "next-themes";

export function useThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  
  const currentTheme = theme === "system" ? systemTheme : theme;
  
  const toggleTheme = () => {
    if (currentTheme === "light") {
      setTheme("dark");
    } else if (currentTheme === "dark") {
      setTheme("black");
    } else {
      setTheme("light");
    }
  };
  
  const setThemeOption = (newTheme: string) => {
    setTheme(newTheme);
  };
  
  return { currentTheme, setTheme: setThemeOption, toggleTheme, theme };
}
