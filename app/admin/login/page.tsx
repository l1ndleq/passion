import AdminLoginClient from "./AdminLoginClient";

export default function Page({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const nextPath =
    typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/admin/orders";

  return <AdminLoginClient nextPath={nextPath} />;
}
