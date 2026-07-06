import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL as string,
    directUrl: process.env.DIRECT_URL as string,
  },
});
