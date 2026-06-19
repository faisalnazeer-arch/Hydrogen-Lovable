import { Link } from "react-router";
import { Facebook, Instagram, Linkedin, Mail, Phone, Twitter } from "lucide-react";
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
  twitter?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
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
    twitter:       settings?.twitterUrl,
    tiktok:        settings?.tiktokUrl,
    whatsapp:      settings?.whatsappUrl,
    linkedin:      settings?.linkedinUrl,
    brandText:     settings?.brandText,
    copyright:     settings?.copyright      || DEFAULTS.copyright,
    bottomTagline: settings?.bottomTagline,
  };

  return (
    <footer className="bg-charcoal text-charcoal-foreground">
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
      <div className="mt-4 flex flex-wrap gap-3">
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
        {contact.whatsapp && (
          <a href={contact.whatsapp} aria-label="WhatsApp" className="text-off-white/70 hover:text-gold" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-5 w-5" />
          </a>
        )}
        {contact.linkedin && (
          <a href={contact.linkedin} aria-label="LinkedIn" className="text-off-white/70 hover:text-gold" target="_blank" rel="noopener noreferrer">
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        {contact.twitter && (
          <a href={contact.twitter} aria-label="Twitter / X" className="text-off-white/70 hover:text-gold" target="_blank" rel="noopener noreferrer">
            <Twitter className="h-5 w-5" />
          </a>
        )}
        {contact.tiktok && (
          <a href={contact.tiktok} aria-label="TikTok" className="text-off-white/70 hover:text-gold" target="_blank" rel="noopener noreferrer">
            <TikTokIcon className="h-5 w-5" />
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  );
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2.5 text-sm text-off-white/80">
      {links.map((l) => (
        <li key={l.label}>
          {l.url.startsWith("http") ? (
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
              {l.label}
            </a>
          ) : (
            <Link to={l.url} className="hover:text-gold">
              {l.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
