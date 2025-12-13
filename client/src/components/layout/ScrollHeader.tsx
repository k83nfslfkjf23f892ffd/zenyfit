import { useEffect, useState, useRef } from "react";

export default function ScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the scrollable main element
    const mainElement = document.querySelector('main[class*="overflow-y-auto"]');

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollPosition = target.scrollTop;
      setIsScrolled(scrollPosition > 20);
    };

    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-40 max-w-md mx-auto transition-all duration-300 ${
        isScrolled ? "opacity-100" : "opacity-0"
      }`}
      style={{
        height: "env(safe-area-inset-top)",
        backdropFilter: isScrolled ? "blur(10px) saturate(150%)" : "none",
        WebkitBackdropFilter: isScrolled ? "blur(10px) saturate(150%)" : "none",
        backgroundColor: isScrolled ? "hsl(var(--background) / 0.85)" : "transparent",
        pointerEvents: "none",
      }}
    />
  );
}
