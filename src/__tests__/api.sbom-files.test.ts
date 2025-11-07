import { NextRequest } from 'next/server';
import { GET } from '@/app/api/sbom-files/route';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { createMockUrl, mockSbomData } from '@/test-utils';
import { defaultSbomService } from '@/services/sbomService';
import fs from 'fs';

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server') as typeof import('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (data: any, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status ?? 200,
      }),
    },
  };
});

// Mock sbomService
jest.mock('@/services/sbomService', () => ({
  defaultSbomService: {
    listSboms: jest.fn(),
  },
}));

jest.mock('fs');

const listSbomsMock = defaultSbomService.listSboms as jest.Mock;

// Helper to create mock NextRequest
const createMockRequest = (opts?: { page?: number | string; search?: string }) => {
  const query: Record<string, string> = {};
  if (opts?.page !== undefined) query.page = String(opts.page);
  if (opts?.search !== undefined) query.search = opts.search;

  const url = createMockUrl(query);

  return {
    nextUrl: url,
    headers: new Headers(),
    json: () => Promise.resolve({}),
    method: 'GET',
  } as unknown as NextRequest;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/sbom-files (service-backed)', () => {
  it('returns SBOM files with pagination', async () => {
    listSbomsMock.mockResolvedValue(mockSbomData as unknown as never);

    const res = await GET(createMockRequest({ page: 1 }));
    const json = await (res as any).json();

    expect(json).toEqual(mockSbomData);
    expect(defaultSbomService.listSboms).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it('handles search parameter', async () => {
    const searchResults = {
      ...mockSbomData,
      containers: mockSbomData.containers.filter((c) => c.name.includes('test')),
    };

    listSbomsMock.mockResolvedValue(searchResults as never);

    const res = await GET(createMockRequest({ search: 'test' }));
    const json = await (res as any).json();

    expect(json).toEqual(searchResults);
    expect(defaultSbomService.listSboms).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test' })
    );
  });

  it('handles invalid page parameter', async () => {
    listSbomsMock.mockResolvedValue(mockSbomData as never);

    const res = await GET(createMockRequest({ page: -1 }));
    const json = await (res as any).json();

    expect(json.pagination.currentPage).toBe(1);
    expect(defaultSbomService.listSboms).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it('returns default page when no page parameter is given', async () => {
    listSbomsMock.mockResolvedValue(mockSbomData as never);

    const res = await GET(createMockRequest());
    const json = await (res as any).json();

    expect(json.pagination.currentPage).toBe(1);
    expect(defaultSbomService.listSboms).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it('handles service errors', async () => {
    listSbomsMock.mockRejectedValue(new Error('Service error') as never);

    const res = await GET(createMockRequest());

    expect((res as any).status).toBe(500);

    const json = await (res as any).json();
    expect(json).toEqual({
      error: 'Failed to fetch SBOM files',
    });
  });
});

describe('GET /api/sbom-files (filesystem-backed)', () => {
  it('lists containers and files', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock)
      .mockReturnValueOnce([
        { isDirectory: () => true, name: 'nginx-twodotslatest' },
        { isDirectory: () => false, name: 'skip' },
      ])
      .mockReturnValueOnce([
        { isFile: () => true, name: 'syft.spdx.json' },
        { isFile: () => true, name: 'trivy.cyclonedx.json' },
      ]);

    const res = await GET(undefined as unknown as NextRequest);
    const json = await (res as any).json();

    expect(json.containers[0].name).toBe('nginx-twodotslatest');
    expect(json.containers[0].files).toHaveLength(2);
    expect(json.containers[0].files[0].path).toMatch('/sbom/nginx-twodotslatest/');
  });

  it('returns empty when dir missing', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const res = await GET(undefined as unknown as NextRequest);
    const json = await (res as any).json();

    expect(json.containers).toEqual([]);
  });
});
