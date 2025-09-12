import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, MoreVertical, TrendingUp, Users, DollarSign } from 'lucide-react'
import BlurImage from '@/components/BlurImage'

// TODO: Fetch from Supabase with admin role check
const mockPromotions = [
  {
    id: '1',
    title: 'NYC Jazz Weekend',
    description: 'Promote jazz events across Manhattan',
    status: 'active',
    budget: 5000,
    spent: 3200,
    impressions: 45000,
    clicks: 1200,
    conversions: 89,
    startDate: '2024-01-10',
    endDate: '2024-01-31',
    targetCities: ['New York'],
    eventTypes: ['Music', 'Nightlife']
  },
  {
    id: '2',
    title: 'London Art Month',
    description: 'Gallery openings and art events',
    status: 'draft',
    budget: 8000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    startDate: '2024-02-01',
    endDate: '2024-02-29',
    targetCities: ['London'],
    eventTypes: ['Art', 'Culture']
  },
  {
    id: '3',
    title: 'Global Food Festival',
    description: 'Food events worldwide',
    status: 'completed',
    budget: 12000,
    spent: 11500,
    impressions: 120000,
    clicks: 3400,
    conversions: 267,
    startDate: '2023-12-01',
    endDate: '2023-12-31',
    targetCities: ['New York', 'London', 'Tokyo'],
    eventTypes: ['Food', 'Culture']
  }
]

const mockStats = {
  totalPromotions: 24,
  activePromotions: 8,
  totalSpent: 45600,
  totalImpressions: 1200000,
  totalClicks: 34500,
  totalConversions: 2890,
  averageCTR: 2.87,
  averageCVR: 8.38
}

function PromotionCard({ promotion }: { promotion: typeof mockPromotions[0] }) {
  const ctr = promotion.impressions > 0 ? ((promotion.clicks / promotion.impressions) * 100).toFixed(2) : '0.00'
  const cvr = promotion.clicks > 0 ? ((promotion.conversions / promotion.clicks) * 100).toFixed(2) : '0.00'
  const budgetUsed = promotion.budget > 0 ? ((promotion.spent / promotion.budget) * 100).toFixed(0) : '0'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{promotion.title}</CardTitle>
            <CardDescription>{promotion.description}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={
              promotion.status === 'active' ? 'default' :
              promotion.status === 'completed' ? 'secondary' : 'outline'
            }>
              {promotion.status}
            </Badge>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Budget Used</span>
            <span>{budgetUsed}% (${promotion.spent.toLocaleString()} / ${promotion.budget.toLocaleString()})</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(100, Number(budgetUsed))}%` }}
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">{promotion.impressions.toLocaleString()}</div>
            <div className="text-muted-foreground">Impressions</div>
          </div>
          <div>
            <div className="font-medium">{promotion.clicks.toLocaleString()}</div>
            <div className="text-muted-foreground">Clicks</div>
          </div>
          <div>
            <div className="font-medium">{ctr}%</div>
            <div className="text-muted-foreground">CTR</div>
          </div>
          <div>
            <div className="font-medium">{promotion.conversions}</div>
            <div className="text-muted-foreground">Conversions</div>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="pt-2 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cities:</span>
            <span>{promotion.targetCities.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Types:</span>
            <span>{promotion.eventTypes.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration:</span>
            <span>
              {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            View Details
          </Button>
          {promotion.status === 'draft' && (
            <Button size="sm" className="flex-1">
              Launch
            </Button>
          )}
          {promotion.status === 'active' && (
            <Button size="sm" variant="outline" className="flex-1">
              Pause
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPromotionsPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Promotions</h1>
            <p className="text-muted-foreground">
              Manage promotional campaigns and track performance
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Promotion
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Active Campaigns</CardDescription>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{mockStats.activePromotions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Total Spent</CardDescription>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">${(mockStats.totalSpent / 1000).toFixed(0)}K</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Impressions</CardDescription>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{(mockStats.totalImpressions / 1000000).toFixed(1)}M</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Avg CTR</CardDescription>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{mockStats.averageCTR}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm">Filter</Button>
            </div>
          </div>

          <TabsContent value="campaigns" className="space-y-6">
            {/* Status Filter */}
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">All</Button>
              <Button variant="ghost" size="sm">Active ({mockStats.activePromotions})</Button>
              <Button variant="ghost" size="sm">Draft</Button>
              <Button variant="ghost" size="sm">Completed</Button>
            </div>

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockPromotions.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Impressions</span>
                      <span className="font-semibold">{mockStats.totalImpressions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Clicks</span>
                      <span className="font-semibold">{mockStats.totalClicks.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Conversions</span>
                      <span className="font-semibold">{mockStats.totalConversions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average CVR</span>
                      <span className="font-semibold">{mockStats.averageCVR}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Cities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>New York</span>
                      <span className="text-sm text-muted-foreground">1,240 conversions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>London</span>
                      <span className="text-sm text-muted-foreground">890 conversions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tokyo</span>
                      <span className="text-sm text-muted-foreground">760 conversions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Settings</CardTitle>
                <CardDescription>
                  Configure default settings for new promotional campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Campaign settings configuration coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}