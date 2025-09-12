import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  Calendar,
  Search,
  Download,
  Filter
} from 'lucide-react'

// TODO: Fetch from Supabase with admin role check
const mockSalesData = {
  totalRevenue: 124500,
  monthlyRevenue: 28600,
  totalSubscriptions: 2480,
  newSubscriptions: 184,
  churnRate: 4.2,
  averageRevenuePerUser: 50.20,
  growthRate: 18.5,
  conversionRate: 12.8
}

const mockSubscriptions = [
  {
    id: '1',
    user: {
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatar: '/avatars/sarah.jpg'
    },
    plan: 'Scout',
    status: 'active',
    monthlyValue: 9.99,
    startDate: '2024-01-15',
    nextBilling: '2024-02-15',
    totalPaid: 29.97
  },
  {
    id: '2',
    user: {
      name: 'Mike Rodriguez', 
      email: 'mike@example.com',
      avatar: '/avatars/mike.jpg'
    },
    plan: 'Curator',
    status: 'active',
    monthlyValue: 19.99,
    startDate: '2023-11-20',
    nextBilling: '2024-02-20',
    totalPaid: 59.97
  },
  {
    id: '3',
    user: {
      name: 'Alex Thompson',
      email: 'alex@example.com',
      avatar: '/avatars/alex.jpg'
    },
    plan: 'Scout',
    status: 'cancelled',
    monthlyValue: 9.99,
    startDate: '2023-12-01',
    nextBilling: null,
    totalPaid: 19.98
  }
]

const mockSalesMetrics = [
  {
    period: 'January 2024',
    newSubscriptions: 184,
    revenue: 28600,
    churn: 12,
    growth: '+18.5%'
  },
  {
    period: 'December 2023',
    newSubscriptions: 167,
    revenue: 24200,
    churn: 15,
    growth: '+22.1%'
  },
  {
    period: 'November 2023',
    newSubscriptions: 142,
    revenue: 19800,
    churn: 18,
    growth: '+15.3%'
  }
]

function SalesMetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: { 
  title: string
  value: string | number
  change: string
  icon: any
  trend: 'up' | 'down'
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
        <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? (
            <TrendingUp className="w-3 h-3 mr-1" />
          ) : (
            <TrendingDown className="w-3 h-3 mr-1" />
          )}
          {change}
        </div>
      </CardHeader>
    </Card>
  )
}

export default function AdminSalesPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor subscription revenue and customer metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button>
              View Reports
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SalesMetricCard
            title="Monthly Revenue"
            value={`$${(mockSalesData.monthlyRevenue / 1000).toFixed(1)}K`}
            change="+18.5%"
            icon={DollarSign}
            trend="up"
          />
          <SalesMetricCard
            title="Active Subscriptions"
            value={mockSalesData.totalSubscriptions.toLocaleString()}
            change="+7.2%"
            icon={Users}
            trend="up"
          />
          <SalesMetricCard
            title="Conversion Rate"
            value={`${mockSalesData.conversionRate}%`}
            change="+2.3%"
            icon={Target}
            trend="up"
          />
          <SalesMetricCard
            title="Churn Rate"
            value={`${mockSalesData.churnRate}%`}
            change="-0.8%"
            icon={TrendingDown}
            trend="up"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Growth</CardTitle>
                  <CardDescription>Monthly recurring revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4" />
                      <p>Revenue chart integration coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Distribution</CardTitle>
                  <CardDescription>Subscription breakdown by plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Explorer (Free)</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="w-16 bg-blue-500 h-2 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">1,240</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Scout ($9.99)</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="w-12 bg-green-500 h-2 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">1,890</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Curator ($19.99)</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="w-6 bg-purple-500 h-2 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium">590</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Key metrics by month</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>New Subscriptions</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Churn</TableHead>
                      <TableHead>Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSalesMetrics.map((metric, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{metric.period}</TableCell>
                        <TableCell>{metric.newSubscriptions}</TableCell>
                        <TableCell>${metric.revenue.toLocaleString()}</TableCell>
                        <TableCell>{metric.churn}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">{metric.growth}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">All Status</Button>
                <Button variant="ghost" size="sm">Active</Button>
                <Button variant="ghost" size="sm">Trial</Button>
                <Button variant="ghost" size="sm">Cancelled</Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subscribers..."
                    className="pl-9 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Subscriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions ({mockSubscriptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Value</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead>Total Paid</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={subscription.user.avatar} alt={subscription.user.name} />
                              <AvatarFallback>
                                {subscription.user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{subscription.user.name}</div>
                              <div className="text-sm text-muted-foreground">{subscription.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{subscription.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                            {subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${subscription.monthlyValue}</TableCell>
                        <TableCell>
                          {subscription.nextBilling ? 
                            new Date(subscription.nextBilling).toLocaleDateString() : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>${subscription.totalPaid}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Revenue (All Time)</span>
                      <span className="font-semibold">${mockSalesData.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Revenue Per User</span>
                      <span className="font-semibold">${mockSalesData.averageRevenuePerUser}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Growth Rate</span>
                      <span className="font-semibold text-green-600">+{mockSalesData.growthRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Customer Lifetime Value</span>
                      <span className="font-semibold">$180.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Subscription Length</span>
                      <span className="font-semibold">14.2 months</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trial to Paid Conversion</span>
                      <span className="font-semibold">{mockSalesData.conversionRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Reports</CardTitle>
                <CardDescription>
                  Create custom reports for sales and revenue analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Calendar className="w-6 h-6 mb-2" />
                    Monthly Revenue Report
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="w-6 h-6 mb-2" />
                    Customer Churn Analysis
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <TrendingUp className="w-6 h-6 mb-2" />
                    Growth Metrics Report
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Target className="w-6 h-6 mb-2" />
                    Conversion Funnel Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}