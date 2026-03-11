import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;
  const headLen = Math.ceil(maxLength * 0.6);
  const tailLen = maxLength - headLen - 3;
  return url.slice(0, headLen) + '...' + url.slice(-tailLen);
}

export function LinkifyText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
            title={part}
          >
            {truncateUrl(part)}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
