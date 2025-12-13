import { useEffect, useState } from "react";

export default function ScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Find the scrollable main element
    const mainElement = document.querySelector('main');

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollPosition = target.scrollTop;
      // Only show blur when scrolled down (not at top)
      setIsScrolled(scrollPosition > 10);
    };

    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      // Check initial scroll position
      handleScroll({ target: mainElement } as any);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  if (!isScrolled) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 max-w-md mx-auto"
      style={{
        height: "env(safe-area-inset-top)",
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
        backgroundColor: "hsl(var(--background) / 0.8)",
        pointerEvents: "none",
      }}
    />
  );
}
