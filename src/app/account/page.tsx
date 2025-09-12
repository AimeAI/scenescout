import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Bell, Shield, CreditCard, Settings, Camera } from 'lucide-react'

// TODO: Fetch from Supabase auth and user profile
const mockUser = {
  id: 'user1',
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  avatar: '/avatars/john.jpg',
  bio: 'Urban explorer and event enthusiast. Always looking for the next great experience.',
  location: 'New York, NY',
  joinedAt: '2023-06-15',
  subscription: {
    plan: 'Pro',
    status: 'active',
    nextBilling: '2024-02-15'
  },
  stats: {
    plansCreated: 12,
    eventsAttended: 48,
    citiesExplored: 8
  },
  preferences: {
    emailNotifications: true,
    pushNotifications: true,
    publicProfile: true,
    showActivity: true
  }
}

export default function AccountPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and account preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile details and avatar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                    <AvatarFallback>
                      {mockUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline">
                      <Camera className="w-4 h-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={mockUser.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue={mockUser.username} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={mockUser.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" defaultValue={mockUser.location} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" defaultValue={mockUser.bio} rows={3} />
                </div>

                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            {/* Account Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{mockUser.stats.plansCreated}</div>
                    <div className="text-sm text-muted-foreground">Plans Created</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{mockUser.stats.eventsAttended}</div>
                    <div className="text-sm text-muted-foreground">Events Attended</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{mockUser.stats.citiesExplored}</div>
                    <div className="text-sm text-muted-foreground">Cities Explored</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified about activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about events and plans
                    </p>
                  </div>
                  <Switch defaultChecked={mockUser.preferences.emailNotifications} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Get push notifications on your device
                    </p>
                  </div>
                  <Switch defaultChecked={mockUser.preferences.pushNotifications} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Email Types</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New events in followed cities</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plan collaborations</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Weekly digest</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Marketing emails</span>
                      <Switch />
                    </div>
                  </div>
                </div>

                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control who can see your information and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Public Profile</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow others to find and view your profile
                    </p>
                  </div>
                  <Switch defaultChecked={mockUser.preferences.publicProfile} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show Activity</h4>
                    <p className="text-sm text-muted-foreground">
                      Display your plans and event activity publicly
                    </p>
                  </div>
                  <Switch defaultChecked={mockUser.preferences.showActivity} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Data Management</h4>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      Download My Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Manage your subscription and billing details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{mockUser.subscription.plan} Plan</h3>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Next billing: {new Date(mockUser.subscription.nextBilling).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$9.99</div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">Change Plan</Button>
                  <Button variant="outline">Cancel Subscription</Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Payment Method</h4>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-8 h-8" />
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/26</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Billing History</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Pro Plan - January 2024</p>
                        <p className="text-sm text-muted-foreground">Jan 15, 2024</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$9.99</p>
                        <Badge variant="secondary">Paid</Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">Pro Plan - December 2023</p>
                        <p className="text-sm text-muted-foreground">Dec 15, 2023</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$9.99</p>
                        <Badge variant="secondary">Paid</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}