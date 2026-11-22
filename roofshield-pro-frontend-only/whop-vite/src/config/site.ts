/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ROOFSHIELD PRO — central site configuration
 *
 * Every piece of business content, pricing and Whop wiring lives here so the
 * template can be re-skinned for another roofing company without touching
 * components. Plan IDs resolve from environment variables (see .env.example).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const brand = {
  name: "ROOFSHIELD PRO",
  shortName: "ROOFSHIELD",
  tagline: "Premium Roofing, Engineered to Last",
  city: "Austin",
  state: "Texas",
  phone: "(512) 555-0148",
  email: "hello@roofshield.pro",
  address: "11401 Century Oaks Terrace, Austin, TX 78758",
  hours: "Mon–Sat · 7:00 AM – 7:00 PM CT",
} as const;

export const nav = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
] as const;

export const hero = {
  image: "/images/hero.jpg",
  eyebrow: "Premium Roofing · Austin, Texas",
  line1: "PROTECTING",
  line2: "WHAT MATTERS.",
  line3: "ONE ROOF AT A TIME.",
  description:
    "Premium roofing solutions engineered to protect your property and give your family lasting peace of mind.",
  primaryCta: { label: "Explore Our Services", href: "#services" },
  secondaryCta: { label: "Request an Estimate", href: "#estimate" },
  backgroundWord: "ROOFING",
} as const;

export const about = {
  backgroundWord: "TRUST",
  heading1: "BUILT ON TRUST.",
  heading2: "BACKED BY QUALITY.",
  kicker: "About RoofShield Pro",
  paragraphs: [
    "RoofShield Pro is a premium residential and commercial roofing company serving Austin and the greater Central Texas region. We believe a roof is not a line item — it is the system that protects everything underneath it.",
    "Every project is run by certified installers, documented with photo reports, and priced transparently before work begins. No surprises, no pressure tactics — just straightforward workmanship backed by long-term material and labor warranties.",
    "From the first inspection to the final walkthrough, our customer-first approach means you always know what is happening on your roof, why it matters, and what it costs.",
  ],
  pillars: [
    {
      icon: "shield",
      title: "Workmanship First",
      text: "Certified crews, manufacturer-grade installation standards and a documented quality checklist on every roof.",
    },
    {
      icon: "file",
      title: "Transparent Pricing",
      text: "Itemized estimates before we start. The number we quote is the number you pay — guaranteed in writing.",
    },
    {
      icon: "users",
      title: "Customer-First Service",
      text: "A dedicated project lead, daily photo updates and a final walkthrough on every single job.",
    },
  ],
} as const;

/** All statistics are illustrative demo figures until verified by the business. */
export const stats = {
  disclaimer: "Illustrative demo figures — replace with verified company data.",
  items: [
    { value: 480, suffix: "+", label: "Projects Completed" },
    { value: 12, suffix: " yrs", label: "Years of Experience" },
    { value: 98, suffix: "%", label: "Customer Satisfaction" },
    { value: 6, suffix: "+", label: "Service Coverage Areas" },
  ],
} as const;

export type ServiceKey = "repair" | "replacement" | "inspection";

