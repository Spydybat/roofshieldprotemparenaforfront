import Nav from "@/components/chrome/Nav";
import Footer from "@/components/chrome/Footer";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import About from "@/components/sections/About";
import Stats from "@/components/sections/Stats";
import Services from "@/components/sections/Services";
import ServiceArea from "@/components/sections/ServiceArea";
import Projects from "@/components/sections/Projects";
import Pricing from "@/components/sections/Pricing";
import Financing from "@/components/sections/Financing";
import Testimonials from "@/components/sections/Testimonials";
import EstimateForm from "@/components/sections/EstimateForm";
import CheckoutProvider from "@/components/checkout/CheckoutProvider";

export default function HomeExperience() {
  return (
    <CheckoutProvider>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Stats />
        <Services />
        <ServiceArea />
        <Projects />
        <Pricing />
        <Financing />
        <Testimonials />
        <EstimateForm />
      </main>
      <Footer />
    </CheckoutProvider>
  );
}
