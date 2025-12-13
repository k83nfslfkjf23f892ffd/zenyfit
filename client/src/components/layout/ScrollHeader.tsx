import { useEffect, useState } from "react";

export default function ScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Find the scrollable main element
    const mainElement = document.querySelector('main');

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollPosition = target.scrollTop;
      // Show blur when scrolled down from top
      setIsScrolled(scrollPosition > 10);
    };

    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      // Check initial scroll position
      handleScroll({ target: mainElement } as any);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 max-w-md mx-auto transition-all duration-200"
      style={{
        height: "env(safe-area-inset-top)",
        backdropFilter: isScrolled ? "blur(12px) saturate(180%)" : "none",
        WebkitBackdropFilter: isScrolled ? "blur(12px) saturate(180%)" : "none",
        backgroundColor: isScrolled ? "hsl(var(--background) / 0.75)" : "hsl(var(--background))",
        pointerEvents: "none",
      }}
    />
  );
}
