'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star } from 'lucide-react';
import { useEffect } from 'react';
import { achievementVariants, fadeVariants } from '@/lib/animations';

interface AchievementUnlockProps {
  isVisible: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClose: () => void;
}

export function AchievementUnlock({
  isVisible,
  title,
  description,
  icon,
  onClose,
}: AchievementUnlockProps) {
  useEffect(() => {
    if (isVisible) {
      // Auto-close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="relative bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-2xl p-6 shadow-2xl max-w-md w-full pointer-events-auto"
            variants={achievementVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          >
            {/* Background stars animation */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${10 + (i % 4) * 25}%`,
                  top: `${10 + Math.floor(i / 4) * 30}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2,
                  delay: 0.3 + i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              >
                <Star className="w-3 h-3 text-white/40" fill="currentColor" />
              </motion.div>
            ))}

            {/* Header */}
            <motion.div
              className="flex items-center gap-2 mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Award className="w-5 h-5 text-white" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Achievement Unlocked
              </span>
            </motion.div>

            {/* Achievement icon */}
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.3,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              <div className="relative">
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 bg-white rounded-full blur-xl opacity-50"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0.7, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* Icon */}
                <div className="relative z-10 w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  {icon || <Award className="w-10 h-10 text-amber-500" />}
                </div>
              </div>
            </motion.div>

            {/* Achievement title */}
            <motion.h3
              className="text-2xl font-bold text-white text-center mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {title}
            </motion.h3>

            {/* Achievement description */}
            <motion.p
              className="text-white/90 text-center text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {description}
            </motion.p>

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 1.5,
                delay: 0.5,
                ease: 'easeInOut',
              }}
            >
              <div
                className="h-full w-1/3"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
              />
            </motion.div>

            {/* Corner decorations */}
            <motion.div
              className="absolute top-2 right-2"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <Star className="w-6 h-6 text-white/60" fill="currentColor" />
            </motion.div>

            <motion.div
              className="absolute bottom-2 left-2"
              animate={{
                rotate: [360, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <Star className="w-6 h-6 text-white/60" fill="currentColor" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
