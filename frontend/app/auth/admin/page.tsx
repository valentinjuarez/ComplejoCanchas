// app/auth/admin/page.tsx
import { redirect } from 'next/navigation';

export default function AdminAuthIndex() {
  redirect('/auth/admin/login');
}
