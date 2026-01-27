import PagoSuccessClient from "./PagoSuccessClient";

export const dynamic = "force-dynamic"; // evita optimizaciones raras con query params

export default function Page() {
  return <PagoSuccessClient />;
}