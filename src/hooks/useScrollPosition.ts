'use client';

import { useState, useEffect } from 'react';

export function useScrollPosition() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      const { scrollHeight, clientHeight } = document.documentElement;
      setIsAtBottom(window.scrollY + clientHeight >= scrollHeight - 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { isScrolled, isAtBottom };
}
