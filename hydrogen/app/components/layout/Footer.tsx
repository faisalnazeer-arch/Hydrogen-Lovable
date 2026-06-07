import { Link } from "react-router";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import logo from "@/assets/mls-logo.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FooterSettings, FooterLink } from "~/root";

const DEFAULTS = {
  companyName:    "M L S FOODSTUFF TRADING LLC",
  address:        "Marasi Drive, Business Bay\nP.O.Box 93770\nDubai, United Arab Emirates",
  phone:          "+971504516403",
  email:          "contactus@mlsuae.ae",
  contactHeading: "Contact Us",
  copyright:      "MLS UAE. All rights reserved.",
};

interface ContactData {
  heading: string;
  address: string;
  phone: string;
  email: string;
  instagram?: string | null;
  facebook?: string | null;
  brandText?: string | null;
  copyright: string;
  bottomTagline?: string | null;
}

interface Props {
  settings: FooterSettings | null;
  menuCols: Array<{ heading: string; links: FooterLink[] }>;
}

export function Footer({ settings, menuCols }: Props) {
  const year = new Date().getFullYear();

  const contact: ContactData = {
    heading:       settings?.contactHeading || DEFAULTS.contactHeading,
    address:       settings?.address        || DEFAULTS.address,
    phone:         settings?.phone          || DEFAULTS.phone,
    email:         settings?.email          || DEFAULTS.email,
    instagram:     settings?.instagramUrl,
    facebook:      settings?.facebookUrl,
    brandText:     settings?.brandText,
    copyright:     settings?.copyright      || DEFAULTS.copyright,
    bottomTagline: settings?.bottomTagline,
  };

  return (
    <footer className="mt-16 bg-charcoal text-charcoal-foreground">
      <div className="container mx-auto px-4 py-12">

        {/* ── Desktop ─────────────────────────────────────────────── */}
        <div className="hidden gap-10 md:flex md:flex-wrap">
          <BrandCol contact={contact} />
          {menuCols.map((col) => (
            <NavCol key={col.heading} heading={col.heading} links={col.links} />
          ))}
          <ContactCol contact={contact} />
        </div>

        {/* ── Mobile accordion ────────────────────────────────────── */}
        <div className="md:hidden">
          <BrandCol contact={contact} />
          <Accordion type="single" collapsible className="mt-6">
            {menuCols.map((col) => (
              <AccordionItem key={col.heading} value={col.heading} className="border-off-white/10">
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
                {contact.heading}
              </AccordionTrigger>
              <AccordionContent>
                <ContactList contact={contact} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="border-t border-off-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-off-white/60 sm:flex-row">
          <span>© {year} {contact.copyright}</span>
          {contact.bottomTagline && <span>{contact.bottomTagline}</span>}
        </div>
      </div>
    </footer>
  );
}

function BrandCol({ contact }: { contact: ContactData }) {
  return (
    <div className="min-w-[240px] max-w-[320px] flex-1">
      <div className="mb-3">
        <img src={logo} alt="MLS UAE" className="h-14 w-auto brightness-0 invert" />
      </div>
      <p className="text-sm font-semibold text-gold">{DEFAULTS.companyName}</p>
      {contact.brandText && (
        <p className="mt-1 text-sm text-off-white/70">{contact.brandText}</p>
      )}
      <div className="mt-4 flex gap-3">
        {contact.instagram && (
          <a href={contact.instagram} aria-label="Instagram" className="text-off-white/70 hover:text-gold" target="_blank" rel="noopener noreferrer">
            <Instagram className="h-5 w-5" />
          </a>
        )}
        {contact.facebook && (
          <a href={contact.facebook} aria-label="Facebook" className="text-off-white/70 hover:text-gold" target="_blank" rel="noopener noreferrer">
            <Facebook className="h-5 w-5" />
          </a>
        )}
      </div>
    </div>
  );
}

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

function ContactCol({ contact }: { contact: ContactData }) {
  return (
    <div className="min-w-[200px] flex-1">
      <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-gold">
        {contact.heading}
      </h4>
      <ContactList contact={contact} />
    </div>
  );
}

function ContactList({ contact }: { contact: ContactData }) {
  return (
    <ul className="space-y-2.5 text-sm text-off-white/80">
      {contact.address && (
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span className="whitespace-pre-line">{contact.address}</span>
        </li>
      )}
      {contact.phone && (
        <li className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-gold" />
          <a
            href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
            className="hover:text-gold"
            target="_blank"
            rel="noopener noreferrer"
          >
            {contact.phone}
          </a>
        </li>
      )}
      {contact.email && (
        <li className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-gold" />
          <a href={`mailto:${contact.email}`} className="hover:text-gold">
            {contact.email}
          </a>
        </li>
      )}
    </ul>
  );
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2.5 text-sm text-off-white/80">
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
