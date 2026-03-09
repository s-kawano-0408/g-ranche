import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 生年月日から年齢を計算する
 */
export function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * 生年月日から学年を計算する（日本の学年制度）
 * 4月2日〜翌年4月1日生まれが同学年
 * 返り値: "小学1年生" 〜 "高校3年生" or null（学齢外）
 */
export function calcGrade(birthDate: string): string | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);

  // 現在の年度を求める（4月始まり）
  const fiscalYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

  // 生まれ年度を求める（4月2日〜翌年4月1日が同じ年度）
  // 4月1日生まれは前年度扱い
  let birthFiscalYear = birth.getFullYear();
  if (birth.getMonth() < 3 || (birth.getMonth() === 3 && birth.getDate() <= 1)) {
    birthFiscalYear -= 1;
  }

  // 学年 = 現在の年度 - 生まれ年度 - 5（小学1年が6歳になる年度）
  const gradeNum = fiscalYear - birthFiscalYear - 5;

  if (gradeNum >= 1 && gradeNum <= 6) return `小学${gradeNum}年生`;
  if (gradeNum >= 7 && gradeNum <= 9) return `中学${gradeNum - 6}年生`;
  if (gradeNum >= 10 && gradeNum <= 12) return `高校${gradeNum - 9}年生`;
  return null;
}
