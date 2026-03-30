'use client';

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export const BackButton: React.FC = () => {
      const router = useRouter();
      return(
      <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>)
}