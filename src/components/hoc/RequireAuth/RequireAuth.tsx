'use client';

import type { ReactNode } from 'react';
import { useSession } from '@better-auth-ui/react';
import { Auth } from '@/components/auth/auth';
import { LoadingSpinner } from '@/components/spinner/LoadingSpinner';
import { authClient } from '@/lib/auth-client';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface RequireAuthProps {
  children: ReactNode;
  // shown above the sign-in form when the user is not signed in
  message?: string;
}

// The body of a page whose endpoints need a signed-in user. The page keeps its title above it.
export const RequireAuth = ({ children, message = 'This feature requires authentication. Sign in to continue.' }: RequireAuthProps) => {
  // sign-in is off: nothing to gate. The flag is fixed for the build, so the hook is never called without sign-in.
  if (!FEATURE_FLAGS.ENABLE_AUTH) return <>{children}</>;
  return <SignInGate message={message}>{children}</SignInGate>;
};

const SignInGate = ({ children, message }: { children: ReactNode; message: string }) => {
  const { data: session, isPending } = useSession(authClient);

  if (isPending) return <LoadingSpinner message="Checking sign-in" />;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 mt-36">
        <p className="text-body-sm text-foreground-muted">{message}</p>
        <Auth view="signIn" />
      </div>
    );
  }

  return <>{children}</>;
};
