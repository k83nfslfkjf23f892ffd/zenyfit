'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flame, TrendingUp } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { fadeVariants, springVariants } from '@/lib/animations';
import { animateValue } from '@/lib/animations';

interface WorkoutCelebrationProps {
  isVisible: boolean;
  xpGained: number;
  exerciseType: string;
  amount: number;
  onClose: () => void;
}

export function WorkoutCelebration({
  isVisible,
  xpGained,
  exerciseType,
  amount,
  onClose,
}: WorkoutCelebrationProps) {
  const [displayXP, setDisplayXP] = useState(0);
  const onCloseRef = useRef(onClose);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the ref up to date
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isVisible && xpGained > 0) {
      // Animate XP counter
      animateValue(0, xpGained, 800, setDisplayXP);

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Auto-close after 2.5 seconds
      timerRef.current = setTimeout(() => {
        onCloseRef.current();
      }, 2500);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else if (!isVisible) {
      // Reset display XP when hidden
      setDisplayXP(0);
    }
  }, [isVisible, xpGained]);

  const motivationalMessages = [
    'Great work!',
    'Keep it up!',
    'You&apos;re on fire!',
    'Crushing it!',
    'Beast mode!',
    'Unstoppable!',
  ];

  const randomMessage =
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 shadow-2xl max-w-sm mx-4 pointer-events-auto"
            variants={springVariants}
            initial="initial"
            animate="animate"
            exit="initial"
            onClick={onClose}
          >
            {/* Success icon */}
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.1,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-white rounded-full blur-lg opacity-50"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <CheckCircle2 className="w-16 h-16 text-white relative z-10" />
              </div>
            </motion.div>

            {/* Workout logged message */}
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-bold text-white mb-2">
                {randomMessage}
              </h3>
              <p className="text-white/90">
                {amount} {exerciseType} logged
              </p>
            </motion.div>

            {/* XP gained display */}
            <motion.div
              className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-yellow-300" />
                <span className="text-sm text-white/80 font-medium">XP GAINED</span>
              </div>
              <motion.div
                className="text-4xl font-black text-white text-center"
                key={displayXP}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                +{displayXP}
              </motion.div>
            </motion.div>

            {/* Streak indicator */}
            <motion.div
              className="flex items-center justify-center gap-2 text-white/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Keep the momentum going!</span>
            </motion.div>

            {/* Animated particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i / 8) * Math.PI * 2) * 80,
                  y: Math.sin((i / 8) * Math.PI * 2) * 80,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.2,
                  ease: 'easeOut',
                  delay: 0.2 + i * 0.05,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
