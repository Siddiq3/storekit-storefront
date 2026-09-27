'use client';

import { useId, useRef, useState } from 'react';
import { PolicyContent } from './PolicyContent.jsx';
import { getJson } from '@/lib/client-api.js';

/**
 * A link to a policy that opens it in a dialog over the page. It is a real link to
 * /policies/<slug> — a new tab, a shared address, a crawler or a browser without scripts gets
 * the full page, which renders the same PolicyContent.
 */
export function PolicyLink({ slug, className, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [state, setState] = useState({ status: 'idle' });

  const open = async (event) => {
    // Let the browser handle a new tab, a new window or a download.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.current?.showModal();
    if (state.status === 'ready') return;
    setState({ status: 'loading' });
    const result = await getJson(`/api/policies/${encodeURIComponent(slug)}`);
    setState(result.ok ? { status: 'ready', policy: result.data } : { status: 'failed' });
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <a href={`/policies/${slug}`} className={className} onClick={open}>{children}</a>
      <dialog
        ref={dialog}
        className="sk-modal"
        aria-labelledby={titleId}
        onClick={(event) => { if (event.target === dialog.current) close(); }}
      >
        <div className="sk-modal-body">
          <button type="button" className="sk-modal-close" onClick={close} aria-label="Close">×</button>
          {state.status === 'ready' ? <PolicyContent policy={state.policy} titleId={titleId} /> : null}
          {state.status === 'loading' ? <p id={titleId} className="sk-hint" role="status">Loading…</p> : null}
          {state.status === 'failed' ? (
            <p id={titleId} className="sk-hint" role="alert">This policy could not be loaded. <a href={`/policies/${slug}`}>Open it as a page</a>.</p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
