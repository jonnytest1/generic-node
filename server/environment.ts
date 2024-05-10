import { config } from 'dotenv';
import { join } from "path"
const env = config({
    path: join(__dirname, '..', ".env")
});
if (env.error) {
    console.error(env.error)
}

export const environment = process.env as {
    WATCH_SERVICES: string;
    GENERIC_NODE_DATA?: string
}