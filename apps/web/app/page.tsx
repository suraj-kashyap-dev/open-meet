import { cookies } from 'next/headers';

import { FeaturesBento } from '@/components/client/landing/features-bento';
import { FinalCta } from '@/components/client/landing/final-cta';
import { Footer } from '@/components/client/landing/footer';
import { Hero } from '@/components/client/landing/hero';
import { HowItWorks } from '@/components/client/landing/how-it-works';
import { LandingHeader } from '@/components/client/landing/landing-header';
import { Stats } from '@/components/client/landing/stats';
import { ScrollToTop } from '@/components/shared/scroll-to-top';

async function readHasSession(): Promise<boolean> {
  const store = await cookies();

  return store.has('access_token');
}

export default async function LandingPage() {
  const hasSession = await readHasSession();

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader initialSession={hasSession} />

      <main className="flex-1">
        <Hero />

        <FeaturesBento />
        
        <HowItWorks />
        
        <Stats />
        
        <FinalCta />
      </main>
      
      <Footer />
      
      <ScrollToTop />
    </div>
  );
}
