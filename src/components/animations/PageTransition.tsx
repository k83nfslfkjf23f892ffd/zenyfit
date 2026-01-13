'use client';

import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/animations';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component for page transitions
 * Add this to any page component to get smooth enter/exit animations
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
