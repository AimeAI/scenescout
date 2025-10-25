import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
} from '@react-email/components';

interface SavedEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  url: string;
}

interface WeeklyDigestEmailProps {
  userName: string;
  events: SavedEvent[];
  cityName?: string;
}

export default function WeeklyDigestEmail({
  userName,
  events,
  cityName = 'your area',
}: WeeklyDigestEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scenescout.app';
  const hasEvents = events.length > 0;

  return (
    <Html>
      <Head />
      <Preview>Your weekly event digest - {events.length.toString()} events coming up!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>📅 Your Weekly Digest</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hi {userName},
            </Text>

            <Text style={text}>
              Here's what's happening this week in {cityName}:
            </Text>

            {hasEvents ? (
              <>
                <Section style={statsBox}>
                  <Text style={statNumber}>{events.length}</Text>
                  <Text style={statLabel}>Events You've Saved</Text>
                </Section>

                {events.map((event, index) => (
                  <Section key={event.id} style={eventCard}>
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        style={eventCardImage}
                      />
                    )}
                    <Section style={eventCardContent}>
                      <Heading style={eventCardTitle}>{event.name}</Heading>

                      <Text style={eventCardDetail}>
                        📅 {event.date} at {event.time}
                      </Text>

                      <Text style={eventCardDetail}>
                        📍 {event.location}
                      </Text>

                      <Button style={eventCardButton} href={event.url}>
                        View Details
                      </Button>
                    </Section>
                  </Section>
                ))}

                <Button style={button} href={`${appUrl}/saved`}>
                  View All Saved Events
                </Button>
              </>
            ) : (
              <>
                <Section style={emptyState}>
                  <Text style={emptyStateText}>
                    You don't have any saved events yet.
                  </Text>
                  <Text style={emptyStateSubtext}>
                    Discover amazing events happening in {cityName} and start building your perfect week!
                  </Text>
                </Section>

                <Button style={button} href={appUrl}>
                  Discover Events
                </Button>
              </>
            )}

            <Section style={tipsBox}>
              <Heading style={tipsTitle}>💡 Quick Tips:</Heading>
              <Text style={tipText}>
                • Set reminders so you never miss an event
              </Text>
              <Text style={tipText}>
                • Create plans to organize multiple events
              </Text>
              <Text style={tipText}>
                • Share events with friends
              </Text>
            </Section>

            <Text style={footer}>
              Want to adjust your email preferences?
              <br />
              <a href={`${appUrl}/account/settings`} style={footerLink}>
                Update settings
              </a>
              {' '} | {' '}
              <a href={`${appUrl}/unsubscribe`} style={footerLink}>
                Unsubscribe
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 20px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '0 48px',
};

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const statsBox = {
  backgroundColor: '#f7fafc',
  borderRadius: '12px',
  padding: '32px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid #667eea',
};

const statNumber = {
  color: '#667eea',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0',
};

const statLabel = {
  color: '#4a5568',
  fontSize: '16px',
  margin: '8px 0 0 0',
};

const eventCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  overflow: 'hidden',
  margin: '16px 0',
};

const eventCardImage = {
  width: '100%',
  height: '200px',
  objectFit: 'cover' as const,
};

const eventCardContent = {
  padding: '20px',
};

const eventCardTitle = {
  color: '#1a202c',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const eventCardDetail = {
  color: '#4a5568',
  fontSize: '14px',
  margin: '8px 0',
};

const eventCardButton = {
  backgroundColor: '#667eea',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  margin: '16px 0 0 0',
};

const button = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 20px',
  margin: '32px 0',
};

const emptyState = {
  backgroundColor: '#f7fafc',
  borderRadius: '12px',
  padding: '48px 24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const emptyStateText = {
  color: '#1a202c',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const emptyStateSubtext = {
  color: '#4a5568',
  fontSize: '14px',
  margin: '0',
};

const tipsBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const tipsTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const tipText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '8px 0',
};

const footer = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '24px',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#667eea',
  textDecoration: 'none',
};
