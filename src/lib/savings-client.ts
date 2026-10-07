export type MutationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

// Jaringan HP sering putus sesaat. Request diulang SEKALI dengan body yang
// sama persis; server memakai requestId sebagai kunci idempotensi, jadi
// pengulangan tidak bisa menghasilkan transaksi ganda.
export async function sendMutation(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  options: { successStatuses?: number[] } = {},
): Promise<MutationResult> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, init);
    } catch {
      if (attempt === 2) {
        return { ok: false, error: "Koneksi terputus. Periksa internet lalu coba lagi." };
      }
      continue;
    }
    const data = await response.json().catch(() => ({}));
    if (response.ok || options.successStatuses?.includes(response.status)) {
      return { ok: true, data };
    }
    return { ok: false, error: typeof data.error === "string" ? data.error : "Terjadi kesalahan. Coba lagi." };
  }
  return { ok: false, error: "Terjadi kesalahan. Coba lagi." };
}
