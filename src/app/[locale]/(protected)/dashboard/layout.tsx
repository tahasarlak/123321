// src/app/[locale]/(protected)/dashboard/layout.tsx
export default function ProtectedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}