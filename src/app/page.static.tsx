'use client';

import { motion } from 'framer-motion';
import Head from 'next/head';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

export default function HomePage() {
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
                <span className="block mt-2 text-body-sm">PS: they never leave your browser</span>
              </>
            : 'Compare SBOMs and CVEs of the container images you use to bring clarity and eliminate false positives.'}
        </motion.p>
      </main>
    </>
  );
}
