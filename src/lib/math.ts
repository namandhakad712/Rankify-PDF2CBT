import katex from "katex";

// HTML-escape plain text segments — math goes through KaTeX (safe output)
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/**
 * Render a question/solution string to safe HTML.
 * Supports $...$, \(...\) inline and $$...$$, \[...\] display math.
 * Unknown LaTeX renders verbatim (throwOnError:false), never throws.
 */
export function renderMath(src: string): string {
  if (!src || src.indexOf("$") === -1 && src.indexOf("\\") === -1) return esc(src);
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const tex = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    const display = m[1] != null || m[2] != null;
    try {
      out += katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        output: "html",
      });
    } catch {
      out += esc(m[0]);
    }
    last = m.index + m[0].length;
  }
  out += esc(src.slice(last));
  return out;
}
