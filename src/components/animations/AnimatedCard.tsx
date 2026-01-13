'use client';

import { motion } from 'framer-motion';
import { cardVariants } from '@/lib/animations';
import { Card } from '@/components/ui/card';
import { ComponentProps } from 'react';

interface AnimatedCardProps extends ComponentProps<typeof Card> {
  delay?: number;
}

/**
 * Card component with reveal animation
 * Use this instead of regular Card for animated entrances
 */
export function AnimatedCard({
  children,
  delay = 0,
  className,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      <Card className={className} {...props}>
        {children}
      </Card>
    </motion.div>
  );
}
