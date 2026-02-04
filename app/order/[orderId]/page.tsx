export const dynamic = "force-dynamic";

export default function OrderPage({ params }: { params: any }) {
  return (
    <main style={{ padding: 40 }}>
      <h1>DEBUG</h1>
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #000" }}>
        <div>pathname segment should be orderId</div>
        <div>
          params.orderId: <b>{String(params?.orderId)}</b>
        </div>
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(params, null, 2)}
        </pre>
      </div>
    </main>
  );
}