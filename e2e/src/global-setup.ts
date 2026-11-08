import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENT_ID, HASS_URL, loginWithPassword, readToken, waitForRunning } from "./hass.ts";

export const STORAGE_STATE = fileURLToPath(new URL("../.auth/state.json", import.meta.url));

/**
 * Checks the bootstrapped Home Assistant is up, then logs in once and stores the tokens where
 * the frontend looks for them, so every test starts authenticated.
 */
export default async function globalSetup() {
  await waitForRunning(await readToken());
  const tokens = await loginWithPassword();
  const hassTokens = {
    ...tokens,
    hassUrl: HASS_URL,
    clientId: CLIENT_ID,
    expires: Date.now() + tokens.expires_in * 1000,
  };
  await mkdir(dirname(STORAGE_STATE), { recursive: true });
  await writeFile(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: HASS_URL,
          localStorage: [{ name: "hassTokens", value: JSON.stringify(hassTokens) }],
        },
      ],
    })
  );
}
