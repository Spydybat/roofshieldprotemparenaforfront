import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "@/styles/globals.css?url";

const pixelSrc = import.meta.env.VITE_WHOP_PIXEL_SRC as string | undefined;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RoofShield Pro — Premium Roofing in Austin, Texas" },
      {
        name: "description",
        content:
          "Premium residential and commercial roofing in Austin, TX. Roof repair, replacement and inspection with transparent pricing and long-term protection.",
      },
      { property: "og:title", content: "RoofShield Pro — Premium Roofing in Austin, Texas" },
      {
        property: "og:description",
        content:
          "Premium roofing solutions engineered to protect your property and give your family lasting peace of mind.",
      },
      { property: "og:image", content: "/images/hero.jpg" },
      { name: "theme-color", content: "#080808" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: pixelSrc ? [{ src: pixelSrc, async: true }] : [],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-paper text-ink antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
