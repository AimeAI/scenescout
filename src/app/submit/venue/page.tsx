import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { MapPin, Globe, Phone, Clock, Camera, Users } from 'lucide-react'
import Link from 'next/link'

const venueTypes = [
  'Restaurant',
  'Bar',
  'Club',
  'Concert Venue',
  'Art Gallery',
  'Museum',
  'Theater',
  'Outdoor Space',
  'Community Center',
  'Coworking Space',
  'Hotel',
  'Other'
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

const capacityRanges = [
  '1-25 people',
  '26-50 people', 
  '51-100 people',
  '101-250 people',
  '251-500 people',
  '501-1000 people',
  '1000+ people'
]

export default function SubmitVenuePage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Add New Venue</h1>
          <p className="text-muted-foreground text-lg">
            Help us expand our database of amazing venues
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/submit">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5" />
                  <span className="ml-2">Submit Event</span>
                </CardTitle>
                <CardDescription>
                  Share a specific event happening at a venue
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Venue Details</CardTitle>
            <CardDescription>
              Fill out the information below to add a new venue to SceneScout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name *</Label>
                    <Input 
                      id="name"
                      placeholder="e.g., Blue Note Jazz Club"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Venue Type *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select venue type" />
                      </SelectTrigger>
                      <SelectContent>
                        {venueTypes.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase().replace(/\s+/g, '-')}>
                            {type}
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
                    placeholder="Describe the venue's atmosphere, style, and what makes it special..."
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Neighborhood</Label>
                    <Input 
                      id="neighborhood"
                      placeholder="e.g., Greenwich Village"
                    />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude (optional)</Label>
                    <Input 
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="40.7306"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude (optional)</Label>
                    <Input 
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-73.9866"
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact & Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="website"
                        type="url"
                        placeholder="https://venue.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="info@venue.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select capacity range" />
                      </SelectTrigger>
                      <SelectContent>
                        {capacityRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Operating Hours</h3>
                
                <div className="space-y-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="grid grid-cols-4 gap-4 items-center">
                      <Label className="font-medium">{day}</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox />
                        <span className="text-sm text-muted-foreground">Closed</span>
                      </div>
                      <Input type="time" placeholder="Open" />
                      <Input type="time" placeholder="Close" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities & Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Amenities & Features</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    'Free WiFi',
                    'Outdoor Seating',
                    'Live Music',
                    'Dance Floor',
                    'Full Bar',
                    'Food Available',
                    'Private Events',
                    'Wheelchair Accessible',
                    'Parking Available',
                    'Air Conditioning',
                    'Sound System',
                    'Stage/Performance Area'
                  ].map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox id={amenity.toLowerCase().replace(/\s+/g, '-')} />
                      <Label htmlFor={amenity.toLowerCase().replace(/\s+/g, '-')} className="text-sm">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Media (Optional)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input 
                      id="instagram"
                      placeholder="@venuename"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input 
                      id="facebook"
                      placeholder="facebook.com/venuename"
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Images</h3>
                
                <div className="border-2 border-dashed border-muted rounded-lg p-8">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h4 className="font-medium mb-2">Upload Venue Photos</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add photos that showcase the venue's interior, exterior, and atmosphere (Max 10 images, 10MB each)
                    </p>
                    <Button variant="outline">
                      Choose Files
                    </Button>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Special Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about the venue, special policies, or unique features..."
                    rows={3}
                  />
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
                    and confirm that I have the right to submit this venue information. I understand that submitted venues will be reviewed before publication.
                  </Label>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox id="accuracy" required />
                  <Label htmlFor="accuracy" className="text-sm leading-relaxed">
                    I confirm that all information provided is accurate and up-to-date to the best of my knowledge.
                  </Label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <Button type="submit" size="lg" className="flex-1">
                  Submit Venue for Review
                </Button>
                <Button type="button" variant="outline" size="lg">
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Submission Guidelines */}
        <Card className="mt-8 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">Venue Submission Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-green-800 space-y-2">
              <li>• Venue submissions are typically reviewed within 2-3 business days</li>
              <li>• Include high-quality photos that show the venue's character</li>
              <li>• Provide accurate contact information and operating hours</li>
              <li>• Venues must be legitimate businesses or established event spaces</li>
              <li>• Duplicate venues will be merged with existing entries</li>
              <li>• We may contact you for additional verification</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}