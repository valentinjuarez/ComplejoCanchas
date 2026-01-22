// app/auth/admin/layout.tsx
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-md px-4 py-16">{children}</div>
    </main>
  );
}
