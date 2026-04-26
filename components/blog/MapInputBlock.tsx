// 지도 삽입 기능이 제거되어 이 파일은 더 이상 사용되지 않습니다.
import { Node } from "@tiptap/core";

export const MapInputBlock = Node.create({
  name: "mapInputBlock",
  group: "block",
  atom: true,
  addAttributes() { return {}; },
  parseHTML() { return []; },
  renderHTML() { return ["div", {}]; },
});
