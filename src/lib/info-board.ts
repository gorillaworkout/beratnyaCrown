export type InfoCategory = "finance" | "event";

export type InfoItemInput = {
  category: InfoCategory;
  title: string;
  description: string;
};

export function validateInfoItem(item: InfoItemInput): boolean {
  return Boolean(item.category && item.title.trim());
}
