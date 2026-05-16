import { FeaturesBento } from '@/components/landing/features-bento';
import { FinalCta } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingHeader } from '@/components/landing/landing-header';
import { Stats } from '@/components/landing/stats';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <FeaturesBento />
        <HowItWorks />
        <Stats />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
