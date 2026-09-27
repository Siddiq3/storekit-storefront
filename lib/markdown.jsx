/**
 * A deliberately small Markdown subset for owner-written text (policies, pages):
 *   "# " / "## " headings, "### " sub-headings, "- " or "* " lists, "1. " numbered lists,
 *   **bold**, and paragraphs (a single line break inside one is kept).
 *
 * Everything becomes React elements from plain strings — there is no HTML parsing and no
 * dangerouslySetInnerHTML — so whatever the text contains is shown as text. (The API also
 * refuses "<" in this text, so a tag can never be stored in the first place.)
 */

const HEADING = /^(#{1,3})\s+(.+)$/;
const BULLET = /^\s*[-*•]\s+(.+)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.+)$/;

/** **bold** inside a line; anything else is text. */
export const inline = (text, keyBase = 'i') =>
  String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>
      : part));

/** Parses text into blocks: `{ kind: 'h2'|'h3'|'p'|'ul'|'ol', lines: string[] }`. */
export const toBlocks = (text) => {
  const blocks = [];
  let current = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const line of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(HEADING);
    if (heading) {
      flush();
      blocks.push({ kind: heading[1].length === 3 ? 'h3' : 'h2', lines: [heading[2].trim()] });
      continue;
    }
    const bullet = line.match(BULLET);
    const numbered = !bullet && line.match(NUMBERED);
    const listKind = bullet ? 'ul' : numbered ? 'ol' : null;
    if (listKind) {
      if (current?.kind !== listKind) { flush(); current = { kind: listKind, lines: [] }; }
      current.lines.push((bullet ?? numbered)[1].trim());
      continue;
    }
    if (current?.kind !== 'p') { flush(); current = { kind: 'p', lines: [] }; }
    current.lines.push(line.trim());
  }
  flush();
  return blocks;
};

export function Markdown({ text, className }) {
  return (
    <div className={className}>
      {toBlocks(text).map((block, b) => {
        const key = `b${b}`;
        if (block.kind === 'h2') return <h2 key={key}>{inline(block.lines[0], key)}</h2>;
        if (block.kind === 'h3') return <h3 key={key}>{inline(block.lines[0], key)}</h3>;
        if (block.kind === 'ul' || block.kind === 'ol') {
          const List = block.kind;
          return <List key={key}>{block.lines.map((item, i) => <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>)}</List>;
        }
        return (
          <p key={key}>
            {block.lines.flatMap((line, i) => (i === 0 ? inline(line, `${key}-${i}`) : [<br key={`${key}-br${i}`} />, ...inline(line, `${key}-${i}`)]))}
          </p>
        );
      })}
    </div>
  );
}
