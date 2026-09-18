import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import type { ReactNode } from "react";
import { brand, FONT_MONO, FONT_SANS } from "./brand";
import { LOGO_CID } from "./logo";
import { isProductionDeployment } from "@/lib/app-url";

/**
 * The one wrapper every outbound email goes through: wordmark header, a
 * white card, a muted footer. Individual messages (invitation.tsx,
 * credentials.tsx) only ever render what goes *inside* the card.
 */
export function EmailLayout({
  preview,
  kicker,
  children,
}: {
  /** Inbox preview-line text — seen before the email is opened. */
  preview: string;
  /** Small uppercase mono label above the headline, e.g. "INVITATION". */
  kicker: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        {/* Stops Gmail/Apple Mail's auto dark-mode from repainting a
            palette that's already been chosen deliberately (brand.ts). */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.page,
          margin: 0,
          padding: "32px 16px",
          fontFamily: FONT_SANS,
          WebkitTextSizeAdjust: "100%",
        }}
      >
        <Container style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
          {/* Every non-Production send carries this — a Preview deployment
              (dev included; Vercel has no separate "staging" env type) or a
              bare local `next dev`. Recipients on a real Store shouldn't
              ever see this; testers poking a Preview URL need the reminder
              that this isn't the real invitation/reset it looks like. */}
          {!isProductionDeployment() && (
            <Section
              style={{
                backgroundColor: brand.devBg,
                border: `1px solid ${brand.devBorder}`,
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: brand.devText,
                }}
              >
                TEST EMAIL — sent from{" "}
                {process.env.VERCEL_GIT_COMMIT_REF ?? "a local dev environment"}, not
                production.
              </Text>
            </Section>
          )}

          {/* wordmark — the real logo (public/logo/logo-lockup-light.svg),
              sent as an inline CID attachment (send.ts) and referenced
              here by Content-ID. See templates/logo.ts for the full why —
              short version: neither a fetched URL nor a data URI renders
              across major clients; a real MIME attachment does. */}
          <Section style={{ marginBottom: 20 }}>
            <Img
              src={`cid:${LOGO_CID}`}
              width={110}
              height={22}
              alt="SuSeeOS"
              style={{ display: "block" }}
            />
          </Section>

          {/* card */}
          <Section
            style={{
              backgroundColor: brand.card,
              border: `1px solid ${brand.hairline}`,
              borderRadius: 12,
              padding: "32px 28px",
            }}
          >
            <Text
              style={{
                margin: "0 0 8px",
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: brand.faint,
              }}
            >
              {kicker}
            </Text>
            {children}
          </Section>

          {/* footer */}
          <Section style={{ padding: "20px 4px 0" }}>
            <Text
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: "18px",
                color: brand.faint,
              }}
            >
              Automated message from SuSeeOS — reach us at{" "}
              <Link
                href="mailto:support@suseeos.com"
                style={{ color: brand.faint, textDecoration: "underline" }}
              >
                support@suseeos.com
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
