'use client';

import { motion } from 'framer-motion';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, FileChartColumnIncreasing } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { Button } from '@/components/button/Button';

export default function HomePage() {
  const router = useRouter();
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="grow flex flex-col items-center justify-center text-center px-inset-lg py-16">
        <motion.h1
          className="text-display-lg font-extrabold mb-4 text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          SBOM<p className="text-primary-fg inline">Vert</p>
        </motion.h1>

        <motion.p
          className="text-body sm:text-heading opacity-80 max-w-2xl mb-10 text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {FEATURE_FLAGS.STATIC_MODE
            ? <>
                Analyze and translate SBOMs right in your browser.
              </>
            : 'Compare SBOMs and CVEs of the container images you use to bring clarity and eliminate false positives.'}
        </motion.p>

        {FEATURE_FLAGS.STATIC_MODE && (
          <motion.div
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Button size="lg" className="flex items-center gap-2" onClick={() => router.push('/compare/analyze')}>
              <FileChartColumnIncreasing size={20} /> SBOM Analysis
            </Button>
            <Button size="lg" variant="outline-solid" className="flex items-center gap-2" onClick={() => router.push('/translate')}>
              <ArrowLeftRight size={20} /> Translate SBOM
            </Button>
          </motion.div>
        )}
      </main>
    </>
  );
}
