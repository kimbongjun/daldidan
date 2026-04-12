import { Node, mergeAttributes } from "@tiptap/core";

export function parseYouTubeEmbedUrl(input: string) {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v")?.trim();
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      const match = url.pathname.match(/^\/embed\/([^/?]+)/);
      if (match?.[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }

      const shortMatch = url.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shortMatch?.[1]) {
        return `https://www.youtube.com/embed/${shortMatch[1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function createGoogleMapEmbedSrc(place: string) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  if (!key) return null;
  if (!place.trim()) return null;

  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(place.trim())}&language=ko`;
}

export const EmbedBlock = Node.create({
  name: "embedBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: "",
      },
      title: {
        default: "",
      },
      kind: {
        default: "embed",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed-block="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes.kind === "map" ? "map" : "youtube";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-embed-block": "true",
        "data-kind": kind,
        class: `blog-embed-block ${kind === "map" ? "blog-embed-map" : "blog-embed-youtube"}`,
      }),
      [
        "iframe",
        {
          src: HTMLAttributes.src,
          title: HTMLAttributes.title || (kind === "map" ? "Google Map" : "YouTube video"),
          loading: "lazy",
          allowfullscreen: "true",
          referrerpolicy: "no-referrer-when-downgrade",
          allow: kind === "youtube"
            ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            : "fullscreen",
        },
      ],
    ];
  },
});
