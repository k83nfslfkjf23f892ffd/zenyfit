'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UsersTab } from '@/components/admin/UsersTab';
import { StatisticsTab } from '@/components/admin/StatisticsTab';
import { ModerationTab } from '@/components/admin/ModerationTab';
import { InvitesTab } from '@/components/admin/InvitesTab';
import { SystemHealthTab } from '@/components/admin/SystemHealthTab';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, monitor system health, and oversee content
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            <StatisticsTab />
          </TabsContent>

          <TabsContent value="moderation" className="mt-6">
            <ModerationTab />
          </TabsContent>

          <TabsContent value="invites" className="mt-6">
            <InvitesTab />
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <SystemHealthTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
