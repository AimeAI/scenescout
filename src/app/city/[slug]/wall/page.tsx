import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Heart, MessageCircle, Share, Camera } from 'lucide-react'
import BlurImage from '@/components/BlurImage'

interface WallPageProps {
  params: {
    slug: string
  }
}

// TODO: Fetch from Supabase
async function getCityData(slug: string) {
  const cities = {
    'new-york': { name: 'New York', slug: 'new-york' },
    'london': { name: 'London', slug: 'london' },
    'tokyo': { name: 'Tokyo', slug: 'tokyo' },
    'berlin': { name: 'Berlin', slug: 'berlin' }
  }
  
  return cities[slug as keyof typeof cities] || null
}

// TODO: Fetch from Supabase with real-time updates
const mockPosts = [
  {
    id: '1',
    user: {
      id: 'user1',
      name: 'Sarah Chen',
      username: '@sarahc',
      avatar: '/avatars/sarah.jpg'
    },
    content: 'Amazing jazz night at Blue Note! The atmosphere was electric and the music was incredible. Can\'t wait for the next show 🎷',
    image: '/posts/jazz-night.jpg',
    timestamp: '2 hours ago',
    likes: 24,
    comments: 8,
    venue: 'Blue Note Jazz Club'
  },
  {
    id: '2',
    user: {
      id: 'user2', 
      name: 'Mike Rodriguez',
      username: '@mikerod',
      avatar: '/avatars/mike.jpg'
    },
    content: 'Just discovered this hidden speakeasy in the East Village. The cocktails are works of art! 🍸',
    image: '/posts/speakeasy.jpg',
    timestamp: '4 hours ago',
    likes: 56,
    comments: 12,
    venue: 'The Secret Room'
  },
  {
    id: '3',
    user: {
      id: 'user3',
      name: 'Alex Thompson',
      username: '@alexthompson',
      avatar: '/avatars/alex.jpg'
    },
    content: 'Brooklyn Art Walk was incredible today. So many talented local artists showcasing their work. The community here is amazing! 🎨',
    timestamp: '1 day ago',
    likes: 89,
    comments: 23,
    venue: null
  }
]

function PostCard({ post }: { post: typeof mockPosts[0] }) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={post.user.avatar} alt={post.user.name} />
            <AvatarFallback>{post.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-sm">{post.user.name}</h4>
              <span className="text-muted-foreground text-sm">{post.user.username}</span>
            </div>
            <p className="text-xs text-muted-foreground">{post.timestamp}</p>
            {post.venue && (
              <p className="text-xs text-primary">at {post.venue}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm mb-3 leading-relaxed">{post.content}</p>
        
        {post.image && (
          <div className="relative h-64 rounded-lg overflow-hidden mb-4">
            <BlurImage
              src={post.image}
              alt="Post image"
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500">
            <Heart className="w-4 h-4 mr-1" />
            {post.likes}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MessageCircle className="w-4 h-4 mr-1" />
            {post.comments}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function WallPage({ params }: WallPageProps) {
  const city = await getCityData(params.slug)
  
  if (!city) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{city.name} Community</h1>
          <p className="text-muted-foreground">
            Share your experiences and discover what's happening
          </p>
        </div>

        {/* Create Post */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex space-x-3">
              <Avatar>
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <Textarea 
                  placeholder="Share your experience or discover something new..."
                  className="min-h-[80px] resize-none"
                />
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Camera className="w-4 h-4 mr-2" />
                    Add Photo
                  </Button>
                  <Button size="sm">
                    Share Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter/Sort Options */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">Latest</Button>
            <Button variant="ghost" size="sm">Popular</Button>
            <Button variant="ghost" size="sm">Following</Button>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Filter
          </Button>
        </div>

        {/* Posts Feed */}
        <div>
          {mockPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline">Load More Posts</Button>
        </div>

        {/* Community Guidelines */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2">Community Guidelines</h4>
            <p className="text-xs text-muted-foreground">
              Keep posts relevant to {city.name} events and venues. Be respectful and help others discover amazing experiences.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}