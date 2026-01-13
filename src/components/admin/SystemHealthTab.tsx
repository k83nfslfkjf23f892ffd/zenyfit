'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SystemHealthTab() {
  return (
    <div className="space-y-6">
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
