import { Node, mergeAttributes } from "@tiptap/core";

export const BLOG_STREAM_VIDEO_ATTR = "data-stream-video";

export const StreamVideoBlock = Node.create({
  name: "streamVideoBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      uid: {
        default: "",
      },
      title: {
        default: "",
      },
      posterTime: {
        default: "1s",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[${BLOG_STREAM_VIDEO_ATTR}="true"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        [BLOG_STREAM_VIDEO_ATTR]: "true",
        "data-video-uid": HTMLAttributes.uid,
        "data-video-title": HTMLAttributes.title || "",
        "data-poster-time": HTMLAttributes.posterTime || "1s",
        class: "blog-stream-video",
      }),
      [
        "div",
        { class: "blog-stream-video-shell" },
        [
          "div",
          { class: "blog-stream-video-badge" },
          "Cloudflare Stream",
        ],
        [
          "div",
          { class: "blog-stream-video-copy" },
          [
            "strong",
            {},
            HTMLAttributes.title || "업로드한 동영상",
          ],
          [
            "span",
            {},
            "스트리밍 플레이어가 여기에 렌더링됩니다.",
          ],
        ],
      ],
    ];
  },
});
