'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { useState } from 'react';
import { ContactModal } from './compare/components/ContactModal';
import Head from 'next/head';

export default function HomePage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 py-16">
        <motion.h1
          className="text-5xl sm:text-6xl font-extrabold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Weigh the Options <br className="hidden block" />
          <span className="text-primary mt-1 block">Clarify the Threats</span>
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl opacity-80 max-w-2xl mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Compare SBOMs of the container images you use to bring clairity and eliminate false
          positives.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {/* Neutral button */}
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 text-lg font-medium rounded-xl 
                       bg-input text-foreground 
                       border border-border
                       hover:bg-ring/20 transition-all shadow"
          >
            Talk to an expert
          </button>

          {/* Primary button */}
          <button
            onClick={() => router.push('/compare')}
            className="px-6 py-3 text-lg font-medium rounded-xl 
                       bg-primary text-white 
                       hover:opacity-90 transition-all shadow-lg"
          >
            Get started free
          </button>
        </motion.div>
      </main>
    </>
  );
}
