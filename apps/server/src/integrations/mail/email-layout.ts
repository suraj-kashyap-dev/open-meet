export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailLayoutInput {
  /** Inbox preview text (hidden preheader). */
  preview: string;
  /** Bold lead heading inside the card. */
  heading: string;
  /** Body paragraphs, rendered top-to-bottom as plain text. */
  body: string[];
  /** Primary call-to-action button. */
  button?: EmailButton;
  /** Small muted line under the button (e.g. expiry / disclaimer). */
  footnote?: string;
}

const BG = '#f3f4f6';
const CARD = '#ffffff';
const BORDER = '#e5e7eb';
const TEXT = '#111827';
const MUTED = '#6b7280';
const ACCENT = '#4f46e5';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Wrap email content in a modern, responsive, email-client-safe shell:
 * table-based layout, inline styles only, a branded header, a bulletproof
 * CTA button, and a muted footer. All caller-supplied text is HTML-escaped
 * here, so callers pass plain strings.
 */
export function renderEmail(input: EmailLayoutInput): string {
  const heading = escapeHtml(input.heading);
  const preview = escapeHtml(input.preview);

  const paragraphs = input.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${TEXT};">${escapeHtml(
          line,
        )}</p>`,
    )
    .join('');

  const button = input.button
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
                <tr>
                  <td align="center" bgcolor="${ACCENT}" style="border-radius:10px;">
                    <a href="${escapeAttr(input.button.url)}" target="_blank" style="display:inline-block; padding:13px 30px; font-family:${FONT}; font-size:15px; font-weight:600; line-height:1; color:#ffffff; text-decoration:none; border-radius:10px;">${escapeHtml(
                      input.button.label,
                    )}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0; font-size:13px; line-height:1.5; color:${MUTED};">
                Or paste this link into your browser:<br />
                <a href="${escapeAttr(input.button.url)}" style="color:${ACCENT}; word-break:break-all;">${escapeHtml(
                  input.button.url,
                )}</a>
              </p>`
    : '';

  const footnote = input.footnote
    ? `
              <hr style="border:none; border-top:1px solid ${BORDER}; margin:24px 0;" />
              <p style="margin:0; font-size:12px; line-height:1.5; color:${MUTED};">${escapeHtml(
                input.footnote,
              )}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${heading}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BG}; -webkit-font-smoothing:antialiased;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${preview}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; margin:0 auto;">
            <tr>
              <td style="padding:0 4px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:32px; height:32px; background-color:${ACCENT}; border-radius:8px; text-align:center; vertical-align:middle; color:#ffffff; font-family:${FONT}; font-size:16px; font-weight:700;">M</td>
                    <td style="padding-left:10px; font-family:${FONT}; font-size:16px; font-weight:600; color:${TEXT};">Open Meet</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background-color:${CARD}; border:1px solid ${BORDER}; border-radius:16px; padding:32px;">
                <h1 style="margin:0 0 16px; font-family:${FONT}; font-size:21px; line-height:1.3; font-weight:700; color:${TEXT};">${heading}</h1>
                <div style="font-family:${FONT};">
                  ${paragraphs}${button}${footnote}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 4px 0; text-align:center;">
                <p style="margin:0; font-family:${FONT}; font-size:12px; line-height:1.5; color:${MUTED};">
                  You received this email from the Open Meet admin console.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
