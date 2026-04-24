import { createSign } from "node:crypto";

interface FirebaseServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

interface AccessTokenCache {
  accessToken: string;
  expiresAt: number;
}

interface SendFcmMessageParams {
  token: string;
  title: string;
  body: string;
  iconUrl: string;
  badgeUrl: string;
  url: string;
  imageUrl?: string;
}

let accessTokenCache: AccessTokenCache | null = null;

function normalizePrivateKey(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.replace(/\\n/g, "\n");
}

function parseFirebaseCredentialsJson(rawJson: string): FirebaseServiceAccount {
  const parsed = JSON.parse(rawJson) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  };

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("Firebase Admin credentials JSON is incomplete.");
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: normalizePrivateKey(parsed.private_key)!,
    tokenUri: parsed.token_uri ?? "https://oauth2.googleapis.com/token",
  };
}

export function getFirebaseServiceAccount(): FirebaseServiceAccount {
  const rawJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  if (rawJson) {
    return parseFirebaseCredentialsJson(rawJson);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are incomplete.");
  }

  return {
    projectId,
    clientEmail,
    privateKey,
    tokenUri: "https://oauth2.googleapis.com/token",
  };
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSignedJwt(serviceAccount: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.clientEmail,
    sub: serviceAccount.clientEmail,
    aud: serviceAccount.tokenUri,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedClaimSet = toBase64Url(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.privateKey);

  return `${unsignedToken}.${toBase64Url(signature)}`;
}

export async function getFirebaseAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.accessToken;
  }

  const serviceAccount = getFirebaseServiceAccount();
  const assertion = createSignedJwt(serviceAccount);
  const response = await fetch(serviceAccount.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Firebase access token: ${errorText}`);
  }

  const payload = await response.json() as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token || !payload.expires_in) {
    throw new Error("Firebase access token response is incomplete.");
  }

  accessTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  return payload.access_token;
}

export async function sendFcmMessage(params: SendFcmMessageParams) {
  const serviceAccount = getFirebaseServiceAccount();
  const accessToken = await getFirebaseAccessToken();
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: params.token,
          android: {
            notification: {
              title: params.title,
              body: params.body,
              sound: "default",
              ...(params.imageUrl ? { imageUrl: params.imageUrl } : {}),
            },
            data: {
              url: params.url,
              title: params.title,
              body: params.body,
            },
          },
          webpush: {
            notification: {
              title: params.title,
              body: params.body,
              icon: params.iconUrl,
              badge: params.badgeUrl,
            },
            data: {
              title: params.title,
              body: params.body,
              icon: params.iconUrl,
              badge: params.badgeUrl,
              url: params.url,
            },
            fcmOptions: {
              link: params.url,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: { title: params.title, body: params.body },
                sound: "default",
              },
            },
            ...(params.imageUrl ? { fcmOptions: { image: params.imageUrl } } : {}),
          },
        },
      }),
    },
  );

  if (response.ok) {
    const payload = await response.json() as { name?: string };
    return { success: true as const, messageId: payload.name ?? null };
  }

  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  try {
    const payload = await response.json() as {
      error?: {
        status?: string;
        message?: string;
        details?: Array<{ errorCode?: string }>;
      };
    };
    errorCode = payload.error?.details?.[0]?.errorCode ?? payload.error?.status ?? null;
    errorMessage = payload.error?.message ?? null;
  } catch {
    errorMessage = await response.text().catch(() => null);
  }

  return {
    success: false as const,
    errorCode,
    errorMessage: errorMessage ?? `FCM request failed with status ${response.status}`,
  };
}
