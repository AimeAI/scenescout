import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MapPin, Users, Clock, Plus, Share } from 'lucide-react'
import Link from 'next/link'
import BlurImage from '@/components/BlurImage'

// TODO: Fetch from Supabase based on authenticated user
const mockPlans = [
  {
    id: 'plan-1',
    title: 'NYC Weekend Adventure',
    description: 'A perfect weekend exploring the best of Manhattan nightlife and culture',
    coverImage: '/plans/nyc-weekend.jpg',
    city: 'New York',
    duration: '2 days',
    status: 'active',
    isPublic: true,
    createdAt: '2024-01-10',
    events: [
      { id: '1', title: 'Jazz at Blue Note', time: 'Fri 8:00 PM' },
      { id: '2', title: 'Rooftop Brunch', time: 'Sat 11:00 AM' },
      { id: '3', title: 'Brooklyn Art Walk', time: 'Sat 3:00 PM' }
    ],
    collaborators: [
      { id: '1', name: 'Sarah Chen', avatar: '/avatars/sarah.jpg' },
      { id: '2', name: 'Mike Rodriguez', avatar: '/avatars/mike.jpg' }
    ]
  },
  {
    id: 'plan-2',
    title: 'London Cultural Tour',
    description: 'Museums, theaters, and hidden gems across London',
    coverImage: '/plans/london-culture.jpg',
    city: 'London', 
    duration: '3 days',
    status: 'draft',
    isPublic: false,
    createdAt: '2024-01-08',
    events: [
      { id: '4', title: 'West End Show', time: 'Thu 7:30 PM' },
      { id: '5', title: 'Tate Modern', time: 'Fri 10:00 AM' }
    ],
    collaborators: []
  }
]

function PlanCard({ plan }: { plan: typeof mockPlans[0] }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        <BlurImage
          src={plan.coverImage}
          alt={plan.title}
          fill
          className="object-cover rounded-t-lg"
        />
        <div className="absolute top-4 left-4">
          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
            {plan.status}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          {plan.isPublic && (
            <Badge variant="outline" className="bg-white/90">
              Public
            </Badge>
          )}
        </div>
      </div>
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{plan.title}</CardTitle>
            <CardDescription className="mt-1">{plan.description}</CardDescription>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {plan.city}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {plan.duration}
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {plan.events.length} events
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Events Preview */}
        <div className="space-y-2 mb-4">
          {plan.events.slice(0, 3).map((event) => (
            <div key={event.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{event.title}</span>
              <span className="text-muted-foreground text-xs">{event.time}</span>
            </div>
          ))}
          {plan.events.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{plan.events.length - 3} more events
            </div>
          )}
        </div>
        
        {/* Collaborators */}
        {plan.collaborators.length > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {plan.collaborators.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {plan.collaborators.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{plan.collaborators.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/plan/${plan.id}`}>
              View Plan
            </Link>
          </Button>
          <Button variant="outline" size="icon">
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlanPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">My Plans</h1>
            <p className="text-muted-foreground text-lg">
              Create and manage your event plans
            </p>
          </div>
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create New Plan
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Plans</CardDescription>
              <CardTitle className="text-2xl">12</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Plans</CardDescription>
              <CardTitle className="text-2xl">3</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Shared Plans</CardDescription>
              <CardTitle className="text-2xl">8</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>This Month</CardDescription>
              <CardTitle className="text-2xl">24</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filter/Sort */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">All Plans</Button>
            <Button variant="ghost" size="sm">Active</Button>
            <Button variant="ghost" size="sm">Drafts</Button>
            <Button variant="ghost" size="sm">Shared</Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">Sort by Date</Button>
            <Button variant="ghost" size="sm">Filter</Button>
          </div>
        </div>

        {/* Plans Grid */}
        {mockPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <Card className="py-16">
            <CardContent className="text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No plans yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first plan to start organizing your events
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Load More */}
        {mockPlans.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Plans
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}