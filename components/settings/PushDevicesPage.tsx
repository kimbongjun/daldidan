"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  LoaderCircle,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";

const ACCENT = "#7C3AED";

type PushDevice = {
  id: string;
  device_type: "web" | "ios" | "android";
  user_agent: string | null;
  notify_new_post: boolean;
  notify_comment: boolean;
  created_at: string;
  user_id: string | null;
};

const DEVICE_TYPE_LABELS: Record<PushDevice["device_type"], string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
};

const DEVICE_TYPE_COLORS: Record<PushDevice["device_type"], string> = {
  web: "#8B8BA7",
  ios: "#F59E0B",
  android: "#10B981",
};

type DeviceInfo = {
  deviceName: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
};

function parseDeviceInfo(ua: string | null): DeviceInfo {
  if (!ua) return { deviceName: "알 수 없는 기기", os: "", osVersion: "", browser: "", browserVersion: "" };

  let deviceName = "알 수 없는 기기";
  let os = "";
  let osVersion = "";
  let browser = "";
  let browserVersion = "";

  if (ua.includes("iPhone")) {
    deviceName = "iPhone";
    os = "iOS";
    const m = ua.match(/iPhone OS ([\d_]+)/);
    if (m) osVersion = m[1].replace(/_/g, ".");
  } else if (ua.includes("iPad")) {
    deviceName = "iPad";
    os = "iPadOS";
    const m = ua.match(/CPU OS ([\d_]+)/);
    if (m) osVersion = m[1].replace(/_/g, ".");
  } else if (ua.includes("Android")) {
    os = "Android";
    const vm = ua.match(/Android ([\d.]+)/);
    if (vm) osVersion = vm[1];
    const mm = ua.match(/Android [\d.]+;\s*([^)]+)\)/);
    deviceName = mm ? mm[1].trim() : "Android 기기";
  } else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) {
    deviceName = "Mac";
    os = "macOS";
    const m = ua.match(/Mac OS X ([\d_.]+)/);
    if (m) osVersion = m[1].replace(/_/g, ".");
  } else if (ua.includes("Windows NT")) {
    deviceName = "Windows PC";
    os = "Windows";
    const m = ua.match(/Windows NT ([\d.]+)/);
    if (m) {
      const v = parseFloat(m[1]);
      osVersion = v >= 10.0 ? "10/11" : v === 6.3 ? "8.1" : v === 6.2 ? "8" : v === 6.1 ? "7" : m[1];
    }
  } else if (ua.includes("Linux")) {
    deviceName = "Linux 기기";
    os = "Linux";
  }

  const edgeM = ua.match(/Edg\/([\d.]+)/);
  const ffM = ua.match(/Firefox\/([\d.]+)/);
  const crM = ua.match(/Chrome\/([\d.]+)/);
  const safM = ua.match(/Version\/([\d.]+).*Safari/);

  if (edgeM) {
    browser = "Edge"; browserVersion = edgeM[1].split(".")[0];
  } else if (ffM) {
    browser = "Firefox"; browserVersion = ffM[1].split(".")[0];
  } else if (crM) {
    browser = "Chrome"; browserVersion = crM[1].split(".")[0];
  } else if (safM) {
    browser = "Safari"; browserVersion = safM[1].split(".")[0];
  } else if (ua.includes("Safari")) {
    browser = "Safari";
    const sv = ua.match(/Safari\/([\d.]+)/);
    if (sv) browserVersion = sv[1].split(".")[0];
  }

  return { deviceName, os, osVersion, browser, browserVersion };
}

function DeviceIcon({ type }: { type: PushDevice["device_type"] }) {
  const color = DEVICE_TYPE_COLORS[type];
  if (type === "web") return <Globe size={18} style={{ color }} />;
  return <Smartphone size={18} style={{ color }} />;
}

function DeviceCard({
  device,
  onDelete,
}: {
  device: PushDevice;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const typeColor = DEVICE_TYPE_COLORS[device.device_type];
  const typeLabel = DEVICE_TYPE_LABELS[device.device_type];
  const info = parseDeviceInfo(device.user_agent);
  const registeredAt = new Date(device.created_at).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const handleDelete = async () => {
    if (!confirm("이 디바이스를 목록에서 삭제할까요?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/push/devices/${device.id}`, { method: "DELETE" });
      onDelete(device.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
    >
      {/* 아이콘 */}
      <div
        className="shrink-0 flex items-center justify-center rounded-xl"
        style={{
          width: 40,
          height: 40,
          background: `${typeColor}18`,
          border: `1px solid ${typeColor}33`,
        }}
      >
        <DeviceIcon type={device.device_type} />
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: `${typeColor}20`, color: typeColor }}
          >
            {typeLabel}
          </span>
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {info.deviceName}
          </span>
        </div>

        {(info.os || info.browser) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {info.os && (
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                {info.os}{info.osVersion ? ` ${info.osVersion}` : ""}
              </span>
            )}
            {info.browser && (
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                {info.browser}{info.browserVersion ? ` ${info.browserVersion}` : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {device.notify_new_post && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{ background: `${ACCENT}18`, color: ACCENT }}
            >
              새 글
            </span>
          )}
          {device.notify_comment && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{ background: "#06B6D418", color: "#06B6D4" }}
            >
              댓글
            </span>
          )}
          {!device.notify_new_post && !device.notify_comment && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
            >
              알림 없음
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {registeredAt}
          </span>
        </div>
      </div>

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 p-1.5 rounded-lg opacity-50 hover:opacity-100 transition-opacity disabled:opacity-20"
        style={{ color: "#F43F5E" }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function PushDevicesPage() {
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/push/devices");
      if (!res.ok) return;
      const json = (await res.json()) as { devices: PushDevice[]; total: number };
      setDevices(json.devices);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const handleDelete = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setTotal((prev) => prev - 1);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="pressable p-2 rounded-xl"
          style={{
            color: "var(--text-muted)",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-xl font-black flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <Smartphone size={18} style={{ color: ACCENT }} />
            알림 허용 디바이스
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            푸시 구독 중인 기기 목록 · 삭제 관리
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDevices}
          disabled={loading}
          className="p-2 rounded-xl pressable disabled:opacity-50"
          style={{
            color: "var(--text-muted)",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 총 디바이스 수 */}
      {!loading && (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          총 {total.toLocaleString()}개
        </p>
      )}

      {/* 디바이스 목록 */}
      <div className="bento-card p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderCircle
              size={20}
              className="animate-spin"
              style={{ color: ACCENT }}
            />
          </div>
        ) : devices.length === 0 ? (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--text-muted)" }}
          >
            등록된 디바이스가 없습니다.
          </p>
        ) : (
          devices.map((device) => (
            <DeviceCard key={device.id} device={device} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