export const services: {
  key: ServiceKey;
  index: string;
  title: string;
  short: string;
  image: string;
  points: string[];
  detail: string;
}[] = [
  {
    key: "repair",
    index: "01",
    title: "Roof Repair",
    short: "Identify and repair roof leaks, storm damage, and roofing issues.",
    image: "/images/service-repair.jpg",
    detail:
      "From hail bruising to wind-lifted shingles, our repair crews diagnose the true source of the problem — not just the visible symptom. Every repair is documented with before-and-after photography and backed by a written workmanship warranty.",
    points: [
      "Leak detection & emergency patching",
      "Storm, hail & wind damage repair",
      "Flashing, vent & valley restoration",
      "Insurance claim documentation support",
    ],
  },
  {
    key: "replacement",
    index: "02",
    title: "Roof Replacement",
    short: "Complete roofing replacement with quality materials.",
    image: "/images/service-replacement.jpg",
    detail:
      "A full tear-off and re-roof with premium architectural shingles, standing-seam metal, or tile — installed to manufacturer specification so your warranty is never at risk. Most homes are completed in one to two days with full site protection and cleanup.",
    points: [
      "Architectural shingle, metal & tile systems",
      "Full tear-off, deck inspection & re-deck",
      "Manufacturer-certified installation",
      "Up to 30-year material & labor warranties",
    ],
  },
  {
    key: "inspection",
    index: "03",
    title: "Roof Inspection",
    short: "Professional roof condition assessments.",
    image: "/images/service-inspection.jpg",
    detail:
      "A 21-point condition assessment covering shingles, flashing, ventilation, decking and drainage — delivered as a photo-annotated digital report within 24 hours. Ideal before storm season, after hail events, or ahead of a home sale.",
    points: [
      "21-point photo-annotated report",
      "Storm & hail damage documentation",
      "Pre-purchase & insurance inspections",
      "Ventilation, drainage & flashing review",
    ],
  },
];

export const serviceArea = {
  backgroundWord: "TEXAS",
  kicker: "Service Area",
  heading1: "PROUDLY SERVING",
  heading2: "CENTRAL TEXAS.",
  note: "Demo service areas — confirm coverage with the business before publishing.",
  areas: [
    { name: "Austin", tag: "Headquarters" },
    { name: "Round Rock", tag: "North Metro" },
    { name: "Cedar Park", tag: "Northwest" },
    { name: "Georgetown", tag: "Williamson Co." },
    { name: "Pflugerville", tag: "Northeast" },
    { name: "Lakeway", tag: "Lake Travis" },
    { name: "Leander", tag: "183 Corridor" },
    { name: "San Marcos", tag: "I-35 South" },
  ],
} as const;

export const projects = {
  kicker: "Featured Projects",
  heading1: "ROOFS WE'RE",
  heading2: "PROUD TO SIGN.",
  disclaimer:
    "Illustrative demo projects shown for design purposes — replace with documented company work.",
  items: [
    {
      title: "Black Standing-Seam Re-Roof",
      location: "Westlake Hills, Austin",
      service: "Roof Replacement",
      material: "Matte black standing-seam metal",
      image: "/images/project-1.jpg",
      year: "2025",
      featured: true,
    },
    {
      title: "Estate Designer Shingle System",
      location: "Georgetown, TX",
      service: "Roof Replacement",
      material: "Slate-gray designer shingles",
      image: "/images/project-2.jpg",
      year: "2025",
      featured: false,
    },
    {
      title: "Hill Country Low-Slope Conversion",
      location: "Lakeway, TX",
      service: "Roof Replacement",
      material: "Dark bronze standing-seam",
      image: "/images/project-3.jpg",
      year: "2024",
      featured: false,
    },
    {
      title: "Commercial TPO Restoration",
      location: "Downtown Austin",
      service: "Commercial Roofing",
      material: "60-mil TPO membrane",
      image: "/images/project-4.jpg",
      year: "2024",
      featured: false,
    },
  ],
} as const;

/** Whop plan wiring. IDs come from env — never hardcode real IDs here. */
export type PlanKey = "inspection" | "deposit" | "gutter";

