import { render, screen } from '@testing-library/react';
import { useSession } from '@better-auth-ui/react';
import Page from './page';

jest.mock('@better-auth-ui/react', () => ({ useSession: jest.fn() }), { virtual: true });
jest.mock('@/components/auth/auth', () => ({ Auth: () => 'SIGN-IN FORM' }));
jest.mock('@/lib/auth-client', () => ({ authClient: {} }));
jest.mock('@/components/hoc/ImageScanForm/ImageScanForm', () => ({ ImageScanForm: () => require('react').createElement('p', null, 'SCAN FORM') }));
jest.mock('@/components/hoc/RecentScans/RecentScans', () => ({ RecentScans: () => require('react').createElement('p', null, 'RECENT SCANS') }));

const mockedSession = useSession as jest.Mock;

describe('Scan page', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_AUTH;
    jest.clearAllMocks();
  });

  test('shows the scan form and the recent scans when sign-in is not configured', () => {
    // set explicitly: jest loads the repo's .env, which turns sign-in on
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'false';
    mockedSession.mockReturnValue({ data: null, isPending: false });
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Scan an image' })).toBeInTheDocument();
    expect(screen.getByText('SCAN FORM')).toBeInTheDocument();
    expect(screen.getByText('RECENT SCANS')).toBeInTheDocument();
  });

  test('keeps the title and puts the sign-in form in place of the scan when signed out', () => {
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    mockedSession.mockReturnValue({ data: null, isPending: false });
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Scan an image' })).toBeInTheDocument();
    expect(screen.getByText('This feature requires authentication. Sign in to continue.')).toBeInTheDocument();
    expect(screen.getByText('SIGN-IN FORM')).toBeInTheDocument();
    expect(screen.queryByText('SCAN FORM')).toBeNull();
    expect(screen.queryByText('RECENT SCANS')).toBeNull();
  });
});
