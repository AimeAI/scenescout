import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Zap, Crown } from 'lucide-react'

const plans = [
  {
    id: 'free',
    name: 'Explorer',
    description: 'Perfect for casual event discovery',
    price: 0,
    icon: Star,
    popular: false,
    features: [
      'Browse unlimited events',
      'Create up to 3 plans',
      'Basic event filters',
      'Community wall access',
      'Mobile app access'
    ],
    limitations: [
      'Limited to 3 active plans',
      'Basic search filters only',
      'No priority support'
    ]
  },
  {
    id: 'pro',
    name: 'Scout',
    description: 'For serious urban explorers',
    price: 9.99,
    icon: Zap,
    popular: true,
    features: [
      'Everything in Explorer',
      'Unlimited plans',
      'Advanced filters & search',
      'Plan collaboration',
      'Export to calendar',
      'Priority event notifications',
      'Map integrations',
      'Email support'
    ],
    limitations: []
  },
  {
    id: 'premium',
    name: 'Curator',
    description: 'For event organizers and power users',
    price: 19.99,
    icon: Crown,
    popular: false,
    features: [
      'Everything in Scout',
      'Submit unlimited events',
      'Event analytics dashboard',
      'Custom event pages',
      'API access',
      'White-label options',
      'Dedicated account manager',
      'Phone support'
    ],
    limitations: []
  }
]

const faqs = [
  {
    question: 'Can I change my plan anytime?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing adjustments are prorated.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'All paid plans come with a 14-day free trial. No credit card required to start your trial.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal.'
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel your subscription at any time from your account settings. Your plan will remain active until the end of your billing period.'
  },
  {
    question: 'Do you offer discounts for students or nonprofits?',
    answer: 'Yes! We offer 50% discounts for students and qualified nonprofit organizations. Contact us for more information.'
  }
]

function PlanCard({ plan }: { plan: typeof plans[0] }) {
  const IconComponent = plan.icon

  return (
    <Card className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="px-3 py-1">Most Popular</Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${plan.popular ? 'bg-primary' : 'bg-muted'}`}>
            <IconComponent className={`w-6 h-6 ${plan.popular ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          </div>
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="pt-4">
          <div className="text-4xl font-bold">
            ${plan.price}
            <span className="text-lg font-normal text-muted-foreground">/month</span>
          </div>
          {plan.price > 0 && (
            <p className="text-sm text-muted-foreground mt-1">14-day free trial</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Button 
          className={`w-full ${plan.popular ? '' : 'variant-outline'}`} 
          variant={plan.popular ? 'default' : 'outline'}
          size="lg"
        >
          {plan.price === 0 ? 'Get Started Free' : 'Start Free Trial'}
        </Button>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Features included:</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{faq.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{faq.answer}</p>
      </CardContent>
    </Card>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your Adventure
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Find the perfect plan to discover events, create plans, and connect with urban culture enthusiasts
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Feature Comparison</h2>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-6 font-semibold">Features</th>
                      <th className="text-center p-6 font-semibold">Explorer</th>
                      <th className="text-center p-6 font-semibold bg-muted">Scout</th>
                      <th className="text-center p-6 font-semibold">Curator</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-6">Active Plans</td>
                      <td className="text-center p-6">3</td>
                      <td className="text-center p-6 bg-muted">Unlimited</td>
                      <td className="text-center p-6">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-6">Event Submissions</td>
                      <td className="text-center p-6">-</td>
                      <td className="text-center p-6 bg-muted">5/month</td>
                      <td className="text-center p-6">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-6">Advanced Filters</td>
                      <td className="text-center p-6">-</td>
                      <td className="text-center p-6 bg-muted"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                      <td className="text-center p-6"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-6">Analytics Dashboard</td>
                      <td className="text-center p-6">-</td>
                      <td className="text-center p-6 bg-muted">-</td>
                      <td className="text-center p-6"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-6">API Access</td>
                      <td className="text-center p-6">-</td>
                      <td className="text-center p-6 bg-muted">-</td>
                      <td className="text-center p-6"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="p-6">Support</td>
                      <td className="text-center p-6">Community</td>
                      <td className="text-center p-6 bg-muted">Email</td>
                      <td className="text-center p-6">Phone + Email</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {faqs.map((faq, index) => (
              <FAQItem key={index} faq={faq} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-muted/50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Exploring?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of urban explorers discovering the best events and experiences in their cities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}