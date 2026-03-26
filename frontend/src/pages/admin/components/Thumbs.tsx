import React from "react";
import { cx } from "../utils/ui";

type ThumbProps = {
  src?: string | null;
  alt?: string;
  className?: string;
};

function EmptyThumb({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400",
        className
      )}
    >
      No image
    </div>
  );
}

export function RowThumb({
  src,
  alt = "Image",
  className,
}: ThumbProps) {
  if (!src) {
    return <EmptyThumb className={cx("h-12 w-12", className)} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cx(
        "h-12 w-12 rounded-xl border border-slate-200 bg-white object-cover",
        className
      )}
    />
  );
}

export function MiniThumb({
  src,
  alt = "Image",
  className,
}: ThumbProps) {
  if (!src) {
    return <EmptyThumb className={cx("h-8 w-8", className)} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cx(
        "h-8 w-8 rounded-lg border border-slate-200 bg-white object-cover",
        className
      )}
    />
  );
}