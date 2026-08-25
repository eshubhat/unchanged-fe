import { Link } from "react-router-dom";
import { useEffect } from "react";

const LAST_UPDATED = "August 2026";
const BRAND_NAME = "The Unchanged Studios";
const BRAND_EMAIL = "contact@theunchangedstudios.com";
const BRAND_WEBSITE = "https://theunchangedstudios.com";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-32 px-6 md:px-12 font-sans text-stone-900">
      <div className="max-w-3xl mx-auto flex flex-col gap-16">

        {/* Header */}
        <div className="flex flex-col gap-6">
          <Link
            to="/"
            className="text-stone-500 hover:text-stone-900 text-sm font-medium uppercase tracking-wider transition-colors self-start"
          >
            &larr; Back to Home
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-serif font-medium uppercase tracking-tight text-stone-900">
              Privacy Policy
            </h1>
            <p className="text-stone-500 text-sm uppercase tracking-widest">
              Last updated — {LAST_UPDATED}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-16 text-stone-700 leading-relaxed text-[15px]">

          {/* Intro */}
          <Section>
            <p>
              At {BRAND_NAME}, we build our garments to last — and we treat your personal information with the same care. This policy explains what we collect when you shop with us, why we need it, and how it's handled. We'll never sell your data or use it in ways that would make you uncomfortable.
            </p>
            <p>
              By placing an order or browsing{" "}
              <a
                href={BRAND_WEBSITE}
                className="underline hover:text-stone-900 transition-colors font-medium"
              >
                theunchangedstudios.com
              </a>
              , you agree to the terms described below.
            </p>
          </Section>

          <Divider />

          {/* 1. What we collect */}
          <Section title="1. What We Collect">
            <p>We collect only what we need to process your order and improve your experience.</p>
            
            <div className="flex flex-col gap-8 mt-2">
              <div className="flex flex-col gap-3">
                <SubHeading>When you place an order</SubHeading>
                <BulletList items={[
                  "Your name, email address, phone number, and delivery address",
                  "Payment details — processed and encrypted by Razorpay; we never see or store your full card number",
                  "Order details (items, size, quantity, and value)",
                ]} />
              </div>

              <div className="flex flex-col gap-3">
                <SubHeading>When you browse our site</SubHeading>
                <BulletList items={[
                  "Basic device information and browser type (via standard server logs)",
                  "Pages visited and time spent — aggregated anonymously to help us understand what you're looking for",
                  "Cookies that keep your cart intact between sessions (see Section 6)",
                ]} />
              </div>

              <div className="flex flex-col gap-3">
                <SubHeading>When you contact us</SubHeading>
                <BulletList items={[
                  "Whatever you share with us via email or WhatsApp — we keep this only to resolve your query",
                ]} />
              </div>
            </div>
          </Section>

          <Divider />

          {/* 2. How we use it */}
          <Section title="2. How We Use Your Information">
            <BulletList items={[
              "To fulfil and dispatch your order",
              "To send you order confirmations, tracking updates, and delivery notifications",
              "To process refunds or handle return requests",
              "To respond to your questions or concerns",
              "To occasionally send you updates on new releases — only if you've opted in (you can unsubscribe at any time)",
              "To detect and prevent fraudulent transactions",
            ]} />
          </Section>

          <Divider />

          {/* 3. Payment & Razorpay */}
          <Section title="3. Payments & Razorpay">
            <p>
              All payments on our site are processed by{" "}
              <strong className="text-stone-900 font-semibold">Razorpay Software Private Limited</strong>, a PCI-DSS compliant payment gateway. When you enter your card, UPI, or net banking details, that information goes directly to Razorpay — it never passes through our servers.
            </p>
            <p>
              We receive only a transaction confirmation and an anonymised payment ID. You can review Razorpay's own privacy policy at{" "}
              <a
                href="https://razorpay.com/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-stone-900 transition-colors font-medium"
              >
                razorpay.com/privacy
              </a>
              .
            </p>
          </Section>

          <Divider />

          {/* 4. Who we share data with */}
          <Section title="4. Who We Share Your Data With">
            <p>
              We don't sell or rent your data. Period. We share the minimum necessary information with the following third parties solely to operate our business:
            </p>
            
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-stone-200">
                    <th className="text-left py-4 pr-6 font-bold text-stone-900 uppercase tracking-wider text-xs">Party</th>
                    <th className="text-left py-4 font-bold text-stone-900 uppercase tracking-wider text-xs">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-stone-600">
                  <TableRow party="Razorpay" purpose="Payment processing and fraud prevention" />
                  <TableRow party="Shipping partner / courier" purpose="Delivering your order to the address you provide" />
                  <TableRow party="Google Analytics (optional)" purpose="Anonymised site analytics — no personal data" />
                </tbody>
              </table>
            </div>

            <p>
              We may disclose your information if required by law or a court order. Outside of that, your data stays within {BRAND_NAME}.
            </p>
          </Section>

          <Divider />

          {/* 5. Data retention */}
          <Section title="5. How Long We Keep Your Data">
            <p>
              We retain order records for <strong className="text-stone-900 font-semibold">7 years</strong> to comply with Indian accounting and tax regulations (GST requirements). After this period, your records are permanently deleted from our systems.
            </p>
            <p>
              If you've subscribed to our newsletter, we keep your email until you unsubscribe. Support conversations are retained for up to 12 months after resolution.
            </p>
          </Section>

          <Divider />

          {/* 6. Cookies */}
          <Section title="6. Cookies">
            <p>
              We use a small number of cookies — nothing tracking you across the internet, just what's needed for the site to work properly:
            </p>
            
            <div className="my-2">
              <BulletList items={[
                "Session cookies to keep you logged in while you browse",
                "Cart cookies so your items don't disappear between pages",
                "Authentication tokens so you don't have to sign in every time",
              ]} />
            </div>

            <p>
              You can disable cookies in your browser settings, though this may affect how the site functions (your cart may not persist, for example).
            </p>
          </Section>

          <Divider />

          {/* 7. Your rights */}
          <Section title="7. Your Rights">
            <p>You have the right to:</p>
            
            <div className="my-2">
              <BulletList items={[
                "Access the personal data we hold about you",
                "Request a correction if something is inaccurate",
                "Ask us to delete your data (where we're not legally required to retain it)",
                "Withdraw consent for marketing communications at any time",
              ]} />
            </div>

            <p>
              To exercise any of these, email us at{" "}
              <a
                href={`mailto:${BRAND_EMAIL}`}
                className="underline hover:text-stone-900 transition-colors font-medium"
              >
                {BRAND_EMAIL}
              </a>
              . We'll respond within 7 business days.
            </p>
          </Section>

          <Divider />

          {/* 8. Security */}
          <Section title="8. Security">
            <p>
              Our site runs on HTTPS. Payment data is handled entirely by Razorpay under PCI-DSS Level 1 compliance. We apply standard security practices on our backend and do not store sensitive financial information. That said, no system is completely immune — if you ever notice suspicious activity on your account, contact us immediately.
            </p>
          </Section>

          <Divider />

          {/* 9. Children */}
          <Section title="9. Children's Privacy">
            <p>
              Our site is not directed at anyone under the age of 18. We do not knowingly collect personal information from minors. If you believe a child has submitted data through our site, please contact us and we will remove it promptly.
            </p>
          </Section>

          <Divider />

          {/* 10. Changes */}
          <Section title="10. Changes to This Policy">
            <p>
              We may update this policy from time to time — for example, if we add a new payment method or a new courier. The revised version will always be accessible at this URL, and the "Last updated" date at the top will reflect when it changed. Significant changes will be communicated via email if you have an account with us.
            </p>
          </Section>

          <Divider />

          {/* 11. Contact */}
          <Section title="11. Get in Touch">
            <p>
              If you have any questions about this policy or how your data is handled, we're a small team and genuinely happy to help:
            </p>
            <div className="mt-4 border-l-2 border-stone-300 pl-6 py-2 flex flex-col gap-2 text-stone-600 bg-stone-100/50 rounded-r-lg">
              <p className="font-bold text-stone-900 tracking-wide uppercase text-xs">{BRAND_NAME}</p>
              <p>
                Email:{" "}
                <a
                  href={`mailto:${BRAND_EMAIL}`}
                  className="hover:text-stone-900 transition-colors font-medium"
                >
                  {BRAND_EMAIL}
                </a>
              </p>
              <p>Instagram: <a href="https://instagram.com/theunchangedstudios" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors font-medium">@theunchangedstudios</a></p>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

// ── Internal layout helpers ──────────────────────────────────────────────────

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      {title && (
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-stone-900 mb-2">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-stone-900 text-[13px] uppercase tracking-wider">
      {children}
    </h3>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 items-start leading-relaxed">
          <span className="mt-[9px] w-[5px] h-[5px] rounded-full bg-stone-400 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TableRow({ party, purpose }: { party: string; purpose: string }) {
  return (
    <tr className="border-b border-stone-100 hover:bg-stone-100/30 transition-colors">
      <td className="py-4 pr-6 text-stone-900 font-medium">{party}</td>
      <td className="py-4 leading-relaxed">{purpose}</td>
    </tr>
  );
}

function Divider() {
  return <hr className="border-stone-200/60" />;
}
