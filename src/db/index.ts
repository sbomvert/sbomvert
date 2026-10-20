import { drizzle } from 'drizzle-orm/node-postgres';

export const createDb = () => drizzle(process.env.DATABASE_URL!);
