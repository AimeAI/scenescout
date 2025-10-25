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

interface BetaInviteEmailProps {
  inviteCode: string;
  recipientName?: string;
}

export default function BetaInviteEmail({
  inviteCode,
  recipientName = 'there',
}: BetaInviteEmailProps) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/beta-access?code=${inviteCode}`;

  return (
    <Html>
      <Head />
      <Preview>You've been invited to SceneScout Beta!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>SceneScout</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>Welcome to SceneScout Beta!</Heading>

            <Text style={text}>
              Hey {recipientName},
            </Text>

            <Text style={text}>
              We're excited to invite you to join SceneScout's exclusive beta! You're one of the first to experience the future of event discovery.
            </Text>

            <Section style={codeBox}>
              <Text style={codeLabel}>Your Invite Code:</Text>
              <Text style={code}>{inviteCode}</Text>
            </Section>

            <Button style={button} href={inviteUrl}>
              Activate Your Access
            </Button>

            <Text style={text}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={link}>{inviteUrl}</Text>

            <Text style={text}>
              This invite code is unique to you and can only be used once. Don't share it with others!
            </Text>

            <Text style={footer}>
              Questions? Reply to this email and we'll be happy to help.
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
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '0 48px',
};

const h2 = {
  color: '#1a202c',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
};

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const codeBox = {
  backgroundColor: '#f7fafc',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
  border: '2px dashed #cbd5e0',
};

const codeLabel = {
  color: '#718096',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const code = {
  color: '#1a202c',
  fontSize: '32px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  letterSpacing: '2px',
  margin: '8px 0 0 0',
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

const link = {
  color: '#667eea',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  margin: '8px 0 24px 0',
};

const footer = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '24px',
};
