// Storybook (react-vite) has no Next app router mounted, so the real useRouter throws
const noop = () => {};
const router = { push: noop, replace: noop, back: noop, forward: noop, refresh: noop, prefetch: noop };

export const useRouter = () => router;
