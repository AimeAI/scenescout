import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, Clock, Users, Share, Edit, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import BlurImage from '@/components/BlurImage'

interface PlanPageProps {
  params: {
    id: string
  }
}

// TODO: Fetch from Supabase
async function getPlan(id: string) {
  // Mock data - replace with Supabase query
  const plans = {
    'plan-1': {
      id: 'plan-1',
      title: 'NYC Weekend Adventure',
      description: 'A perfect weekend exploring the best of Manhattan nightlife and culture. This plan includes jazz clubs, rooftop dining, art galleries, and hidden speakeasy bars.',
      coverImage: '/plans/nyc-weekend.jpg',
      city: 'New York',
      citySlug: 'new-york',
      duration: '2 days',
      status: 'active',
      isPublic: true,
      isOwner: true,
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12',
      author: {
        id: 'user1',
        name: 'John Doe',
        username: '@johndoe',
        avatar: '/avatars/john.jpg'
      },
      events: [
        {
          id: '1',
          title: 'Jazz at Blue Note',
          venue: 'Blue Note Jazz Club',
          address: '131 W 3rd St, New York, NY',
          time: 'Friday 8:00 PM',
          date: '2024-01-19',
          price: 45,
          image: '/events/jazz.jpg',
          description: 'Intimate jazz performance featuring local and touring artists',
          website: 'https://bluenotejazz.com'
        },
        {
          id: '2',
          title: 'Rooftop Brunch & Views',
          venue: 'Sky Terrace',
          address: '123 High Line, New York, NY', 
          time: 'Saturday 11:00 AM',
          date: '2024-01-20',
          price: 65,
          image: '/events/brunch.jpg',
          description: 'Elevated brunch experience with panoramic city views',
          website: 'https://skyterrace.nyc'
        },
        {
          id: '3',
          title: 'Brooklyn Art Walk',
          venue: 'DUMBO Art District',
          address: 'Brooklyn Bridge Park, NY',
          time: 'Saturday 3:00 PM', 
          date: '2024-01-20',
          price: 0,
          image: '/events/art.jpg',
          description: 'Self-guided tour of local galleries and street art',
          website: null
        }
      ],
      collaborators: [
        { id: '2', name: 'Sarah Chen', username: '@sarahc', avatar: '/avatars/sarah.jpg', role: 'editor' },
        { id: '3', name: 'Mike Rodriguez', username: '@mikerod', avatar: '/avatars/mike.jpg', role: 'viewer' }
      ],
      notes: 'Remember to book reservations in advance. Check weather for outdoor events.'
    }
  }
  
  return plans[id as keyof typeof plans] || null
}

function EventCard({ event }: { event: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex">
        <div className="relative w-32 h-32 flex-shrink-0">
          <BlurImage
            src={event.image}
            alt={event.title}
            fill
            className="object-cover rounded-l-lg"
          />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold">{event.title}</h4>
              <p className="text-sm text-muted-foreground">{event.venue}</p>
            </div>
            {event.price > 0 && (
              <Badge variant="outline">${event.price}</Badge>
            )}
            {event.price === 0 && (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
          
          <div className="space-y-1 text-sm text-muted-foreground mb-3">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-2" />
              {event.time}
            </div>
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-2" />
              {event.address}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {event.description}
          </p>
          
          <div className="flex items-center gap-2">
            {event.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={event.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Visit
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default async function PlanDetailPage({ params }: PlanPageProps) {
  const plan = await getPlan(params.id)
  
  if (!plan) {
    notFound()
  }

  const totalCost = plan.events.reduce((sum, event) => sum + event.price, 0)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-80">
        <BlurImage
          src={plan.coverImage}
          alt={plan.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="flex items-center justify-between">
              <div className="text-white space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                    {plan.status}
                  </Badge>
                  {plan.isPublic && (
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                      Public Plan
                    </Badge>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold">{plan.title}</h1>
                <p className="text-xl max-w-2xl">{plan.description}</p>
                
                <div className="flex items-center space-x-6 text-sm pt-4">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <Link href={`/city/${plan.citySlug}`} className="hover:underline">
                      {plan.city}
                    </Link>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {plan.duration}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {plan.events.length} events
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    {plan.collaborators.length + 1} people
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {plan.isOwner && (
                  <Button variant="secondary">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Plan
                  </Button>
                )}
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-black">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Events ({plan.events.length})</CardTitle>
                  {plan.isOwner && (
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            {plan.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{plan.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan Info */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Created by</h4>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={plan.author.avatar} alt={plan.author.name} />
                      <AvatarFallback>
                        {plan.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{plan.author.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.author.username}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{new Date(plan.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Estimated Cost</span>
                    <span>${totalCost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collaborators */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Collaborators</CardTitle>
                  {plan.isOwner && (
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                          <AvatarFallback>
                            {collaborator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{collaborator.name}</p>
                          <p className="text-xs text-muted-foreground">{collaborator.username}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {collaborator.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Export to Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share className="w-4 h-4 mr-2" />
                  Generate Share Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}