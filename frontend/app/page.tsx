export default function LobbyPage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '2rem',
      }}
    >
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold' }}>Orris</h1>
      <p style={{ color: '#aaa' }}>
        Real-time multiplayer IO game — coming soon
      </p>
    </main>
  );
}
