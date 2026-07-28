export interface BrowserSessionTokens {
  accessToken: string;
  csrfToken: string;
}

const CHANNEL_NAME = 'verigate-browser-session';
const LEASE_KEY = 'verigate_refresh_lease';
const LEASE_MS = 5_000;
const owner = crypto.randomUUID();
let inFlight: Promise<BrowserSessionTokens | null> | null = null;
let channel: BroadcastChannel | null = null;
let latest: { tokens: BrowserSessionTokens | null; receivedAt: number } | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'session-refresh-complete') {
        latest = { tokens: event.data.tokens ?? null, receivedAt: Date.now() };
      }
    });
  }
  return channel;
}

function leaseAvailable(): boolean {
  try {
    const current = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
    return !current || current.expiresAt <= Date.now() || current.owner === owner;
  } catch {
    return true;
  }
}

function claimLease(): boolean {
  try {
    if (!leaseAvailable()) return false;
    localStorage.setItem(LEASE_KEY, JSON.stringify({ owner, expiresAt: Date.now() + LEASE_MS }));
    return JSON.parse(localStorage.getItem(LEASE_KEY) || 'null')?.owner === owner;
  } catch {
    return true;
  }
}

function releaseLease(): void {
  try {
    const current = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
    if (current?.owner === owner) localStorage.removeItem(LEASE_KEY);
  } catch {
    // Browser storage availability is optional; the in-memory guard still applies.
  }
}

async function waitForPeer(startedAt: number): Promise<BrowserSessionTokens | null | undefined> {
  getChannel();
  const deadline = Date.now() + LEASE_MS;
  while (Date.now() < deadline) {
    if (latest && latest.receivedAt >= startedAt) return latest.tokens;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return undefined;
}

export function coordinateSessionRefresh(
  refresh: () => Promise<BrowserSessionTokens | null>,
): Promise<BrowserSessionTokens | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const startedAt = Date.now();
    if (!claimLease()) {
      const peerResult = await waitForPeer(startedAt);
      if (peerResult !== undefined) return peerResult;
      if (!claimLease()) return null;
    }
    try {
      const tokens = await refresh();
      latest = { tokens, receivedAt: Date.now() };
      getChannel()?.postMessage({ type: 'session-refresh-complete', tokens });
      return tokens;
    } finally {
      releaseLease();
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function resetSessionCoordinatorForTests(): void {
  inFlight = null;
  latest = null;
  releaseLease();
}
