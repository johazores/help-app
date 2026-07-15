export default function ApiHome() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "40rem" }}>
      <h1>Sagip API</h1>
      <p>Backend service for Sagip. All endpoints live under <code>/api/*</code>.</p>
      <p>
        In development, the client at{" "}
        <a href="http://localhost:8000">localhost:8000</a> proxies API calls here.
      </p>
    </main>
  );
}
