import dns from "node:dns";

// Ensure Node.js resolves IPv4 ahead of IPv6 for Supabase pooler compatibility
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore on older Node runtimes
}

import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(
    `Science on Wheels API listening on http://localhost:${env.PORT}`
  );
});
