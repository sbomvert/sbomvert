import { create } from "zustand";

interface ArtifactStore {
  selectedImage: string | null;
  setSelectedImage: (value: string) => void;
  clearSelectedImage: () => void;
}

export const useArtifactStore = create<ArtifactStore>((set) => ({
  selectedImage: null,
  setSelectedImage: (value:string) => set({ selectedImage: value }),
  clearSelectedImage: () => set({ selectedImage: null }),
}));
