import PagoPendingClient from "./PagoPendingClient";

export default function Page({
                               searchParams,
                             }: {
  searchParams: { rid?: string };
}) {
  return <PagoPendingClient rid={searchParams.rid} />;
}
