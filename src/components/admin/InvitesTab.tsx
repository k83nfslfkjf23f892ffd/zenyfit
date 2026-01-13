'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InviteCode {
  code: string;
  createdBy: string;
  creatorUsername: string;
  creatorAvatar?: string;
  used: boolean;
  usedBy?: string;
  userUsername?: string;
  userAvatar?: string;
  createdAt: number;
  usedAt?: number;
}

export function InvitesTab() {
  const { firebaseUser } = useAuth();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<'all' | 'used' | 'unused'>('all');
  const [bulkCount, setBulkCount] = useState(10);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const fetchInviteCodes = useCallback(async () => {
    try {
      setLoading(true);
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const params = new URLSearchParams({
        status,
        limit: '100',
      });

      const response = await fetch(`/api/admin/invites?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data.inviteCodes);
      }
    } catch (error) {
      console.error('Error fetching invite codes:', error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, status]);

  useEffect(() => {
    fetchInviteCodes();
  }, [fetchInviteCodes]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count: bulkCount }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCodes(data.codes);
        alert(`Generated ${data.codes.length} invite code(s)`);
        fetchInviteCodes();
      } else {
        const data = await response.json();
        alert(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Error generating codes:', error);
      alert('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (code: string) => {
    if (!confirm('Are you sure you want to revoke this invite code?')) {
      return;
    }

    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/invites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        alert('Invite code revoked');
        fetchInviteCodes();
      } else {
        const data = await response.json();
        alert(data.error || 'Revoke failed');
      }
    } catch (error) {
      console.error('Error revoking code:', error);
      alert('Revoke failed');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard');
  };

  const copyAllGeneratedCodes = () => {
    if (generatedCodes.length === 0) return;
    const text = generatedCodes.join('\n');
    navigator.clipboard.writeText(text);
    alert('All codes copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Generate Bulk Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Invite Codes</CardTitle>
          <CardDescription>Create multiple invite codes at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="number"
              min="1"
              max="100"
              value={bulkCount}
              onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
              className="w-32"
            />
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : `Generate ${bulkCount} Code(s)`}
            </Button>
          </div>

          {generatedCodes.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold">Generated Codes:</p>
                <Button size="sm" variant="outline" onClick={copyAllGeneratedCodes}>
                  Copy All
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {generatedCodes.map((code) => (
                  <div
                    key={code}
                    className="p-2 bg-background border rounded text-center font-mono text-sm cursor-pointer hover:bg-primary/10"
                    onClick={() => copyCode(code)}
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>All Invite Codes</CardTitle>
          <CardDescription>View and manage invite codes</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | 'used' | 'unused')}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Codes</option>
            <option value="used">Used</option>
            <option value="unused">Unused</option>
          </select>
        </CardContent>
      </Card>

      {/* Invite Codes Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading codes...</p>
            </div>
          ) : inviteCodes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No invite codes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Creator</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Used By</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inviteCodes.map((invite) => (
                    <tr key={invite.code} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">
                          {invite.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {invite.creatorAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={invite.creatorAvatar}
                              alt={invite.creatorUsername}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary text-xs">
                                {invite.creatorUsername.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-sm">{invite.creatorUsername}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {invite.used ? (
                          <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded">
                            Used
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded">
                            Unused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {invite.used && invite.userUsername ? (
                          <div className="flex items-center gap-2">
                            {invite.userAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={invite.userAvatar}
                                alt={invite.userUsername}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary text-xs">
                                  {invite.userUsername.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm">{invite.userUsername}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground text-sm">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCode(invite.code)}
                          >
                            Copy
                          </Button>
                          {!invite.used && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevoke(invite.code)}
                            >
                              Revoke
                            </Button>
                          )}
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
