export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="sk-skeleton" style={{ height: 28, width: '40%', marginBottom: 16 }} />
      <ul className="sk-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}><div className="sk-skeleton" style={{ aspectRatio: '1 / 1' }} /><div className="sk-skeleton" style={{ height: 16, marginTop: 8 }} /></li>
        ))}
      </ul>
    </div>
  );
}
