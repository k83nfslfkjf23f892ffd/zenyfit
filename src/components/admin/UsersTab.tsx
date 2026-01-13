'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User } from '@shared/schema';

export function UsersTab() {
  const { firebaseUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const params = new URLSearchParams({
        status,
        sortBy,
        order,
        limit: '100',
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, status, sortBy, order]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (userId: string, action: 'ban' | 'unban' | 'promote' | 'demote' | 'delete') => {
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const confirmMessage = action === 'delete'
        ? 'Are you sure you want to delete this user? This action cannot be undone.'
        : `Are you sure you want to ${action} this user?`;

      if (!confirm(confirmMessage)) return;

      const method = action === 'delete' ? 'DELETE' : 'PATCH';
      const body = action === 'delete' ? { userId } : { userId, action };

      const response = await fetch('/api/admin/users', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert(`User ${action}ed successfully`);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Action failed');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Search, filter, and manage users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'banned')}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="createdAt">Join Date</option>
              <option value="level">Level</option>
              <option value="xp">XP</option>
              <option value="username">Username</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Level</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">XP</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Join Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{user.username}</p>
                            {user.isAdmin && (
                              <span className="text-xs text-amber-500 font-semibold">Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{user.level}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground">{user.xp.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.isBanned ? (
                          <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-medium rounded">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {user.isBanned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(user.id, 'unban')}
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(user.id, 'ban')}
                            >
                              Ban
                            </Button>
                          )}
                          {user.isAdmin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(user.id, 'demote')}
                            >
                              Demote
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(user.id, 'promote')}
                            >
                              Promote
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(user.id, 'delete')}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
