import { createAuth } from "./src/server/auth";
import { createDatabase } from "./src/server/db";

const db = createDatabase();

export const auth = createAuth({ db });
