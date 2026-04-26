import { Node, mergeAttributes } from "@tiptap/core";

export function parseNaverMapEmbedUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "naver.me") {
      return value;
    }

    if (host === "map.naver.com") {
      const placeMatch = url.pathname.match(/\/entry\/place\/(\d+)/);
      if (placeMatch?.[1]) {
        return `https://map.naver.com/v5/entry/place/${placeMatch[1]}?c=15.00,0,0,0,dh`;
      }

      const searchMatch = url.pathname.match(/\/search\/([^/?]+)/);
      if (searchMatch?.[1]) {
        return `https://map.naver.com/v5/search/${searchMatch[1]}`;
      }

      return value;
    }
  } catch {
    return null;
  }

  return null;
}

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
          title: HTMLAttributes.title || (kind === "map" ? "네이버 지도" : "YouTube video"),
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
