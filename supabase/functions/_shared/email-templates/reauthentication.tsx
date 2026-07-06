/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps { siteName?: string; token: string }

export const ReauthenticationEmail = ({ siteName = 'Dynime', token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandSection}><Heading style={brand}>{siteName}</Heading></Section>
        <Section style={card}>
          <Heading style={h1}>Confirm your identity</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={smallText}>This code expires shortly. If you didn't request this, you can safely ignore this email.</Text>
        </Section>
        <Text style={footerBrand}>© {new Date().getFullYear()} {siteName}</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brandSection = { textAlign: 'center' as const, marginBottom: '24px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0' }
const card = { background: '#f8f9fc', borderRadius: '12px', padding: '32px 28px', textAlign: 'center' as const }
const h1 = { fontSize: '20px', fontWeight: 600 as const, color: '#1a1a2e', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '32px', fontWeight: 'bold' as const, color: '#6366f1', letterSpacing: '0.2em', margin: '0 0 20px' }
const smallText = { fontSize: '12px', color: '#9ca3af', margin: '0' }
const footerBrand = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, margin: '24px 0 0' }
