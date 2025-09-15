import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { AvatarUpload } from '@/components/auth/AvatarUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { User, Mail, MapPin, Globe, Save } from 'lucide-react'

export function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || ''
  })

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      await updateProfile(formData)
      
      setIsEditing(false)
      setSuccess('Profile updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      website: profile?.website || ''
    })
    setIsEditing(false)
    setError(null)
  }

  const getSubscriptionBadgeColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-purple-600'
      case 'premium': return 'bg-gold-600'
      default: return 'bg-gray-600'
    }
  }

  if (!user || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <Button
            onClick={signOut}
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800"
          >
            Sign Out
          </Button>
        </div>

        {error && (
          <Alert className="border-red-500 bg-red-500/10 text-red-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-500/10 text-green-400">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Account Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your profile and subscription
                </CardDescription>
              </div>
              <Badge className={`${getSubscriptionBadgeColor(profile.subscription_tier)} text-white`}>
                {profile.subscription_tier?.toUpperCase() || 'FREE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Profile Picture
              </label>
              <AvatarUpload 
                currentAvatarUrl={profile.avatar_url}
                onUploadComplete={() => {}}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                Email
              </label>
              <Input
                value={user.email || ''}
                disabled
                className="bg-gray-800 border-gray-700 text-gray-400"
              />
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <User className="inline w-4 h-4 mr-2" />
                Display Name
              </label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                disabled={!isEditing}
                placeholder="Your display name"
                className="bg-gray-800 border-gray-700 text-white disabled:text-gray-400"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                placeholder="Tell us about yourself"
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <MapPin className="inline w-4 h-4 mr-2" />
                Location
              </label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!isEditing}
                placeholder="Your location"
                className="bg-gray-800 border-gray-700 text-white disabled:text-gray-400"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Globe className="inline w-4 h-4 mr-2" />
                Website
              </label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                disabled={!isEditing}
                placeholder="https://your-website.com"
                className="bg-gray-800 border-gray-700 text-white disabled:text-gray-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isSaving}
                    className="border-gray-700 text-white hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Subscription</CardTitle>
            <CardDescription className="text-gray-400">
              Current plan: {profile.subscription_tier?.toUpperCase() || 'FREE'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.subscription_tier === 'free' ? (
              <div className="space-y-4">
                <p className="text-gray-400">
                  Upgrade to Pro for advanced features and unlimited access.
                </p>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <a href="/pricing">Upgrade to Pro</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-green-400">
                  ✓ You have an active {profile.subscription_tier} subscription
                </p>
                {profile.subscription_expires_at && (
                  <p className="text-sm text-gray-400">
                    Expires: {new Date(profile.subscription_expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}