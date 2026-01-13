'use client';

import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container for animated list items
 * Wraps children with staggered animation
 */
export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Individual list item with animation
 * Use within AnimatedList for staggered effect
 */
export function AnimatedListItem({ children, className = '' }: AnimatedListItemProps) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
