"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
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
      data-widget-sortable
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
        data-drag-handle
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 20,
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--text-muted)",
          padding: "4px 10px",
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          lineHeight: 1,
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
        title="드래그하여 위치 변경"
        aria-label="위젯 이동 핸들"
      >
        <GripHorizontal size={12} />
      </button>
      {children}
    </div>
  );
}
