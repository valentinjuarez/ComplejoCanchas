import PagoFailureClient from "./PagoFailureClient";

export default function Page({
                               searchParams,
                             }: {
  searchParams: { rid?: string };
}) {
  return <PagoFailureClient rid={searchParams.rid} />;
}
