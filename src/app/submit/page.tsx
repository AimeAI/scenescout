import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar as CalendarIcon, MapPin, Clock, DollarSign, Camera, Globe } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Link from 'next/link'

const eventCategories = [
  'Music',
  'Art',
  'Food & Drink', 
  'Nightlife',
  'Culture',
  'Tech',
  'Sports',
  'Wellness',
  'Business',
  'Community'
]

const cities = [
  'New York',
  'London',
  'Tokyo',
  'Berlin',
  'Paris',
  'San Francisco',
  'Los Angeles',
  'Miami',
  'Barcelona',
  'Amsterdam'
]

export default function SubmitEventPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Submit an Event</h1>
          <p className="text-muted-foreground text-lg">
            Share your event with the SceneScout community
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar />
                <span className="ml-2">Submit Event</span>
              </CardTitle>
              <CardDescription>
                Share a specific event happening at a venue
              </CardDescription>
            </CardHeader>
          </Card>
          <Link href="/submit/venue">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5" />
                  <span className="ml-2">Add Venue</span>
                </CardTitle>
                <CardDescription>
                  Add a new venue to our database
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              Fill out the information below to submit your event for review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input 
                      id="title"
                      placeholder="e.g., Underground Jazz Night"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventCategories.map((category) => (
                          <SelectItem key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your event, what makes it special, and what attendees can expect..."
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Location & Venue */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location & Venue</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue Name *</Label>
                    <Input 
                      id="venue"
                      placeholder="e.g., Blue Note Jazz Club"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city.toLowerCase().replace(/\s+/g, '-')}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address *</Label>
                  <Input 
                    id="address"
                    placeholder="e.g., 131 W 3rd St, New York, NY 10012"
                    required
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Date & Time</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Select date
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Start Time *</Label>
                    <Input 
                      id="time"
                      type="time"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input 
                      id="duration"
                      type="number"
                      placeholder="2"
                      min="0.5"
                      step="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input 
                      id="endTime"
                      type="time"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Ticket Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="price"
                        type="number"
                        placeholder="0"
                        className="pl-9"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketUrl">Ticket URL</Label>
                    <Input 
                      id="ticketUrl"
                      type="url"
                      placeholder="https://tickets.example.com"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="free-event" />
                  <Label htmlFor="free-event">This is a free event</Label>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Event Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="website"
                        type="url"
                        placeholder="https://event.example.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Email</Label>
                    <Input 
                      id="contact"
                      type="email"
                      placeholder="contact@event.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input 
                    id="tags"
                    placeholder="jazz, live music, intimate, local artists"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Images</h3>
                
                <div className="border-2 border-dashed border-muted rounded-lg p-8">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-medium mb-2">Upload Event Images</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add photos that showcase your event (Max 5 images, 10MB each)
                    </p>
                    <Button variant="outline">
                      Choose Files
                    </Button>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" required />
                  <Label htmlFor="terms" className="text-sm leading-relaxed">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and confirm that I have the right to submit this event. I understand that submitted events will be reviewed before publication.
                  </Label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <Button type="submit" size="lg" className="flex-1">
                  Submit for Review
                </Button>
                <Button type="button" variant="outline" size="lg">
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Submission Guidelines */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Submission Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Events are typically reviewed within 24-48 hours</li>
              <li>• Include high-quality images that represent your event</li>
              <li>• Provide accurate date, time, and location information</li>
              <li>• Events must comply with local laws and regulations</li>
              <li>• Promotional events require special approval</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}