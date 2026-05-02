import * as React from "react";

import { cn } from "@flixlix-cards/cn";

type DocsVideoProps = {
  /** Path under public/videos (no extension) or full URL. */
  src: string;
  /** Optional poster image — same convention as src. */
  poster?: string;
  /** Whether to autoplay (loops + muted automatically). Defaults to true. */
  autoPlay?: boolean;
  className?: string;
  /** Caption shown below the video. */
  caption?: React.ReactNode;
};

function resolveSrc(src: string, ext: string): string {
  if (/^https?:\/\//.test(src)) return src;
  if (/\.[a-z0-9]+$/i.test(src)) return src;
  return `/videos/${src}.${ext}`;
}

function resolvePoster(poster: string): string {
  if (/^https?:\/\//.test(poster)) return poster;
  if (/\.[a-z0-9]+$/i.test(poster)) return poster;
  return `/videos/${poster}.jpg`;
}

export function DocsVideo({ src, poster, autoPlay = true, className, caption }: DocsVideoProps) {
  const isExplicitFile = /^https?:\/\//.test(src) || /\.[a-z0-9]+$/i.test(src);
  const sources = isExplicitFile
    ? [{ src, type: undefined }]
    : [
        { src: resolveSrc(src, "webm"), type: "video/webm" },
        { src: resolveSrc(src, "mp4"), type: "video/mp4" },
      ];

  return (
    <figure className={cn("my-4", className)}>
      <video
        controls
        muted={autoPlay}
        autoPlay={autoPlay}
        loop={autoPlay}
        playsInline
        preload="metadata"
        poster={poster ? resolvePoster(poster) : undefined}
        className="bg-muted w-full rounded-md border"
      >
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
        Your browser does not support the video tag.
      </video>
      {caption ? (
        <figcaption className="text-muted-foreground mt-2 text-center text-xs">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
