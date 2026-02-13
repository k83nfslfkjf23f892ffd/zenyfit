'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users } from 'lucide-react';
import { listContainerVariants, listItemVariants } from '@/lib/animations';
import { UserHeaderWidget } from '@/components/widgets';

export default function SocialPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!loading && !user) return null;

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <UserHeaderWidget user={user} />

      <motion.div
        className="flex flex-col items-center justify-center py-20 space-y-4"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={listItemVariants}>
          <div className="p-4 rounded-2xl gradient-bg-subtle">
            <Users className="h-10 w-10 text-primary" />
          </div>
        </motion.div>
        <motion.div className="text-center space-y-2" variants={listItemVariants}>
          <h1 className="text-xl font-bold">Social</h1>
          <p className="text-sm text-foreground/50">Coming soon</p>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
