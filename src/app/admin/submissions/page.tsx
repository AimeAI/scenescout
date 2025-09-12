import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  AlertTriangle
} from 'lucide-react'
import BlurImage from '@/components/BlurImage'

// TODO: Fetch from Supabase with admin role check
const mockSubmissions = [
  {
    id: '1',
    title: 'Underground Jazz Night',
    venue: 'The Basement Club',
    description: 'Intimate jazz performance featuring local artists in a cozy underground setting.',
    submittedBy: {
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatar: '/avatars/sarah.jpg'
    },
    submittedAt: '2024-01-15T10:30:00Z',
    status: 'pending',
    category: 'Music',
    city: 'New York',
    date: '2024-02-01',
    price: 25,
    images: ['/events/jazz-submit.jpg'],
    website: 'https://basementclub.nyc',
    priority: 'normal',
    moderatorNotes: ''
  },
  {
    id: '2',
    title: 'Rooftop Art Exhibition',
    venue: 'Sky Gallery',
    description: 'Contemporary art exhibition featuring emerging artists with stunning city views.',
    submittedBy: {
      name: 'Mike Rodriguez',
      email: 'mike@example.com', 
      avatar: '/avatars/mike.jpg'
    },
    submittedAt: '2024-01-14T15:45:00Z',
    status: 'approved',
    category: 'Art',
    city: 'New York',
    date: '2024-02-15',
    price: 0,
    images: ['/events/art-submit.jpg'],
    website: 'https://skygallery.com',
    priority: 'high',
    moderatorNotes: 'Great submission, approved for featured promotion.'
  },
  {
    id: '3',
    title: 'Street Food Festival',
    venue: 'Central Park',
    description: 'Food truck festival with vendors from around the world.',
    submittedBy: {
      name: 'Alex Thompson',
      email: 'alex@example.com',
      avatar: '/avatars/alex.jpg'
    },
    submittedAt: '2024-01-13T09:20:00Z',
    status: 'rejected',
    category: 'Food',
    city: 'New York',
    date: '2024-01-28',
    price: 0,
    images: ['/events/food-submit.jpg'],
    website: null,
    priority: 'low',
    moderatorNotes: 'Missing required permits documentation. Resubmission welcome with proper documentation.'
  }
]

const mockStats = {
  totalSubmissions: 156,
  pendingReview: 23,
  approvedThisWeek: 18,
  rejectedThisWeek: 5,
  averageReviewTime: '2.3 days'
}

function SubmissionCard({ submission }: { submission: typeof mockSubmissions[0] }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200'
  }

  const priorityColors = {
    low: 'text-muted-foreground',
    normal: 'text-foreground',
    high: 'text-orange-600'
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <CardTitle className="text-lg">{submission.title}</CardTitle>
              <Badge 
                variant="outline" 
                className={statusColors[submission.status as keyof typeof statusColors]}
              >
                {submission.status}
              </Badge>
            </div>
            <CardDescription className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {submission.venue}, {submission.city}
              </span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(submission.date).toLocaleDateString()}
              </span>
              <span className={`font-medium ${priorityColors[submission.priority as keyof typeof priorityColors]}`}>
                {submission.priority} priority
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Event Image */}
        {submission.images.length > 0 && (
          <div className="relative h-40 rounded-lg overflow-hidden">
            <BlurImage
              src={submission.images[0]}
              alt={submission.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {submission.description}
        </p>

        {/* Event Details */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <Badge variant="outline">{submission.category}</Badge>
            {submission.price > 0 ? (
              <span className="font-medium">${submission.price}</span>
            ) : (
              <span className="text-green-600 font-medium">Free</span>
            )}
          </div>
          <div className="flex items-center text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(submission.submittedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Submitter Info */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={submission.submittedBy.avatar} alt={submission.submittedBy.name} />
              <AvatarFallback className="text-xs">
                {submission.submittedBy.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-medium">{submission.submittedBy.name}</p>
              <p className="text-xs text-muted-foreground">{submission.submittedBy.email}</p>
            </div>
          </div>
        </div>

        {/* Moderator Notes */}
        {submission.moderatorNotes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Moderator Notes:</strong> {submission.moderatorNotes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Eye className="w-3 h-3 mr-1" />
            View Details
          </Button>
          {submission.status === 'pending' && (
            <>
              <Button size="sm" className="flex-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="flex-1">
                <XCircle className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminSubmissionsPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Event Submissions</h1>
            <p className="text-muted-foreground">
              Review and moderate user-submitted events
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              Review Guidelines
            </Button>
            <Button>
              Bulk Actions
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-2xl">{mockStats.totalSubmissions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{mockStats.pendingReview}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved This Week</CardDescription>
              <CardTitle className="text-2xl text-green-600">{mockStats.approvedThisWeek}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected This Week</CardDescription>
              <CardTitle className="text-2xl text-red-600">{mockStats.rejectedThisWeek}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Review Time</CardDescription>
              <CardTitle className="text-2xl">{mockStats.averageReviewTime}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({mockStats.pendingReview})
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All Submissions</TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search submissions..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <TabsContent value="pending" className="space-y-6">
            {/* Priority Filter */}
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">All Priority</Button>
              <Button variant="ghost" size="sm" className="text-orange-600">High Priority</Button>
              <Button variant="ghost" size="sm">Normal Priority</Button>
              <Button variant="ghost" size="sm">Low Priority</Button>
            </div>

            {/* Submissions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockSubmissions
                .filter(s => s.status === 'pending')
                .map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
            </div>

            {mockSubmissions.filter(s => s.status === 'pending').length === 0 && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    No pending submissions to review at the moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockSubmissions
                .filter(s => s.status === 'approved')
                .map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockSubmissions
                .filter(s => s.status === 'rejected')
                .map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            {/* Table View for All Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>All Submissions ({mockSubmissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{submission.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {submission.venue}, {submission.city}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={submission.submittedBy.avatar} alt={submission.submittedBy.name} />
                              <AvatarFallback className="text-xs">
                                {submission.submittedBy.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{submission.submittedBy.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{submission.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={submission.status === 'approved' ? 'default' : 
                                   submission.status === 'rejected' ? 'destructive' : 'secondary'}
                          >
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={
                            submission.priority === 'high' ? 'text-orange-600 font-medium' :
                            submission.priority === 'low' ? 'text-muted-foreground' : ''
                          }>
                            {submission.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}