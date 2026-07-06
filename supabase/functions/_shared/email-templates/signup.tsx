/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Verify your email to get started with {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandSection}>
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Verify your email</Heading>
          <Text style={text}>
            Welcome to <strong>{siteName}</strong>! Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>) to activate your account.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>Verify Email Address</Button>
          </Section>
          <Text style={smallText}>If the button doesn't work, copy and paste this link:</Text>
          <Link href={confirmationUrl} style={fallbackLink}>{confirmationUrl}</Link>
        </Section>
        <Text style={footer}>If you didn't create an account, you can safely ignore this email.</Text>
        <Text style={footerBrand}>© {new Date().getFullYear()} <Link href={siteUrl} style={footerLink}>{siteName}</Link></Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }
const brandSection = { textAlign: 'center' as const, marginBottom: '24px' }
const brand = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0', letterSpacing: '-0.02em' }
const card = { background: '#f8f9fc', borderRadius: '12px', padding: '32px 28px' }
const h1 = { fontSize: '20px', fontWeight: 600 as const, color: '#1a1a2e', margin: '0 0 12px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const buttonWrap = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#ffffff', fontSize: '14px', fontWeight: 600 as const, borderRadius: '8px', padding: '12px 32px', textDecoration: 'none', display: 'inline-block' }
const smallText = { fontSize: '12px', color: '#9ca3af', margin: '0 0 8px', textAlign: 'center' as const }
const fallbackLink = { color: '#6366f1', fontSize: '12px', wordBreak: 'break-all' as const, textAlign: 'center' as const, display: 'block' }
const link = { color: '#6366f1', textDecoration: 'underline' }
const footer = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, margin: '24px 0 8px' }
const footerBrand = { fontSize: '11px', color: '#9ca3af', textAlign: 'center' as const, margin: '0' }
const footerLink = { color: '#6366f1', textDecoration: 'none' }
