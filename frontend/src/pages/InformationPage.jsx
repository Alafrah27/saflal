import { Fragment, useEffect } from "react";
import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import terms from "../../../docs/legal/TERMS_OF_SERVICE.md?raw";
import privacy from "../../../docs/legal/PRIVACY_POLICY.md?raw";
import about from "../../../docs/legal/ABOUT_SAFLAL.md?raw";
import deletion from "../../../docs/legal/ACCOUNT_DELETION.md?raw";
import termsArabic from "../../../docs/legal/TERMS_OF_SERVICE.ar.md?raw";
import privacyArabic from "../../../docs/legal/PRIVACY_POLICY.ar.md?raw";
import aboutArabic from "../../../docs/legal/ABOUT_SAFLAL.ar.md?raw";
import deletionArabic from "../../../docs/legal/ACCOUNT_DELETION.ar.md?raw";
import "./InformationPage.css";

const pages = {
  terms: {
    draft: true,
    en: { source: terms, label: "Terms of Service", description: "The terms for using Saflal." },
    ar: { source: termsArabic, label: "شروط الخدمة", description: "شروط استخدام سفلال." },
  },
  privacy: {
    draft: true,
    en: { source: privacy, label: "Privacy Policy", description: "How Saflal handles your information." },
    ar: { source: privacyArabic, label: "سياسة الخصوصية", description: "كيف يتعامل سفلال مع معلوماتك." },
  },
  about: {
    en: { source: about, label: "About Saflal", description: "Good conversations. Closer connections." },
    ar: { source: aboutArabic, label: "عن سفلال", description: "محادثات تجمعنا. وتواصل يقرّبنا." },
  },
  deletion: {
    draft: true,
    en: { source: deletion, label: "Account deletion", description: "Understand your choices and what deletion removes." },
    ar: { source: deletionArabic, label: "حذف الحساب", description: "تعرّف على خياراتك وما يزيله حذف الحساب." },
  },
};
const interfaceCopy = {
  en: {
    brand: "Saflal", back: "Back to Saflal", contents: "On this page", table: "Policy details",
    aboutEyebrow: "YOUR PEOPLE. ONE PLACE.", policyEyebrow: "SAFLAL · INFORMATION & POLICIES",
    draft: "Review draft · Some details still need confirmation before publication.",
    website: "Saflal website", privacy: "Privacy Policy", terms: "Terms of Service", deletion: "Account deletion",
  },
  ar: {
    brand: "سفلال", back: "العودة إلى سفلال", contents: "في هذه الصفحة", table: "تفاصيل السياسة",
    aboutEyebrow: "أصدقاؤك. في مكان واحد.", policyEyebrow: "سفلال · المعلومات والسياسات",
    draft: "مسودة للمراجعة · بعض التفاصيل لا تزال بحاجة إلى تأكيد قبل النشر.",
    website: "موقع سفلال", privacy: "سياسة الخصوصية", terms: "شروط الخدمة", deletion: "حذف الحساب",
  },
};
const documentLinks = {
  "PRIVACY_POLICY.md": "/privacy",
  "TERMS_OF_SERVICE.md": "/terms",
  "ABOUT_SAFLAL.md": "/about",
  "ACCOUNT_DELETION.md": "/delete-account",
  "PRIVACY_POLICY.ar.md": "/privacy",
  "TERMS_OF_SERVICE.ar.md": "/terms",
  "ABOUT_SAFLAL.ar.md": "/about",
  "ACCOUNT_DELETION.ar.md": "/delete-account",
};

// Render only the small Markdown subset used by our reviewed documents. React
// escapes all text; document content cannot inject HTML or executable links.
function Inline({ text }) {
  const pieces = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|\+\d[\d ]{6,}\d)/g);
  return pieces.map((piece, index) => {
    if (piece.startsWith("**") && piece.endsWith("**")) return <strong key={index}><Inline text={piece.slice(2, -2)} /></strong>;
    if (piece.startsWith("`") && piece.endsWith("`")) return <code dir="ltr" key={index}>{piece.slice(1, -1)}</code>;
    if (/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(piece) || /^\+\d[\d ]{6,}\d$/.test(piece)) return <bdi key={index} dir="ltr">{piece}</bdi>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece);
    if (link) {
      const target = documentLinks[link[2]] || link[2];
      if (target.startsWith("/") && !target.startsWith("//")) return <Link key={index} to={target}>{link[1]}</Link>;
      if (/^(https:\/\/|mailto:|tel:)/.test(target)) return <a key={index} href={target}>{link[1]}</a>;
      return <Fragment key={index}>{link[1]}</Fragment>;
    }
    return <Fragment key={index}>{piece}</Fragment>;
  });
}

