'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Loader2, Database, RefreshCw, RotateCcw } from 'lucide-react';

export function SystemHealthTab() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [backups, setBackups] = useState<Array<{ id: string; createdAt: number; summary: { totalUsers: number; totalXp: number } }>>([]);

  const callApi = async (endpoint: string, method = 'POST') => {
    const token = await firebaseUser?.getIdToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(endpoint, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleBackup = async () => {
    setLoading('backup');
    try {
      const data = await callApi('/api/admin/backup-xp');
      toast.success(data.message);
      handleListBackups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setLoading(null);
    }
  };

  const handleListBackups = async () => {
    try {
      const data = await callApi('/api/admin/backup-xp', 'GET');
      setBackups(data.backups || []);
    } catch {
      // Ignore
    }
  };

  const handlePreview = async () => {
    setLoading('preview');
    try {
      const data = await callApi('/api/admin/recalculate-xp?preview=true');
      setPreviewData(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to preview');
    } finally {
      setLoading(null);
    }
  };

  const handleRecalculate = async () => {
    setLoading('recalculate');
    try {
      const data = await callApi('/api/admin/recalculate-xp');
      setPreviewData(null);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to recalculate');
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async (backupId: string) => {
    setLoading('restore');
    try {
      const data = await callApi(`/api/admin/restore-xp?backupId=${backupId}`);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* XP Management */}
      <Card>
        <CardHeader>
          <CardTitle>XP Management</CardTitle>
          <CardDescription>Backup and recalculate XP based on current rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBackup} disabled={!!loading} variant="outline">
              {loading === 'backup' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              Backup XP
            </Button>
            <Button onClick={handlePreview} disabled={!!loading} variant="outline">
              {loading === 'preview' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Preview Recalc
            </Button>
            <Button onClick={handleRecalculate} disabled={!!loading} variant="default">
              {loading === 'recalculate' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Apply Recalc
            </Button>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <pre className="whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>
          )}

          {/* Backups List */}
          {backups.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Backups:</p>
              {backups.slice(0, 3).map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                  <span>
                    {new Date(backup.createdAt).toLocaleString()} - {backup.summary?.totalUsers} users, {backup.summary?.totalXp?.toLocaleString()} XP
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleRestore(backup.id)} disabled={!!loading}>
                    {loading === 'restore' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="link" size="sm" onClick={handleListBackups} className="p-0 h-auto">
            Load backups
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Monitor system performance and errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="font-semibold">API Status</p>
                </div>
                <p className="text-2xl font-bold">Operational</p>
                <p className="text-sm text-muted-foreground mt-1">All endpoints responding</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="font-semibold">Database</p>
                </div>
                <p className="text-2xl font-bold">Connected</p>
                <p className="text-sm text-muted-foreground mt-1">Firestore operational</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="font-semibold">Authentication</p>
                </div>
                <p className="text-2xl font-bold">Active</p>
                <p className="text-sm text-muted-foreground mt-1">Firebase Auth working</p>
              </div>
            </div>

            {/* Placeholder Notice */}
            <div className="p-8 text-center bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">System Health Monitoring</h3>
              <p className="text-muted-foreground mb-4">
                Full system health monitoring will be implemented in a future phase.
              </p>
              <div className="text-left max-w-2xl mx-auto space-y-2 text-sm">
                <p className="font-medium">Planned features:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Recent API errors and failed requests</li>
                  <li>Offline sync queue status across users</li>
                  <li>Database performance metrics (read/write counts)</li>
                  <li>API response time tracking</li>
                  <li>User session analytics</li>
                  <li>Error rate monitoring with alerts</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Currently, system logs can be viewed in your hosting platform&apos;s dashboard (Vercel)
                  and Firebase Console for detailed monitoring.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• View Firebase Console: Check database usage and performance</p>
                <p>• View Vercel Dashboard: Monitor API function logs and errors</p>
                <p>• Check Firestore Indexes: Ensure query optimization is working</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
