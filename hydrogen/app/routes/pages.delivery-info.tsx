import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData } from "react-router";
import { useState } from "react";
import { Clock, Truck, MapPin, CheckCircle2, Package } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "Delivery Info — MLS UAE" },
  { name: "description", content: "Same-day delivery across Dubai, Abu Dhabi, Sharjah and Ajman. 2-hour express delivery available." },
];

const PAGE_QUERY = `#graphql
  query { page(handle: "delivery-info") { title body } }
` as const;

export async function loader({ context }: LoaderFunctionArgs) {
  const { page } = await context.storefront.query(PAGE_QUERY);
  return { pageBody: page?.body ?? "" };
}

// ── City data ─────────────────────────────────────────────────────────────────

const CITIES = [
  {
    id: "dubai",
    label: "Dubai",
    emoji: "🏙️",
    cutoff: "8:30 PM",
    window: "2 hours",
    hours: "10 AM – 8:30 PM, all days",
    fee: "AED 15",
    notes: [
      "Express 2-hour delivery across all Dubai areas",
      "Order anytime up to 8:30 PM for same-day delivery",
      "No minimum order value",
      "Deliveries continue until 10:30 PM",
    ],
  },
  {
    id: "abudhabi",
    label: "Abu Dhabi",
    emoji: "🌴",
    cutoff: "8:30 PM",
    window: "2 hours",
    hours: "10 AM – 8:30 PM, all days",
    fee: "AED 20",
    notes: [
      "Express 2-hour delivery across Abu Dhabi",
      "Order anytime up to 8:30 PM for same-day delivery",
      "No minimum order value",
      "Deliveries continue until 10:30 PM",
    ],
  },
  {
    id: "sharjah",
    label: "Sharjah & Ajman",
    emoji: "🏡",
    cutoff: "1:00 PM",
    window: "Same day",
    hours: "Confirm before 1:00 PM",
    fee: "AED 15",
    notes: [
      "Same-day delivery when ordered before 1:00 PM",
      "No minimum order value",
      "Order after 1:00 PM = next-day delivery",
      "Delivery across Sharjah and Ajman areas",
    ],
  },
];

const FAQS = [
  {
    q: "Is there a minimum order?",
    a: "No minimum order value. Our standard delivery fee is AED 15. Free delivery on orders above AED 350.",
  },
  {
    q: "Do I need to tip my driver?",
    a: "There's no need to tip — we pay our delivery team a living wage that doesn't depend on tips.",
  },
  {
    q: "How is my meat packaged?",
    a: "All orders are packed in insulated boxes using sustainable MULTIVAC packaging to maintain freshness during transit.",
  },
  {
    q: "What if I'm not home?",
    a: "Our drivers will attempt to call you. You can leave delivery instructions in your order notes or reschedule.",
  },
  {
    q: "Can I track my order?",
    a: "Yes — you'll receive an SMS with real-time tracking once your order is out for delivery.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="font-display text-sm font-semibold">{q}</span>
        <span className={`text-lg font-light text-muted-foreground transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? "200px" : "0" }}>
        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </div>
    </div>
  );
}

export default function DeliveryInfoPage() {
  const { pageBody } = useLoaderData<typeof loader>();
  const [activeCity, setActiveCity] = useState("dubai");
  const city = CITIES.find((c) => c.id === activeCity) ?? CITIES[0];

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="bg-charcoal py-6 text-center text-white md:py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Truck className="h-5 w-5 text-crimson" />
            <h1 className="font-display text-xl font-extrabold md:text-2xl">Delivery Info</h1>
          </div>
          <p className="text-sm text-white/60">
            Same-day delivery across the UAE. Fresh, chilled, and on time.
          </p>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-b border-border">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-6 px-4 py-4">
          {[
            { icon: Clock, text: "2-hour express delivery" },
            { icon: Package, text: "Insulated cold-chain packaging" },
            { icon: MapPin, text: "Dubai, Abu Dhabi & Sharjah/Ajman" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4 text-crimson" />
              {text}
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14">

        {/* City tabs */}
        <div className="mb-8 flex justify-center overflow-x-auto">
          <div className="flex min-w-max gap-1 rounded-xl border border-border p-1">
            {CITIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setActiveCity(c.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  activeCity === c.id
                    ? "bg-crimson text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* City card */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-crimson/10 text-2xl">{city.emoji}</div>
            <div>
              <h2 className="font-display text-xl font-extrabold">{city.label}</h2>
              <p className="text-sm text-muted-foreground">Delivery zone</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: "Window", value: city.window },
              { label: "Order by", value: city.cutoff },
              { label: "Delivery fee", value: city.fee },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-base font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-2.5">
            {city.notes.map((note) => (
              <li key={note} className="flex items-start gap-2.5 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                {note}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl border border-crimson/20 bg-crimson/5 px-4 py-3">
            <p className="text-sm font-semibold text-crimson">Operating hours</p>
            <p className="text-sm text-muted-foreground">{city.hours}</p>
          </div>
        </div>

        {/* FAQs */}
        <div className="mx-auto mt-12 max-w-2xl">
          <h2 className="mb-6 text-center font-display text-xl font-extrabold md:text-2xl">Delivery FAQs</h2>
          <div className="space-y-3">
            {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
