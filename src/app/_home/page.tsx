'use client';
import { useState, useEffect, useRef } from 'react';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';
import { SearchBar } from '@/components/searchbar/SearchBar';
import { SubjectMetadata } from '@/services/artifactStorageService/artifactStorageService.types';
import { Button } from '@/components/button/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SubjectAction, SubjectGrid } from '@/components/hoc/SubjectCard/SubjectCard';

// ─── Data fetching ─────────────────────────────────────────────────────────────

interface SubjectPage {
  subjects: SubjectMetadata[];
  totalPages: number;
  totalItems: number;
}

async function fetchSubjects(page: number, search: string): Promise<SubjectPage> {
  const params = new URLSearchParams({
    page: String(page),
    ...(search ? { search } : {}),
  });

  try {
    const res = await fetch(`/api/subjects?${params}`);
    if (!res.ok) return { subjects: [], totalPages: 1, totalItems: 0 };
    const { subjects, pagination } = await res.json();
    return {
      subjects: subjects as SubjectMetadata[],
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
    };
  } catch {
    return { subjects: [], totalPages: 1, totalItems: 0 };
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-700/50">
      <p className="text-xs text-gray-400 tabular-nums">
        {totalItems} subject{totalItems !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant={currentPage <= 1 ? 'secondary' : 'primary'}
          size="sm"
          withHover={false}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={15} />
          Prev
        </Button>
        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums px-1">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant={currentPage >= totalPages ? 'secondary' : 'primary'}
          size="sm"
          withHover={false}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const setSelectedImage = useArtifactStore((s) => s.setSelectedImage);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState<SubjectMetadata[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Debounced search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchSubjects(currentPage, searchTerm).then((result) => {
      if (cancelled) return;
      setSubjects(result.subjects);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentPage, searchTerm]);

  // ── Selection ────────────────────────────────────────────────────────────
  const handleSelect = (subject: SubjectMetadata, action: SubjectAction) => {
    setSelectedImage(subject.id);
    router.push(action === 'sbom' ? '/home/compare/artifact' : '/home/compare/cve');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Available artifacts
          </h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {totalItems} subject{totalItems !== 1 ? 's' : ''} · click a pill to compare
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder='Search artifacts...'/>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading artifacts" />
      ) : (
        <>
          <SubjectGrid subjects={subjects} onSelect={handleSelect} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}