export type LicenseVerifyResponse = {
  ok: true;
  customer_id: string;
  tier: string;
  status: string;
  expires_at: number;
  license_token: string;
};

export async function verifyLicense(customerId: string): Promise<LicenseVerifyResponse> {
  const url = `https://api.rinawarptech.com/api/license/verify`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customer_id: customerId, device_id: "local", app_version: "1.0.0" })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`License verify failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<LicenseVerifyResponse>;
}
