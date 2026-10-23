import { ArrowDownToLine } from "lucide-react";
import { getApkUrl } from "../download.js";
export default function DownloadButton({ text, inverse = false, id }) {
  const url = getApkUrl(import.meta.env.VITE_APK_DOWNLOAD_URL);
  const className = `download-button${inverse ? " download-inverse" : ""}`;
  return (
    <div className="download-group">
      {url ? (
        <a
          className={className}
          href={url}
          download={url.startsWith("/") ? "Saflal.apk" : undefined}
        >
          <ArrowDownToLine size={19} strokeWidth={1.8} aria-hidden="true" />
          {text.ready}
        </a>
      ) : (
        <button
          type="button"
          className={className}
          disabled
          aria-describedby={id}
        >
          <ArrowDownToLine size={19} strokeWidth={1.8} aria-hidden="true" />
          {text.soon}
        </button>
      )}
      <p className="download-note" id={id}>
        {url ? text.availableNote : text.note}
      </p>
    </div>
  );
}
