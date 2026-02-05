/**
 * Animation Utilities and Variants for Framer Motion
 *
 * This file contains reusable animation configurations for consistent
 * animations throughout the application.
 */

import { Variants } from 'framer-motion';

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// Card reveal animations
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Stagger children animation
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// List item animation
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Fast stagger for lists (shorter delays, fade-up)
export const listContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Button press animation
export const buttonVariants = {
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
};

// Achievement unlock animation
export const achievementVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -180,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      duration: 0.6,
    },
  },
};

// Celebration confetti particle animation
export const confettiVariants: Variants = {
  initial: () => ({
    x: 0,
    y: 0,
    opacity: 1,
    rotate: 0,
  }),
  animate: () => ({
    x: (Math.random() - 0.5) * 500,
    y: Math.random() * -500 - 200,
    opacity: 0,
    rotate: Math.random() * 720 - 360,
    transition: {
      duration: 1.5 + Math.random() * 0.5,
      ease: [0.17, 0.67, 0.83, 0.67],
    },
  }),
};

// Level up glow animation
export const glowVariants: Variants = {
  initial: {
    boxShadow: '0 0 0px rgba(139, 92, 246, 0)',
  },
  animate: {
    boxShadow: [
      '0 0 0px rgba(139, 92, 246, 0)',
      '0 0 30px rgba(139, 92, 246, 0.8)',
      '0 0 60px rgba(139, 92, 246, 0.6)',
      '0 0 30px rgba(139, 92, 246, 0.4)',
      '0 0 0px rgba(139, 92, 246, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'loop',
    },
  },
};

// Pulse animation for notifications
export const pulseVariants: Variants = {
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'loop',
    },
  },
};

// Slide in from side (export as separate variants for each direction)
export const slideInLeft: Variants = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 },
};

export const slideInRight: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 },
};

export const slideInTop: Variants = {
  initial: { y: -100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -100, opacity: 0 },
};

export const slideInBottom: Variants = {
  initial: { y: 100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 100, opacity: 0 },
};

// Fade animation
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Spring animation for bouncy effects
export const springVariants: Variants = {
  initial: {
    scale: 0,
  },
  animate: {
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
};

// Number counter animation helper
export const animateValue = (
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
) => {
  const startTime = Date.now();
  const updateValue = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (end - start) * easeProgress);

    callback(current);

    if (progress < 1) {
      requestAnimationFrame(updateValue);
    } else {
      callback(end);
    }
  };

  updateValue();
};
