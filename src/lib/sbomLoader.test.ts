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

  it('loads SPDX and CycloneDX SBOMs by content instead of filename extension', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          files: [{ name: 'syft.spdx.json' }, { name: 'syft.cdx.json' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          spdxVersion: 'SPDX-2.3',
          name: 'spdx-doc',
          creationInfo: {
            creators: ['Tool: syft-1.2.3'],
            created: '2024-01-01T00:00:00Z',
          },
          packages: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          bomFormat: 'CycloneDX',
          specVersion: '1.6',
          version: 1,
          metadata: {
            tools: {
              components: [{ type: 'application', name: 'syft', version: '1.45.1' }],
            },
          },
          components: [
            {
              type: 'library',
              name: 'stdlib',
              version: '1.26.4',
              purl: 'pkg:golang/stdlib@1.26.4',
            },
          ],
        }),
      })

    const result = await loadSbomsForImage('golang1.26-alpine')

    expect(result.sboms['golang1.26-alpine']).toHaveLength(2)
    expect(result.sboms['golang1.26-alpine'].map(sbom => sbom.format)).toEqual([
      'SPDX',
      'CycloneDX',
    ])
    expect(result.sboms['golang1.26-alpine'][1].packages).toHaveLength(1)
  })
})
