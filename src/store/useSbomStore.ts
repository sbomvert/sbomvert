// lib/store/sbomStore.ts
import { create } from 'zustand';
import { SbomInfo, RichPackage } from '@/lib/sbom/spdx/parser';

type SbomState = {
  info: SbomInfo | null;
  packages: RichPackage[];
  name: string;
  containerName: string;
  setSbom: (data: { info: SbomInfo; packages: RichPackage[]; name: string; containerName: string }) => void;
  clear: () => void;
};

export const useSbomStore = create<SbomState>((set) => ({
  info: null,
  packages: [],
  name: '',
  containerName: '',
  setSbom: (data) => set(data),
  clear: () => set({ info: null, packages: [] }),
}));