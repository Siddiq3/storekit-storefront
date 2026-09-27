import { Markdown } from '@/lib/markdown.jsx';

/** One policy document. The same component renders the policy page and the policy modal. */
export function PolicyContent({ policy, titleId }) {
  return (
    <article className="sk-policy">
      <h1 id={titleId}>{policy.title}</h1>
      <Markdown text={policy.content} className="sk-prose" />
    </article>
  );
}
