import { Node, mergeAttributes } from "@tiptap/core";

export function parseNaverMapEmbedUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // iframe 코드에서 src 추출 (<iframe ... src="https://..." ...>)
  const iframeSrcMatch = value.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    return parseNaverMapEmbedUrl(iframeSrcMatch[1]);
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "naver.me") {
      return value;
    }

    if (host === "map.naver.com") {
      // /p/entry/place/ID (신규 URL 포맷)
      const placeMatchP = url.pathname.match(/\/p\/entry\/place\/(\d+)/);
      if (placeMatchP?.[1]) {
        return `https://map.naver.com/p/entry/place/${placeMatchP[1]}`;
      }

      // /v5/entry/place/ID (구 URL 포맷)
      const placeMatchV5 = url.pathname.match(/\/(?:v5\/)?entry\/place\/(\d+)/);
      if (placeMatchV5?.[1]) {
        return `https://map.naver.com/p/entry/place/${placeMatchV5[1]}`;
      }

      const searchMatch = url.pathname.match(/\/(?:v5\/)?search\/([^/?]+)/);
      if (searchMatch?.[1]) {
        return `https://map.naver.com/p/search/${decodeURIComponent(searchMatch[1])}`;
      }

      // 그 외 map.naver.com URL은 그대로 반환
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