function documentBody(source, ui) {
  // Exclude internal reviewer notes from the rendered copy. Unresolved fields
  // within the policy itself remain visible because this is a review draft.
  return source.split(/\r?\n---\s*\r?\n/)[0]
    .replace(/^# .+\r?\n/, "")
    .replace(/\[(?:OFFICIAL WEBSITE URL|رابط الموقع الرسمي)\]/g, `[${ui.website}](/)`)
    .replace(/\[(?:PUBLIC PRIVACY POLICY URL|رابط سياسة الخصوصية المعلن)\]/g, `[${ui.privacy}](/privacy)`)
    .replace(/\[(?:PUBLIC TERMS URL|رابط الشروط المعلن)\]/g, `[${ui.terms}](/terms)`)
    .replace(/\[(?:PUBLIC ACCOUNT-DELETION PAGE URL|رابط صفحة حذف الحساب المعلنة)\]/g, `[${ui.deletion}](/delete-account)`)
    .trim();
}

function blocksFor(source, ui) {
  let headingIndex = 0;
  return documentBody(source, ui).split(/\r?\n\s*\r?\n/).map(block => {
    const heading = /^(#{2,3}) (.+)$/.exec(block);
    if (heading) return { type: "heading", level: heading[1].length, text: heading[2], id: `section-${++headingIndex}` };
    const lines = block.split(/\r?\n/);
    if (lines.every(line => line.startsWith("|"))) return { type: "table", lines };
    if (lines.every(line => line.startsWith("- "))) return { type: "list", lines };
    return { type: "paragraph", lines };
  });
}

function DocumentBlock({ block, ui }) {
  if (block.type === "heading") {
    const Heading = block.level === 2 ? "h2" : "h3";
    return <Heading id={block.id}><Inline text={block.text} /></Heading>;
  }
  if (block.type === "list") return <ul>{block.lines.map((line, index) => <li key={index}><Inline text={line.slice(2)} /></li>)}</ul>;
  if (block.type === "table") {
    const rows = block.lines.map(line => line.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim()));
    return <div className="information-table" role="region" aria-label={ui.table} tabIndex={0}>
      <table>
        <thead><tr>{rows[0].map((cell, index) => <th scope="col" key={index}><Inline text={cell} /></th>)}</tr></thead>
        <tbody>{rows.slice(2).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}><Inline text={cell} /></td>)}</tr>)}</tbody>
      </table>
    </div>;
  }
  const text = block.lines.join(" ");
  return <p className={text.startsWith("[") && text.endsWith("]") ? "information-pending" : undefined}>
    {block.lines.map((line, index) => <Fragment key={index}>
      <Inline text={line.trimEnd()} />
      {index < block.lines.length - 1 && (line.endsWith("  ") ? <br /> : " ")}
    </Fragment>)}
  </p>;
}

export default function InformationPage({ page, text, language }) {
  const locale = language === "ar" ? "ar" : "en";
  const ui = interfaceCopy[locale];
  const config = pages[page];
  const document = config[locale];
  const blocks = blocksFor(document.source, ui);
  const headings = blocks.filter(block => block.type === "heading" && block.level === 2);
  const BackArrow = locale === "ar" ? ArrowRight : ArrowLeft;
  const LinkArrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  useEffect(() => {
    window.document.title = `${document.label} — ${ui.brand}`;
    window.document.querySelector('meta[name="description"]')?.setAttribute("content", document.description);
  }, [document, ui]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [document]);

  return <>
    <main id="main-content" className="information-page page-container" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} tabIndex={-1}>
      <header className="information-header">
        <Link to="/" className="information-back"><BackArrow size={16} aria-hidden="true" /> {ui.back}</Link>
        <p className="eyebrow">{page === "about" ? ui.aboutEyebrow : ui.policyEyebrow}</p>
        <h1>{document.label}</h1>
        <p className="information-description">{document.description}</p>
        {config.draft && <p className="information-draft"><span aria-hidden="true" /> {ui.draft}</p>}
      </header>
      <div className={`information-layout${headings.length ? " has-contents" : ""}`}>
        {headings.length > 0 && <aside className="information-contents" aria-label={ui.contents}>
          <p>{ui.contents}</p>
          <nav>{headings.map(heading => <a key={heading.id} href={`#${heading.id}`}>{heading.text}</a>)}</nav>
        </aside>}
        <article className={`information-document${page === "about" ? " information-about" : ""}`}>
          {blocks.map((block, index) => <DocumentBlock key={index} block={block} ui={ui} />)}
        </article>
      </div>
    </main>
    <footer className="information-footer page-container">
      <span>{ui.brand}</span>
      <nav aria-label={text.footer.navigation}>
        <Link to="/privacy">{text.nav.privacy}</Link>
        <Link to="/terms">{text.nav.terms}</Link>
        <Link to="/about">{text.nav.about}</Link>
        <Link to="/delete-account">{ui.deletion}<LinkArrow size={13} aria-hidden="true" /></Link>
      </nav>
    </footer>
  </>;
}
