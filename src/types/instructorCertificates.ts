// src/types/instructorCertificates.ts
export type CertificateItem = {
  id: string;
  certificateNumber: string;
  score: number | null;
  grade: string | null;
  issuedAt: Date;
  user: { id: string; name: string | null };
  course: { id: string; title: string };
};

export type CertificateResult =
  | { success: true; message?: string; certificate?: CertificateItem; certificates?: CertificateItem[] }
  | { success: false; error: string };