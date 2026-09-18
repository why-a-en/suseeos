"use client";

import { useRef, useState } from "react";
import { getProductImageUploadUrlAction } from "@/app/(dashboard)/products/actions";
import { useFieldControlId } from "@/components/ui/field";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fieldShellWrapper } from "@/components/ui/field-shell";

type UploadedImage = {
  id: string;
  previewUrl: string;
  publicUrl: string;
  status: "uploading" | "done" | "error";
};

type ExistingImage = { id: string; url: string };

/**
 * Uploads straight to R2 from the browser (src/lib/storage.ts) — the
 * server only ever hands out a short-lived signed URL, never touches the
 * image bytes. Renders a hidden input per successfully uploaded image
 * (`name="imageUrls"`, repeatable) so the surrounding form picks them up
 * as a plain multi-value field on submit, no client-side form-state
 * plumbing needed beyond this component.
 *
 * Doubles as the edit-form widget: pass `initialImages` (the product's
 * existing rows) and this renders them in the same grid as anything just
 * uploaded. Removing one — new or already-saved — doesn't call the server;
 * it drops the preview and, for an existing image, adds a hidden
 * `removedImageIds` entry so the surrounding action can delete the row on
 * submit. Nothing is destroyed until the form actually saves.
 *
 * Every tile — uploading, done, or failed — carries the same small round
 * "×" in its corner, the one gap the previous version had: a failed upload
 * used to sit there forever with no way to clear it short of reloading the
 * page, and a *successful* one couldn't be reconsidered at all short of
 * emptying the whole field. Uploading and done tiles use the shared chip
 * treatment; the eventual choice for size and press feel here (the small
 * circular target: `active:scale-90`) matches the icon-target rule the rest
 * of the kit follows.
 *
 * The picker itself sits in the same field shell as Input and Textarea
 * (field-shell.ts) rather than floating as a bare button on the page: in a
 * form where every other row is a sunken bordered box with a leading glyph,
 * an unbordered button was the one place the rhythm broke.
 *
 * The trigger is a real `Button` (secondary, sm), not the native
 * `::file-selector-button` styled through Tailwind's `file:` variant — that
 * was the previous version, and it never sat right: the pseudo-element's own
 * box model stretches to the host `<input>`'s full height regardless of an
 * explicit `file:h-8`, so the button touched the shell's top and bottom edges
 * with no breathing room while "No file chosen" sat baseline-aligned beside
 * it — two controls in the same row, each centered by a different rule. A
 * real Button is centered by the shell's own `items-center`, the same as the
 * icon beside it, so it can't drift from the rest of the kit's buttons no
 * matter how a given browser boxes its file-picker chrome. The actual
 * `<input type="file">` is still here and still does the picking — just
 * visually hidden and triggered by the Button's `onClick`, with
 * `tabIndex={-1}`/`aria-hidden` so it's not a second, invisible stop in the
 * tab order next to the Button that already carries the accessible name
 * (`id={controlId}`, so the "Images" field label focuses the Button, not the
 * hidden input — a labelled `<button>` is as labelable as an `<input>`).
 * "No file chosen" is dropped rather than reimplemented: it only ever
 * reflected the most recent native pick, never the cumulative set once photos
 * can be added over several passes, so the trailing count on the right (also
 * covering images already saved, on the edit form) is more honest than what
 * it replaces, and the thumbnail grid below is the real confirmation either
 * way.
 */
