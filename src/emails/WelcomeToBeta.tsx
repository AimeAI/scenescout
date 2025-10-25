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

interface WelcomeToBetaEmailProps {
  userName: string;
  userEmail: string;
}

export default function WelcomeToBetaEmail({
  userName,
  userEmail,
}: WelcomeToBetaEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scenescout.app';

  return (
    <Html>
      <Head />
      <Preview>Welcome to SceneScout - Let's get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🎉 Welcome to SceneScout!</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hi {userName},
            </Text>

            <Text style={text}>
              You're officially part of the SceneScout beta! We're thrilled to have you on board.
            </Text>

            <Heading style={h3}>What You Can Do:</Heading>

            <Section style={featureBox}>
              <Text style={featureTitle}>🔍 Discover Events</Text>
              <Text style={featureText}>
                Browse thousands of curated events tailored to your interests
              </Text>
            </Section>

            <Section style={featureBox}>
              <Text style={featureTitle}>📍 Near Me</Text>
              <Text style={featureText}>
                Find what's happening around you with real-time location
              </Text>
            </Section>

            <Section style={featureBox}>
              <Text style={featureTitle}>❤️ Save & Plan</Text>
              <Text style={featureText}>
                Build your perfect day with saved events and custom plans
              </Text>
            </Section>

            <Section style={featureBox}>
              <Text style={featureTitle}>🔔 Smart Reminders</Text>
              <Text style={featureText}>
                Never miss an event with personalized notifications
              </Text>
            </Section>

            <Button style={button} href={appUrl}>
              Start Exploring
            </Button>

            <Text style={text}>
              As a beta member, your feedback is incredibly valuable. We'd love to hear what you think!
            </Text>

            <Button style={secondaryButton} href={`${appUrl}/feedback`}>
              Share Feedback
            </Button>

            <Text style={footer}>
              Need help? Just reply to this email. We're here for you!
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

const h3 = {
  color: '#1a202c',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '32px 0 16px',
};

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const featureBox = {
  padding: '16px',
  margin: '12px 0',
  borderLeft: '3px solid #667eea',
  backgroundColor: '#f7fafc',
};

const featureTitle = {
  color: '#1a202c',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
};

const featureText = {
  color: '#4a5568',
  fontSize: '14px',
  lineHeight: '22px',
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

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #667eea',
  borderRadius: '8px',
  color: '#667eea',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '16px 0 32px 0',
};

const footer = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '24px',
};
