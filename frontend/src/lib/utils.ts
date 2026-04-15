import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractErrorMessage(err: any, fallback = "Đã có lỗi xảy ra."): string {
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((e: any) => `${e.loc?.slice(-1)?.[0] || 'Field'}: ${e.msg}`).join('; ');
    }
    return JSON.stringify(detail);
  }
  return err.message || fallback;
}
