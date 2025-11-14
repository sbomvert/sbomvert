import { NextRequest } from 'next/server';
import { GET } from '@/app/api/sbom-files/route';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { createMockUrl } from '@/test-utils';
import fs from 'fs';

// Mock NextResponse for proper response shape
// Mock NextResponse with proper response shape
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      json: () => Promise.resolve(data),
      status: init?.status ?? 200,
    }),
  },
}));

// Mock sbomService
const mockListSboms = jest.fn();
jest.mock('@/services/sbomService', () => ({
  defaultSbomService: {
    listSboms: mockListSboms,
  },
}));

const mockResponse = {
  containers: [
    {
      name: 'nginx-twodotslatest',
      files: [
        { name: 'syft.spdx.json', path: '/sbom/nginx-twodotslatest/syft.spdx.json' },
        { name: 'trivy.cyclonedx.json', path: '/sbom/nginx-twodotslatest/trivy.cyclonedx.json' },
      ],
    },
  ],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 1,
    itemsPerPage: 20,
  },
};

jest.mock('fs');

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
    mockListSboms.mockReturnValue(mockResponse);
    const req = createMockRequest({ page: 1 });
    const res = await GET(req);
    const json = await (res as any).json();

    expect(json).toEqual(mockResponse);
    expect(mockListSboms).toHaveBeenCalledWith(1);
  });

  it('handles search parameter', async () => {
    mockListSboms.mockReturnValue(mockResponse);
    const req = createMockRequest({ search: 'test' });
    const res = await GET(req);
    const json = await (res as any).json();

    expect(json).toEqual(mockResponse);
    expect(mockListSboms).toHaveBeenCalledWith(1, 'test');
  });

  it('handles invalid page parameter', async () => {
    mockListSboms.mockReturnValue(mockResponse);
    const req = createMockRequest({ page: -1 });
    const res = await GET(req);
    const json = await (res as any).json();

    expect(json.pagination.currentPage).toBe(1);
    expect(mockListSboms).toHaveBeenCalledWith(1);
  });

  it('returns default page when no page parameter is given', async () => {
    mockListSboms.mockReturnValue(mockResponse);

    const res = await GET(createMockRequest());
    const json = await (res as any).json();

    expect(json.pagination.currentPage).toBe(1);
    expect(mockListSboms).toHaveBeenCalledWith(1);
  });

  it('handles service errors', async () => {
    mockListSboms.mockImplementation(() => {
      throw new Error('Service error');
    });

    const req = createMockRequest();
    const res = await GET(req);
    const json = await (res as any).json();

    expect(json).toEqual({
      error: 'Failed to read SBOM directory',
    });
  });
});

describe('GET /api/sbom-files (filesystem-backed)', () => {
  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReset();
    (fs.readdirSync as jest.Mock).mockReset();
  });

  it('lists containers and files', async () => {
    mockListSboms.mockReturnValue(mockResponse);

    const res = await GET(createMockRequest());
    const json = await (res as any).json();

    expect(json).toEqual(mockResponse);
  });

  it('returns empty when dir missing', async () => {
    mockListSboms.mockReturnValue({
      containers: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
      },
    });

    const res = await GET(createMockRequest());
    const json = await (res as any).json();

    expect(json).toEqual({
      containers: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
      },
    });
  });
});
