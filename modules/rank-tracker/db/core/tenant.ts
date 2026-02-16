import "server-only";

const DEFAULT_TENANT_ID = "public-demo";
const MAX_TENANT_LENGTH = 80;

function sanitizeTenantId(value: string | undefined): string {
  if (!value) {
    return DEFAULT_TENANT_ID;
  }

  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, MAX_TENANT_LENGTH);

  return sanitized || DEFAULT_TENANT_ID;
}

export async function getCurrentTenantId(): Promise<string> {
  const envTenant = process.env.RANK_TRACKER_TENANT_ID;
  if (envTenant) {
    return sanitizeTenantId(envTenant);
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get("rt_demo_session")?.value;

    return sanitizeTenantId(fromCookie);
  } catch {
    return DEFAULT_TENANT_ID;
  }
}
