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

interface EventReminderEmailProps {
  userName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventUrl: string;
  eventImageUrl?: string;
  hoursUntil: number;
}

export default function EventReminderEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  eventLocation,
  eventUrl,
  eventImageUrl,
  hoursUntil,
}: EventReminderEmailProps) {
  const timeText = hoursUntil <= 1
    ? 'happening soon'
    : hoursUntil <= 24
    ? `in ${hoursUntil} hours`
    : 'coming up';

  return (
    <Html>
      <Head />
      <Preview>{eventName} {timeText}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Event Reminder</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hi {userName},
            </Text>

            <Text style={text}>
              Just a friendly reminder that <strong>{eventName}</strong> is {timeText}!
            </Text>

            {eventImageUrl && (
              <Section style={imageContainer}>
                <img
                  src={eventImageUrl}
                  alt={eventName}
                  style={eventImage}
                />
              </Section>
            )}

            <Section style={eventDetails}>
              <Heading style={eventTitle}>{eventName}</Heading>

              <Section style={detailRow}>
                <Text style={detailLabel}>📅 Date:</Text>
                <Text style={detailValue}>{eventDate}</Text>
              </Section>

              <Section style={detailRow}>
                <Text style={detailLabel}>🕒 Time:</Text>
                <Text style={detailValue}>{eventTime}</Text>
              </Section>

              <Section style={detailRow}>
                <Text style={detailLabel}>📍 Location:</Text>
                <Text style={detailValue}>{eventLocation}</Text>
              </Section>
            </Section>

            <Button style={button} href={eventUrl}>
              View Event Details
            </Button>

            <Text style={tip}>
              💡 <strong>Pro tip:</strong> Add this event to your calendar so you don't forget!
            </Text>

            <Text style={footer}>
              See you there! 🎉
              <br />
              <br />
              The SceneScout Team
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

const imageContainer = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

const eventImage = {
  width: '100%',
  maxWidth: '500px',
  height: 'auto',
  borderRadius: '12px',
  objectFit: 'cover' as const,
};

const eventDetails = {
  backgroundColor: '#f7fafc',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
};

const eventTitle = {
  color: '#1a202c',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const detailRow = {
  display: 'flex',
  margin: '12px 0',
};

const detailLabel = {
  color: '#718096',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 12px 0 0',
  minWidth: '100px',
};

const detailValue = {
  color: '#1a202c',
  fontSize: '14px',
  margin: '0',
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

const tip = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0',
};

const footer = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '24px',
};
