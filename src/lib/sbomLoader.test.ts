import { loadSbomImagesFromPublic, loadSbomsForImage } from '@/lib/sbomLoader'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('loadSbomImagesFromPublic', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns images when response ok', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ containers: [{ name: 'test', files: [{name:'a.json'}] }], pagination: { currentPage:1,totalPages:1,totalItems:1,itemsPerPage:20 } }),
    }
    mockFetch.mockResolvedValue(mockResponse)

    const result = await loadSbomImagesFromPublic()
    expect(result.images).toHaveLength(1)
    expect(result.images[0].id).toBe('test')
  })

  it('returns empty when response not ok', async () => {
    // silence error log
    const originalError = console.error
    console.error = jest.fn()
    mockFetch.mockResolvedValue({ ok: false })
    const result = await loadSbomImagesFromPublic()
    expect(result.images).toHaveLength(0)
    console.error = originalError
  })
})

describe('loadSbomsForImage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty sboms when files list empty', async () => {
    const mockFilesResponse = { ok: true, json: jest.fn().mockResolvedValue({ files: [] }) }
    mockFetch.mockResolvedValueOnce(mockFilesResponse)
    const result = await loadSbomsForImage('test')
    expect(Object.keys(result.sboms)).toHaveLength(0)
  })
})