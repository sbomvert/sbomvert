'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Head from 'next/head';

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex-grow flex flex-col items-center justify-center text-center px-inset-lg py-16">
        <motion.h1
          className="text-display-lg font-extrabold mb-4 text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Weigh the Options <br className="hidden block" />
          <span className="text-primary mt-1 block">Clarify the Threats</span>
        </motion.h1>

        <motion.p
          className="text-body sm:text-heading opacity-80 max-w-2xl mb-10 text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Compare SBOMs of the container images you use to bring clarity and eliminate false
          positives.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <button
            className="px-6 py-3 text-body font-medium rounded-button
                       bg-input text-foreground
                       border border-border
                       hover:bg-border transition-all shadow"
          >
            Talk to us
          </button>

          <button
            onClick={() => router.push('/compare')}
            className="px-6 py-3 text-body font-medium rounded-button
                       bg-primary text-white
                       hover:bg-primary-hover transition-all shadow-button"
          >
            Try it! It&apos;s FOSS
          </button>
        </motion.div>
      </main>
    </>
  );
}
