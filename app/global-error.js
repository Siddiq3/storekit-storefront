'use client';

// Last resort: the root layout itself failed. Nothing about the failure is shown.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Something went wrong</h1>
        <p>Please try again in a moment.</p>
        <button type="button" onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
