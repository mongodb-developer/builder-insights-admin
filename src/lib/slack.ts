/**
 * Shared Slack utilities
 *
 * Centralizes webhook configuration, fetch-with-timeout, and app URL
 * so that all Slack API routes use consistent settings.
 */

/** Slack incoming webhook URL (set via env var) */
export function getSlackWebhookUrl(): string {
  return process.env.SLACK_WEBHOOK_URL || '';
}

/** Whether the Slack webhook is configured */
export function isSlackConfigured(): boolean {
  return Boolean(getSlackWebhookUrl());
}

/** Base URL of this application (used for dashboard links in messages) */
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Default timeout for Slack webhook requests (10 seconds) */
const SLACK_FETCH_TIMEOUT_MS = 10_000;

/**
 * Post a JSON payload to the Slack webhook with a timeout.
 *
 * Returns the Response on success. Throws on network errors or timeout.
 */
export async function postToSlack(
  payload: Record<string, unknown>,
): Promise<Response> {
  const url = getSlackWebhookUrl();
  if (!url) {
    throw new Error('Slack webhook URL is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}
