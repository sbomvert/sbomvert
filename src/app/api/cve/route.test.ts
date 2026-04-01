import { GET } from './route';

describe('GET /api/cves', () => {
  it('returns 400 when image query param is missing', async () => {
    const request = new Request('http://localhost/api/cves');

    const response = await GET(request);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      error: 'Container image name is required',
    });
  });

  it('returns files when they exist', async () => {
    // You must ensure this image exists in your test environment
    const image = 'test-image:latest';

    const response = await GET(
      new Request(`http://localhost/api/cves?image=${image}`)
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty('files');
    expect(Array.isArray(body.files)).toBe(true);

    // Optional: validate expected structure if you control the dataset
    // expect(body.files.length).toBeGreaterThan(0);
  });

  it('returns empty array when no files are found', async () => {
    const image = 'nonexistent-image:latest';

    const response = await GET(
      new Request(`http://localhost/api/cves?image=${image}`)
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toEqual({ files: [] });
  });

});