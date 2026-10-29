export async function bearerHeaders(
  user: { getIdToken: () => Promise<string> } | null | undefined,
): Promise<HeadersInit> {
  if (!user) throw new Error("Silakan login kembali.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
}
