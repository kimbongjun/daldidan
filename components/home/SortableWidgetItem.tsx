"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  id: string;
  children: ReactNode;
  containerStyle?: CSSProperties;
}

export function SortableWidgetItem({ id, children, containerStyle }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...containerStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
      }}
    >
      <button
        {...attributes}
        {...listeners}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 20,
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--text-muted)",
          padding: "8px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          lineHeight: 1,
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        title="드래그하여 위치 변경"
        aria-label="위젯 이동 핸들"
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}
