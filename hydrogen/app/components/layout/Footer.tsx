import { Link } from "react-router";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import logo from "@/assets/mls-logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FooterSettings, FooterColumn, FooterLink } from "~/root";

interface Props {
  settings: FooterSettings;
  columns: FooterColumn[];
}

export function Footer({ settings, columns }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-charcoal text-charcoal-foreground">
      <div className="container mx-auto px-4 py-12">

        {/* ── Desktop ─────────────────────────────────────────────── */}
        <div className="hidden gap-10 md:flex md:flex-wrap">
          <BrandCol settings={settings} />
          {columns.map((col) => (
            <NavCol key={col.id} heading={col.heading} links={col.links} />
          ))}
          <ContactCol settings={settings} />
        </div>

        {/* ── Mobile accordion ────────────────────────────────────── */}
        <div className="md:hidden">
          <BrandCol settings={settings} />
          <Accordion type="single" collapsible className="mt-6">
            {columns.map((col) => (
              <AccordionItem key={col.id} value={col.id} className="border-off-white/10">
                <AccordionTrigger className="font-display text-sm font-bold uppercase tracking-wider text-gold hover:no-underline">
                  {col.heading}
                </AccordionTrigger>
                <AccordionContent>
                  <LinkList links={col.links} />
                </AccordionContent>
              </AccordionItem>
            ))}
            <AccordionItem value="contact" className="border-off-white/10">
              <AccordionTrigger className="font-display text-sm font-bold uppercase tracking-wider text-gold hover:no-underline">
                {settings.contactHeading}
              </AccordionTrigger>
              <AccordionContent>
                <ContactList settings={settings} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="border-t border-off-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-off-white/60 sm:flex-row">
          <span>© {year} {settings.copyright}</span>
          <span>{settings.bottomTagline}</span>
        </div>
      </div>
    </footer>
  );
}

// ── Brand column ──────────────────────────────────────────────────────────────
function BrandCol({ settings }: { settings: FooterSettings }) {
  return (
    <div className="min-w-[200px] max-w-[240px] shrink-0">
      <div className="mb-4">
        <img
          src={logo}
          alt="Muscat Livestock Store"
          className="h-14 w-auto brightness-0 invert"
        />
      </div>
      {settings.brandText && (
        <p className="text-sm text-off-white/70">{settings.brandText}</p>
      )}
      <div className="mt-4 flex gap-3">
        {settings.instagramUrl && (
          <a href={settings.instagramUrl} aria-label="Instagram" className="hover:text-gold" target="_blank" rel="noopener noreferrer">
            <Instagram className="h-5 w-5" />
          </a>
        )}
        {settings.facebookUrl && (
          <a href={settings.facebookUrl} aria-label="Facebook" className="hover:text-gold" target="_blank" rel="noopener noreferrer">
            <Facebook className="h-5 w-5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Nav column ────────────────────────────────────────────────────────────────
function NavCol({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div className="min-w-[140px] flex-1">
      <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-gold">
        {heading}
      </h4>
      <LinkList links={links} />
    </div>
  );
}

// ── Contact column ────────────────────────────────────────────────────────────
function ContactCol({ settings }: { settings: FooterSettings }) {
  return (
    <div className="min-w-[180px] flex-1">
      <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-gold">
        {settings.contactHeading}
      </h4>
      <ContactList settings={settings} />
    </div>
  );
}

function ContactList({ settings }: { settings: FooterSettings }) {
  return (
    <ul className="space-y-3 text-sm text-off-white/80">
      {settings.address && (
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>{settings.address}</span>
        </li>
      )}
      {settings.phone && (
        <li className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-gold" />
          <a href={`tel:${settings.phone}`} className="hover:text-gold">{settings.phone}</a>
        </li>
      )}
      {settings.email && (
        <li className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-gold" />
          <a href={`mailto:${settings.email}`} className="hover:text-gold">{settings.email}</a>
        </li>
      )}
    </ul>
  );
}

// ── Link list ─────────────────────────────────────────────────────────────────
function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2 text-sm text-off-white/80">
      {links.map((l) => (
        <li key={l.label}>
          <Link to={l.url} className="hover:text-gold">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
