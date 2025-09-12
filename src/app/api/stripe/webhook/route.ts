import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
// import { supabase } from '@/lib/supabase'

// TODO: Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)
  
  // TODO: Update user subscription in Supabase
  // const { error } = await supabase
  //   .from('subscriptions')
  //   .insert({
  //     stripe_subscription_id: subscription.id,
  //     stripe_customer_id: subscription.customer as string,
  //     status: subscription.status,
  //     current_period_start: new Date(subscription.current_period_start * 1000),
  //     current_period_end: new Date(subscription.current_period_end * 1000),
  //     plan_id: subscription.items.data[0]?.price.id,
  //   })
  
  // if (error) {
  //   console.error('Error creating subscription:', error)
  //   throw error
  // }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)
  
  // TODO: Update subscription in Supabase
  // const { error } = await supabase
  //   .from('subscriptions')
  //   .update({
  //     status: subscription.status,
  //     current_period_start: new Date(subscription.current_period_start * 1000),
  //     current_period_end: new Date(subscription.current_period_end * 1000),
  //     plan_id: subscription.items.data[0]?.price.id,
  //   })
  //   .eq('stripe_subscription_id', subscription.id)
  
  // if (error) {
  //   console.error('Error updating subscription:', error)
  //   throw error
  // }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)
  
  // TODO: Mark subscription as cancelled in Supabase
  // const { error } = await supabase
  //   .from('subscriptions')
  //   .update({
  //     status: 'cancelled',
  //     cancelled_at: new Date(),
  //   })
  //   .eq('stripe_subscription_id', subscription.id)
  
  // if (error) {
  //   console.error('Error cancelling subscription:', error)
  //   throw error
  // }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id)
  
  // TODO: Record successful payment in Supabase
  // const { error } = await supabase
  //   .from('payments')
  //   .insert({
  //     stripe_invoice_id: invoice.id,
  //     stripe_customer_id: invoice.customer as string,
  //     amount_paid: invoice.amount_paid,
  //     currency: invoice.currency,
  //     status: 'succeeded',
  //     paid_at: new Date(invoice.status_transitions.paid_at! * 1000),
  //   })
  
  // if (error) {
  //   console.error('Error recording payment:', error)
  //   throw error
  // }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id)
  
  // TODO: Record failed payment and potentially notify user
  // const { error } = await supabase
  //   .from('payments')
  //   .insert({
  //     stripe_invoice_id: invoice.id,
  //     stripe_customer_id: invoice.customer as string,
  //     amount_paid: 0,
  //     currency: invoice.currency,
  //     status: 'failed',
  //     failed_at: new Date(),
  //   })
  
  // if (error) {
  //   console.error('Error recording failed payment:', error)
  //   throw error
  // }
  
  // TODO: Send email notification about failed payment
  // await sendPaymentFailedEmail(invoice.customer_email!)
}