export const pricing: {
  key: PlanKey;
  name: string;
  price: number;
  priceLabel: string;
  blurb: string;
  features: string[];
  envVar: string;
  featured?: boolean;
  note?: string;
}[] = [
  {
    key: "inspection",
    name: "Roof Inspection",
    price: 149,
    priceLabel: "$149",
    blurb: "21-point photo-documented roof condition assessment with a written report.",
    features: [
      "21-point inspection checklist",
      "Photo-annotated digital report",
      "Storm & hail damage documentation",
      "Honest repair vs. replace guidance",
    ],
    envVar: "WHOP_PLAN_ID_INSPECTION",
  },
  {
    key: "deposit",
    name: "Roofing Project Deposit",
    price: 500,
    priceLabel: "$500",
    blurb: "Reserve your project slot. Credited in full toward your final invoice.",
    features: [
      "Locks your installation date",
      "Credited 100% toward the final balance",
      "Card saved securely for the final invoice",
      "Processed & stored by Whop — never by us",
    ],
    envVar: "WHOP_PLAN_ID_DEPOSIT",
    featured: true,
    note: "Card-on-file consent required",
  },
  {
    key: "gutter",
    name: "Gutter Cleaning",
    price: 299,
    priceLabel: "$299",
    blurb: "Full gutter and downspout cleaning with a roofline condition check.",
    features: [
      "Complete gutter & downspout flush",
      "Debris removal & site cleanup",
      "Roofline photo condition check",
      "Loose fastener & seam touch-up",
    ],
    envVar: "WHOP_PLAN_ID_GUTTER",
  },
];

export const financing = {
  kicker: "Financing",
  heading1: "QUALITY ROOFING.",
  heading2: "FLEXIBLE PAYMENT OPTIONS.",
  body: [
    "A roof shouldn't wait for the perfect budget month. At checkout, eligible customers may see additional payment methods and pay-over-time options — such as buy-now-pay-later providers — offered directly inside Whop's secure checkout.",
    "All payment methods and financing offers are subject to merchant approval and provider availability, and any financing application is decided solely by the provider. RoofShield Pro does not guarantee approval for any financing product.",
  ],
  points: [
    { title: "Pay over time", text: "BNPL options may appear at checkout for eligible customers, when available from the provider." },
    { title: "Deposit-first structure", text: "Secure your project with a deposit, pay the balance when the work is complete." },
    { title: "No hidden fees", text: "Itemized pricing in writing before any work begins — the quote is the price." },
  ],
} as const;

/** Clearly labeled illustrative testimonials until real reviews are provided. */
export const testimonials = {
  kicker: "Testimonials",
  heading1: "WORD OF MOUTH,",
  heading2: "WRITTEN DOWN.",
  disclaimer: "Illustrative testimonials — replace with verified customer reviews.",
  items: [
    {
      quote:
        "They found the leak two other companies missed, photographed everything, and had it repaired the same week. The most transparent contractor experience we've had.",
      name: "Sarah Mitchell",
      meta: "Homeowner · Cedar Park",
    },
    {
      quote:
        "A full re-roof done in two days, and the crew left the yard cleaner than they found it. The photo updates each afternoon were a fantastic touch.",
      name: "David Okafor",
      meta: "Homeowner · Round Rock",
    },
    {
      quote:
        "The inspection report was so thorough our insurance claim went through without a single follow-up question. Worth every penny.",
      name: "Elena Rodriguez",
      meta: "Homeowner · Georgetown",
    },
    {
      quote:
        "Professional from estimate to walkthrough. The itemized quote matched the final invoice to the dollar — that never happens.",
      name: "James Whitfield",
      meta: "Property Manager · Austin",
    },
  ],
} as const;

export const estimate = {
  kicker: "Request an Estimate",
  heading1: "LET'S TALK ABOUT",
  heading2: "YOUR ROOF.",
  body: "Tell us what your roof needs and a project lead will reach out within one business day with next steps — no pressure, no obligation.",
  serviceOptions: [
    { value: "roof-repair", label: "Roof Repair" },
    { value: "roof-replacement", label: "Roof Replacement" },
    { value: "roof-inspection", label: "Roof Inspection" },
  ],
} as const;

export const footer = {
  backgroundWord: "ROOFSHIELD",
  blurb:
    "Premium residential and commercial roofing for Austin and Central Texas — engineered to protect what matters most.",
  demoNote:
    "Demo website. Company details, statistics, projects and testimonials are illustrative placeholders pending business verification.",
} as const;

export const social = [
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
] as const;
