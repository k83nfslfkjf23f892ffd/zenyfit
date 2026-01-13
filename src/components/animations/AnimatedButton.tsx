'use client';

import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { buttonVariants as animationButtonVariants } from '@/lib/animations';
import { forwardRef } from 'react';

/**
 * Button component with hover and tap animations
 * Drop-in replacement for regular Button with micro-interactions
 */
export const AnimatedButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.div
        whileHover={animationButtonVariants.hover}
        whileTap={animationButtonVariants.tap}
        style={{ display: 'inline-block' }}
      >
        <Button ref={ref} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';
