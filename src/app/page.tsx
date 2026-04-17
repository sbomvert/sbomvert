'use client';

import { motion } from 'framer-motion';
import Head from 'next/head';

export default function HomePage() {

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
          SBOM<p className="text-primary inline">Vert</p>
        </motion.h1>

        <motion.p
          className="text-body sm:text-heading opacity-80 max-w-2xl mb-10 text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Compare SBOMs and CVEs of the container images you use to bring clarity and eliminate false
          positives.
        </motion.p> 
      </main>
    </>
  );
}
