import type { MetaFunction, ActionFunctionArgs } from "@shopify/remix-oxygen";
import { Form, useActionData, useNavigation } from "react-router";
import { MapPin, Phone, Mail, Clock, MessageCircle, CheckCircle2 } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "Contact Us — MLS UAE" },
  { name: "description", content: "Get in touch with MLS UAE. Call, WhatsApp, or email us — we're here 9 AM to 9 PM daily." },
];

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const name    = String(form.get("name")    ?? "").trim();
  const email   = String(form.get("email")   ?? "").trim();
  const phone   = String(form.get("phone")   ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  // In production: send to email service / Shopify flow / etc.
  // For now we return success so the UI confirms submission.
  return { ok: true };
}

const INFO = [
  {
    icon: Phone,
    label: "Call or WhatsApp",
    value: "+971 50 451 6403",
    href: "tel:+971504516403",
  },
  {
    icon: Mail,
    label: "Email",
    value: "contactus@mlsuae.ae",
    href: "mailto:contactus@mlsuae.ae",
  },
  {
    icon: Clock,
    label: "Support Hours",
    value: "9 AM – 9 PM daily",
    href: null,
  },
  {
    icon: MapPin,
    label: "Delivery Areas",
    value: "Dubai, Abu Dhabi, Sharjah, Ajman & more",
    href: null,
  },
];

export default function ContactPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <div className="bg-crimson py-12 text-center text-crimson-foreground">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson-foreground/70">
          We're here to help
        </p>
        <h1 className="font-display text-3xl font-extrabold md:text-4xl">Contact Us</h1>
        <p className="mt-2 text-sm text-crimson-foreground/80">
          Premium meat, premium service — reach us anytime.
        </p>
      </div>

      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:gap-16">
        {/* Contact info */}
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="font-display text-xl font-bold">Get in Touch</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Whether you have a question about an order, need help choosing a cut, or want to give feedback — we'd love to hear from you.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {INFO.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crimson/10 text-crimson">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  {href ? (
                    <a href={href} className="mt-0.5 text-sm font-medium text-foreground hover:text-crimson transition-colors">
                      {value}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/971504516403"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" />
            Chat on WhatsApp
          </a>
        </div>

        {/* Contact form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {actionData?.ok ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <h3 className="font-display text-xl font-bold">Message Sent!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for reaching out. We'll get back to you within a few hours.
              </p>
            </div>
          ) : (
            <>
              <h2 className="mb-5 font-display text-xl font-bold">Send a Message</h2>
              {actionData?.error && (
                <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {actionData.error}
                </div>
              )}
              <Form method="post" className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Name <span className="text-crimson">*</span>
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="Your name"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      placeholder="+971 50 000 0000"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-crimson"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Email <span className="text-crimson">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-crimson"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Message <span className="text-crimson">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    placeholder="How can we help you?"
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-crimson"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 rounded-lg bg-crimson py-3 text-sm font-bold uppercase tracking-wide text-crimson-foreground transition-colors hover:bg-rich-red disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send Message"}
                </button>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
