'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function BetaAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams?.get('code') || null;

  const [mode, setMode] = useState<'code' | 'waitlist'>('code');
  const [inviteCode, setInviteCode] = useState(codeFromUrl || '');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
      validateCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const validateCode = async (code: string) => {
    if (!code) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/beta/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.valid) {
        setSuccess('Valid invite code! Redirecting to sign up...');
        // Store code in localStorage and redirect to signup
        localStorage.setItem('betaInviteCode', code);
        setTimeout(() => {
          router.push('/signup');
        }, 1500);
      } else {
        setError(data.error || 'Invalid invite code');
      }
    } catch (err) {
      setError('Failed to validate invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await validateCode(inviteCode);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/beta/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, referralSource }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          'Successfully joined the waitlist! We will send you an invite soon.'
        );
        setEmail('');
        setName('');
        setReferralSource('');
      } else {
        setError(data.error || 'Failed to join waitlist');
      }
    } catch (err) {
      setError('Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              SceneScout Beta
            </h1>
            <p className="text-xl text-gray-600">
              Discover the future of event discovery
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Mode Tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  mode === 'code'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setMode('code')}
              >
                Have an Invite Code?
              </button>
              <button
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  mode === 'waitlist'
                    ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setMode('waitlist')}
              >
                Join Waitlist
              </button>
            </div>

            <div className="p-8">
              {/* Status Messages */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-medium">Success!</p>
                    <p className="text-green-600 text-sm">{success}</p>
                  </div>
                </div>
              )}

              {/* Invite Code Form */}
              {mode === 'code' && (
                <form onSubmit={handleCodeSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="invite-code" className="text-lg font-semibold">
                      Enter Your Invite Code
                    </Label>
                    <p className="text-sm text-gray-500 mt-1 mb-3">
                      Enter the 8-character code from your invitation email
                    </p>
                    <Input
                      id="invite-code"
                      type="text"
                      placeholder="XXXX-XXXX"
                      value={inviteCode}
                      onChange={(e) =>
                        setInviteCode(e.target.value.toUpperCase())
                      }
                      className="text-2xl font-mono text-center tracking-widest h-16"
                      maxLength={8}
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    disabled={loading || !inviteCode}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Validate Code'
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Don't have an invite code?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('waitlist')}
                      className="text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      Join the waitlist
                    </button>
                  </p>
                </form>
              )}

              {/* Waitlist Form */}
              {mode === 'waitlist' && (
                <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-lg font-semibold">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="referral">How did you hear about us?</Label>
                    <select
                      id="referral"
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="w-full h-12 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={loading}
                    >
                      <option value="">Select an option</option>
                      <option value="friend">Friend or colleague</option>
                      <option value="social">Social media</option>
                      <option value="search">Search engine</option>
                      <option value="press">Press or blog</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Waitlist'
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Already have an invite code?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('code')}
                      className="text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      Enter it here
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Discovery</h3>
              <p className="text-gray-600 text-sm">
                Find events tailored to your interests with AI-powered recommendations
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Location-Based</h3>
              <p className="text-gray-600 text-sm">
                Discover amazing events happening near you in real-time
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Personalized</h3>
              <p className="text-gray-600 text-sm">
                Get recommendations that match your unique preferences
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
