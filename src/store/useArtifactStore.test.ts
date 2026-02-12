import { useArtifactStore } from '@/store/useArtifactStore'

describe('useArtifactStore', () => {
  it('stores selected image and sbom', () => {
    const store = useArtifactStore.getState()
    store.setSelectedImage('test-image')
    expect(useArtifactStore.getState().selectedImage).toBe('test-image')
  })
})