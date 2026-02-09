'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Loader2, Database, RefreshCw, RotateCcw, BarChart3, Trash2 } from 'lucide-react';

interface RouteMetric {
  route: string;
  reads: number;
  writes: number;
  calls: number;
  cacheHits: number;
}

interface MetricsData {
  startedAt: number;
  uptimeMs: number;
  totals: {
    reads: number;
    writes: number;
    calls: number;
    cacheHits: number;
  };
  routes: RouteMetric[];
}

export function SystemHealthTab() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [backups, setBackups] = useState<Array<{ id: string; createdAt: number; summary: { totalUsers: number; totalXp: number } }>>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

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

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const data = await callApi('/api/admin/metrics', 'GET');
      setMetrics(data);
    } catch {
      // Silently fail on initial load
    } finally {
      setMetricsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  const resetMetrics = async () => {
    setLoading('resetMetrics');
    try {
      await callApi('/api/admin/metrics', 'POST');
      toast.success('Metrics reset');
      fetchMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setLoading(null);
    }
  };

  // Fetch metrics on mount
  useEffect(() => {
    if (firebaseUser) fetchMetrics();
  }, [firebaseUser, fetchMetrics]);

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

      {/* Firestore Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Firestore Metrics
              </CardTitle>
              <CardDescription>
                Reads, writes, and cache hits since last reset
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchMetrics} disabled={metricsLoading}>
                {metricsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="outline" onClick={resetMetrics} disabled={!!loading}>
                {loading === 'resetMetrics' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="flex items-center justify-center py-8">
              {metricsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-sm text-muted-foreground">No metrics data available</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{metrics.totals.reads.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Reads</p>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{metrics.totals.writes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Writes</p>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{metrics.totals.calls.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">API Calls</p>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{metrics.totals.cacheHits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Cache Hits</p>
                </div>
              </div>

              {/* Per-route breakdown */}
              {metrics.routes.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        <th className="px-3 py-2 font-medium">Route</th>
                        <th className="px-3 py-2 font-medium text-right">Reads</th>
                        <th className="px-3 py-2 font-medium text-right">Writes</th>
                        <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Calls</th>
                        <th className="px-3 py-2 font-medium text-right hidden sm:table-cell">Cache</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.routes.map((r) => (
                        <tr key={r.route} className="border-t border-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{r.route}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.reads.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.writes.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{r.calls.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{r.cacheHits.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Metrics are persisted in Firestore. Use the reset button to start fresh. Sorted by reads (heaviest first).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
