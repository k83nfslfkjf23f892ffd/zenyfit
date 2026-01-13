'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { confettiVariants, fadeVariants } from '@/lib/animations';

interface LevelUpCelebrationProps {
  isVisible: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpCelebration({
  isVisible,
  newLevel,
  onClose,
}: LevelUpCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const onCloseRef = useRef(onClose);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the ref up to date
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Auto-close after 3 seconds
      timerRef.current = setTimeout(() => {
        onCloseRef.current();
      }, 3000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else {
      // Reset confetti when hidden
      setShowConfetti(false);
    }
  }, [isVisible]);

  // Generate confetti particles
  const confettiCount = 30;
  const confettiColors = [
    'bg-violet-500',
    'bg-pink-500',
    'bg-blue-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-red-500',
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          {/* Confetti particles */}
          {showConfetti &&
            Array.from({ length: confettiCount }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-3 h-3 rounded-full ${
                  confettiColors[i % confettiColors.length]
                }`}
                style={{
                  left: '50%',
                  top: '50%',
                }}
                custom={i}
                variants={confettiVariants}
                initial="initial"
                animate="animate"
              />
            ))}

          {/* Main celebration card */}
          <motion.div
            className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center shadow-2xl max-w-md mx-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              duration: 0.6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sparkles decoration */}
            <motion.div
              className="absolute -top-4 -left-4"
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </motion.div>

            <motion.div
              className="absolute -bottom-4 -right-4"
              animate={{
                rotate: [360, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <Zap className="w-8 h-8 text-yellow-300" />
            </motion.div>

            {/* Trophy icon */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-60"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 0.8, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <Trophy className="w-24 h-24 text-yellow-300 relative z-10" />
              </div>
            </motion.div>

            {/* Level up text */}
            <motion.h1
              className="text-5xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              LEVEL UP!
            </motion.h1>

            {/* New level number */}
            <motion.div
              className="text-8xl font-black text-white mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.4,
                type: 'spring',
                stiffness: 300,
                damping: 15,
              }}
            >
              {newLevel}
            </motion.div>

            {/* Congratulations message */}
            <motion.p
              className="text-xl text-white/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Keep pushing your limits!
            </motion.p>

            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{
                background:
                  'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '200% 200%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
