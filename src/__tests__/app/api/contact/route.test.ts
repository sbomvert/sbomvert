import { POST } from '@/app/api/contact/route';
import { NextResponse } from 'next/server';

// Mock the console.log to avoid test output pollution
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

describe('POST /api/contact', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  it('should return 400 when email is missing', async () => {
    const request = {
      json: async () => ({ name: 'Test User', message: 'Test message' })
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing fields');
  });

  it('should return 400 when message is missing', async () => {
    const request = {
      json: async () => ({ name: 'Test User', email: 'test@example.com' })
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing fields');
  });

  it('should return 400 when both email and message are missing', async () => {
    const request = {
      json: async () => ({ name: 'Test User' })
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing fields');
  });

  it('should return 200 when email and message are provided', async () => {
    const request = {
      json: async () => ({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
      })
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('New contact message:', {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message'
    });
  });

  it('should handle empty string values gracefully', async () => {
    const request = {
      json: async () => ({
        name: 'Test User',
        email: '',
        message: 'Test message'
      })
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing fields');
  });

  it('should handle missing name parameter', async () => {
    const request = {
      json: async () => ({
        email: 'test@example.com',
        message: 'Test message'
      })
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith('New contact message:', {
      name: undefined,
      email: 'test@example.com',
      message: 'Test message'
    });
  });

  it('should handle malformed JSON gracefully', async () => {
    const request = {
      json: async () => {
        throw new Error('Malformed JSON');
      }
    } as unknown as Request;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Server error');
  });
});