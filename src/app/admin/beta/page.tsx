'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Users, Check, X, Copy, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Invite {
  id: string;
  code: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  max_uses: number;
  current_uses: number;
  used_at: string | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  referral_source: string | null;
  created_at: string;
  invited_at: string | null;
  priority_score: number;
}

interface Stats {
  totalInvites: number;
  usedInvites: number;
  waitlistCount: number;
  betaUsers: number;
}

export default function BetaAdminPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalInvites: 0,
    usedInvites: 0,
    waitlistCount: 0,
    betaUsers: 0,
  });

  // Form states
  const [count, setCount] = useState(5);
  const [emails, setEmails] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      // Fetch invites
      const { data: invitesData } = await supabase
        .from('beta_invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitesData) {
        setInvites(invitesData);
      }

      // Fetch waitlist
      const { data: waitlistData } = await supabase
        .from('beta_waitlist')
        .select('*')
        .order('priority_score', { ascending: false });

      if (waitlistData) {
        setWaitlist(waitlistData);
      }

      // Calculate stats
      const { data: betaUsersData } = await supabase
        .from('beta_users')
        .select('id', { count: 'exact' });

      setStats({
        totalInvites: invitesData?.length || 0,
        usedInvites: invitesData?.filter(i => i.current_uses > 0).length || 0,
        waitlistCount: waitlistData?.length || 0,
        betaUsers: betaUsersData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateInvites = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('You must be logged in');
        return;
      }

      const emailList = emails
        .split('\n')
        .map(e => e.trim())
        .filter(e => e);

      const response = await fetch('/api/beta/generate-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          count: emailList.length || count,
          emails: emailList,
          sendEmail,
          expiresInDays,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Generated ${data.invites.length} invite codes!`);
        setEmails('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to generate invites');
      }
    } catch (error) {
      console.error('Error generating invites:', error);
      toast.error('Failed to generate invites');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const exportInvites = () => {
    const csv = [
      ['Code', 'Email', 'Created', 'Expires', 'Uses', 'Status'],
      ...invites.map(i => [
        i.code,
        i.email || '',
        new Date(i.created_at).toLocaleDateString(),
        i.expires_at ? new Date(i.expires_at).toLocaleDateString() : 'Never',
        `${i.current_uses}/${i.max_uses}`,
        i.current_uses >= i.max_uses ? 'Used' : 'Available',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invites_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWaitlist = () => {
    const csv = [
      ['Email', 'Name', 'Source', 'Joined', 'Invited', 'Priority'],
      ...waitlist.map(w => [
        w.email,
        w.name || '',
        w.referral_source || '',
        new Date(w.created_at).toLocaleDateString(),
        w.invited_at ? new Date(w.invited_at).toLocaleDateString() : 'Not invited',
        w.priority_score.toString(),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Beta Access Management</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invites</p>
                <p className="text-3xl font-bold">{stats.totalInvites}</p>
              </div>
              <Mail className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Used Invites</p>
                <p className="text-3xl font-bold">{stats.usedInvites}</p>
              </div>
              <Check className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waitlist</p>
                <p className="text-3xl font-bold">{stats.waitlistCount}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Beta Users</p>
                <p className="text-3xl font-bold">{stats.betaUsers}</p>
              </div>
              <Check className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate Invites</TabsTrigger>
            <TabsTrigger value="invites">View Invites</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-6">Generate Invite Codes</h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="count">Number of Codes (if no emails)</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="100"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="emails">
                    Email Addresses (one per line, optional)
                  </Label>
                  <textarea
                    id="emails"
                    className="w-full min-h-[150px] p-3 border border-gray-300 rounded-md"
                    placeholder="user1@example.com&#10;user2@example.com"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="expires">Expires In (days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    min="1"
                    placeholder="30"
                    value={expiresInDays || ''}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty for no expiration
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="send-email"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="send-email">
                    Send email invitations immediately
                  </Label>
                </div>

                <Button
                  onClick={generateInvites}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Generate Invites
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Invite Codes</h2>
                <Button onClick={exportInvites} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-left p-3">Expires</th>
                      <th className="text-left p-3">Uses</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono">{invite.code}</td>
                        <td className="p-3">{invite.email || '-'}</td>
                        <td className="p-3">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {invite.expires_at
                            ? new Date(invite.expires_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="p-3">
                          {invite.current_uses} / {invite.max_uses}
                        </td>
                        <td className="p-3">
                          {invite.current_uses >= invite.max_uses ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Used
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Button
                            onClick={() => copyCode(invite.code)}
                            variant="ghost"
                            size="sm"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Waitlist</h2>
                <Button onClick={exportWaitlist} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Source</th>
                      <th className="text-left p-3">Joined</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{entry.email}</td>
                        <td className="p-3">{entry.name || '-'}</td>
                        <td className="p-3">{entry.referral_source || '-'}</td>
                        <td className="p-3">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {entry.invited_at ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Invited
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              Waiting
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