export function ImageUploadField({
  name = "imageUrls",
  removedFieldName = "removedImageIds",
  initialImages = [],
}: {
  name?: string;
  /** Hidden-input name carrying the ids of `initialImages` the agent removed. */
  removedFieldName?: string;
  /** Already-saved images, for the edit form — omitted entirely on create. */
  initialImages?: ExistingImage[];
}) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // Adopts the id its Field generated, so the "IMAGES" label actually points
  // at this control instead of dangling. Lives on the Button now, not the
  // hidden <input> — see the component doc comment.
  const controlId = useFieldControlId();

  const existing = initialImages.filter((img) => !removedIds.includes(img.id));
  const totalCount = existing.length + images.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;

    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, { id, previewUrl, publicUrl: "", status: "uploading" }]);

      try {
        const { uploadUrl, publicUrl } = await getProductImageUploadUrlAction(file.name, file.type);
        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, publicUrl, status: "done" } : img)));
      } catch {
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, status: "error" } : img)));
      }
    }
  }

  function removeNew(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  function removeExisting(id: string) {
    setRemovedIds((prev) => [...prev, id]);
  }

  return (
    <div className="grid gap-2">
      <div className={cn(fieldShellWrapper, "h-(--control-h-md) rounded-sm px-3")}>
        <span aria-hidden="true" className="shrink-0 text-text-faint">
          <Icon name="image" size={16} />
        </span>
        <Button
          id={controlId}
          type="button"
          variant="secondary"
          size="sm"
          icon="plus"
          // The Field's "Images" <label for> makes this focusable by label
          // click, which is the point — but a native <label> association
          // outranks a button's own text in accessible-name computation, so
          // without this override the name assistive tech announces would be
          // "Images" instead of what's actually printed on the button.
          aria-label="Add photos"
          onClick={() => inputRef.current?.click()}
        >
          Add photos
        </Button>
        <span className="ml-auto truncate font-ui text-small text-text-faint">
          {totalCount === 0 ? "No photos yet" : `${totalCount} photo${totalCount === 1 ? "" : "s"}`}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Lets the same file be picked again after being removed —
            // without this, re-selecting an already-cleared file silently
            // no-ops because the input's value hasn't changed.
            e.target.value = "";
          }}
        />
      </div>

      {(existing.length > 0 || images.length > 0) && (
        <ul className="flex list-none flex-wrap gap-2.5 p-0">
          {existing.map((img) => (
            <li key={img.id} className="relative size-20 overflow-hidden rounded-sm border border-line-hairline bg-surface-sunken">
              {/* Already-saved product photo, served from R2 by public URL —
                  a remote asset, so next/image would apply, but this tiny
                  fixed-size preview tile isn't worth the remote-pattern
                  config for what's already an optimized upload. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
              <RemoveTile onClick={() => removeExisting(img.id)} />
            </li>
          ))}

          {images.map((img) => (
            <li
              key={img.id}
              className={cn(
                "relative size-20 overflow-hidden rounded-sm border border-line-hairline bg-surface-sunken",
                img.status === "uploading" && "ds-working",
              )}
            >
              {/* Local blob: preview, not a remote/static asset — next/image
                  doesn't apply here, so a plain <img> is the right call. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="" className={cn("size-full object-cover", img.status !== "done" && "opacity-60")} />

              {img.status === "uploading" && <span className="sr-only">Uploading…</span>}

              {img.status === "error" && (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-danger-wash/85 text-danger"
                  title="Upload failed"
                >
                  <span aria-hidden="true" className="ds-hatch absolute inset-x-0 bottom-0 h-2" />
                  <Icon name="triangle-alert" size={16} />
                  <span className="sr-only">Upload failed</span>
                </span>
              )}

              <RemoveTile onClick={() => removeNew(img.id)} label={img.status === "error" ? "Dismiss" : "Remove image"} />

              {img.status === "done" && <input type="hidden" name={name} value={img.publicUrl} />}
            </li>
          ))}
        </ul>
      )}

      {removedIds.map((id) => (
        <input key={id} type="hidden" name={removedFieldName} value={id} />
      ))}
    </div>
  );
}

/** The small round "×" pinned to a tile's corner — same target on every
 *  status (uploading, done, failed) so removing a photo is always the same
 *  gesture, mid-upload or after. Sized and eased like the kit's other small
 *  circular controls (`active:scale-90`), not Button's own icon-target scale
 *  — this one has to sit half off the tile's edge, too small for Button's
 *  padding. */
function RemoveTile({ onClick, label = "Remove image" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "absolute top-1 right-1 flex size-5 items-center justify-center rounded-full",
        "border border-line-hairline bg-surface-page text-text-strong",
        "transition-transform duration-instant ease-standard active:scale-90",
      )}
    >
      <Icon name="x" size={12} />
    </button>
  );
}
