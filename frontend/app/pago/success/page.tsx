import PagoSuccessClient from "./PagoSuccessClient";

export default function Page({
                               searchParams,
                             }: {
  searchParams: { rid?: string };
}) {
  return <PagoSuccessClient rid={searchParams.rid} />;
}
