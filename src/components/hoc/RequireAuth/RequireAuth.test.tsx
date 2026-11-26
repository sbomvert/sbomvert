import { render, screen } from '@testing-library/react';
import { useSession } from '@better-auth-ui/react';
import { RequireAuth } from './RequireAuth';

// virtual: the package does not resolve under jest (as in Sidebar.test.tsx)
jest.mock('@better-auth-ui/react', () => ({ useSession: jest.fn() }), { virtual: true });
jest.mock('@/components/auth/auth', () => ({ Auth: () => 'SIGN-IN FORM' }));
jest.mock('@/lib/auth-client', () => ({ authClient: {} }));

const mockedSession = useSession as jest.Mock;

describe('RequireAuth', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_AUTH;
    jest.clearAllMocks();
  });

  test('shows the body, and asks for no session, when sign-in is not configured', () => {
    // set explicitly: jest loads the repo's .env, which turns sign-in on
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'false';
    render(<RequireAuth><p>the feature</p></RequireAuth>);
    expect(screen.getByText('the feature')).toBeInTheDocument();
    expect(mockedSession).not.toHaveBeenCalled();
  });

  describe('with sign-in configured', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    });

    test('shows the body to a signed-in user', () => {
      mockedSession.mockReturnValue({ data: { user: { id: 'u1' } }, isPending: false });
      render(<RequireAuth><p>the feature</p></RequireAuth>);
      expect(screen.getByText('the feature')).toBeInTheDocument();
      expect(screen.queryByText('SIGN-IN FORM')).toBeNull();
    });

    test('replaces the body with a message and the sign-in form when signed out', () => {
      mockedSession.mockReturnValue({ data: null, isPending: false });
      render(<RequireAuth><p>the feature</p></RequireAuth>);
      expect(screen.queryByText('the feature')).toBeNull();
      expect(screen.getByText('This feature requires authentication. Sign in to continue.')).toBeInTheDocument();
      expect(screen.getByText('SIGN-IN FORM')).toBeInTheDocument();
    });

    test('shows the message it is given', () => {
      mockedSession.mockReturnValue({ data: null, isPending: false });
      render(<RequireAuth message="Scanning needs an account"><p>the feature</p></RequireAuth>);
      expect(screen.getByText('Scanning needs an account')).toBeInTheDocument();
    });

    test('waits for the session before it decides', () => {
      mockedSession.mockReturnValue({ data: undefined, isPending: true });
      render(<RequireAuth><p>the feature</p></RequireAuth>);
      expect(screen.getByText('Checking sign-in')).toBeInTheDocument();
      expect(screen.queryByText('the feature')).toBeNull();
      expect(screen.queryByText('SIGN-IN FORM')).toBeNull();
    });
  });
});
