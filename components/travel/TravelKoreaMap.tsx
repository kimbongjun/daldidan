"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature, mesh } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { TravelPlace, KoreaRegion } from "@/lib/travel-shared";
import { CODE_TO_PROVINCE, PROVINCE_TO_REGION } from "@/lib/travel-shared";

interface MunicipalityProperties {
  name: string;
  name_eng: string;
  code: string;
  base_year: string;
}

type MunicipalityCollection = FeatureCollection<Geometry, MunicipalityProperties>;
type MunicipalityTopology = Topology<{
  skorea_municipalities_2018_geo: GeometryCollection<MunicipalityProperties>;
}>;

interface TravelKoreaMapProps {
  places: TravelPlace[];
  onPinClick: (place: TravelPlace) => void;
  highlightedId?: string | null;
  selectedRegions?: KoreaRegion[];
  activeProvinces?: string[];
  onLoad?: () => void;
}

interface MapSize {
  width: number;
  height: number;
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
}

const KOREA_MUNICIPALITIES_TOPO_URL = "/data/korea-municipalities-topo.json";
const DEFAULT_SIZE: MapSize = { width: 600, height: 500 };
const GRAY_FILL = "#374151";

const REGION_COLORS: Record<KoreaRegion, string> = {
  "서울": "#f59e0b",
  "경기/인천": "#60a5fa",
  "강원": "#34d399",
  "충청": "#f87171",
  "전라": "#a78bfa",
  "경상": "#fb923c",
  "제주": "#e879f9",
};

const PROVINCE_LABEL_COORDS: Array<{ name: string; short: string; lat: number; lng: number }> = [
  { name: "서울특별시", short: "서울", lat: 37.5665, lng: 126.978 },
  { name: "부산광역시", short: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "대구광역시", short: "대구", lat: 35.8714, lng: 128.6014 },
  { name: "인천광역시", short: "인천", lat: 37.4563, lng: 126.4 },
  { name: "광주광역시", short: "광주", lat: 35.1595, lng: 126.8526 },
  { name: "대전광역시", short: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "울산광역시", short: "울산", lat: 35.5384, lng: 129.3114 },
  { name: "세종특별자치시", short: "세종", lat: 36.48, lng: 127.289 },
  { name: "경기도", short: "경기", lat: 37.4138, lng: 127.5183 },
  { name: "강원특별자치도", short: "강원", lat: 37.8813, lng: 128.2 },
  { name: "충청북도", short: "충북", lat: 36.8, lng: 127.8 },
  { name: "충청남도", short: "충남", lat: 36.5, lng: 126.8 },
  { name: "전북특별자치도", short: "전북", lat: 35.7175, lng: 127.1531 },
  { name: "전라남도", short: "전남", lat: 34.8, lng: 126.9 },
  { name: "경상북도", short: "경북", lat: 36.5, lng: 128.8 },
  { name: "경상남도", short: "경남", lat: 35.4, lng: 128.2 },
  { name: "제주특별자치도", short: "제주", lat: 33.4996, lng: 126.5312 },
];

let topologyCache: Promise<MunicipalityTopology> | null = null;

function loadKoreaTopology() {
  topologyCache ??= fetch(KOREA_MUNICIPALITIES_TOPO_URL).then((response) => {
    if (!response.ok) throw new Error(`TopoJSON fetch failed: ${response.status}`);
    return response.json() as Promise<MunicipalityTopology>;
  });
  return topologyCache;
}

function getProvince(code: string) {
  return CODE_TO_PROVINCE[code.slice(0, 2)] ?? null;
}

function getRegion(code: string) {
  const province = getProvince(code);
  return province ? PROVINCE_TO_REGION[province] : null;
}

function getAreaFill(
  code: string,
  activeProvinces?: string[],
  selectedRegions?: KoreaRegion[],
) {
  const province = getProvince(code);
  const region = getRegion(code);
  if (!province || !region) return GRAY_FILL;

  if (selectedRegions && selectedRegions.length > 0) {
    return selectedRegions.includes(region) ? REGION_COLORS[region] : GRAY_FILL;
  }

  if (activeProvinces && activeProvinces.length > 0) {
    return activeProvinces.includes(province) ? REGION_COLORS[region] : GRAY_FILL;
  }

  return REGION_COLORS[region];
}

function getAreaOpacity(
  code: string,
  activeProvinces?: string[],
  selectedRegions?: KoreaRegion[],
) {
  const province = getProvince(code);
  const region = getRegion(code);

  if (selectedRegions && selectedRegions.length > 0) {
    return region && selectedRegions.includes(region) ? 0.95 : 0.2;
  }

  if (activeProvinces && activeProvinces.length > 0) {
    return province && activeProvinces.includes(province) ? 0.85 : 0.45;
  }

  return 0.85;
}

function hasActivePlace(
  code: string,
  activeProvinces?: string[],
  selectedRegions?: KoreaRegion[],
) {
  const province = getProvince(code);
  const region = getRegion(code);

  if (selectedRegions && selectedRegions.length > 0) {
    return Boolean(region && selectedRegions.includes(region));
  }

  if (activeProvinces && activeProvinces.length > 0) {
    return Boolean(province && activeProvinces.includes(province));
  }

  return true;
}

export default function TravelKoreaMap({
  places,
  onPinClick,
  highlightedId,
  selectedRegions,
  activeProvinces,
  onLoad,
}: TravelKoreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [topology, setTopology] = useState<MunicipalityTopology | null>(null);
  const [size, setSize] = useState<MapSize>(DEFAULT_SIZE);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadKoreaTopology()
      .then((data) => {
        if (cancelled) return;
        setTopology(data);
        onLoad?.();
      })
      .catch(() => {
        if (!cancelled) onLoad?.();
      });

    return () => {
      cancelled = true;
    };
  }, [onLoad]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const width = container.clientWidth || DEFAULT_SIZE.width;
      const height = container.clientHeight || DEFAULT_SIZE.height;
      setSize((current) => (
        current.width === width && current.height === height
          ? current
          : { width, height }
      ));
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 12])
      .filter((event: Event) => {
        // pin circle 위의 mousedown은 zoom 제스처를 시작하지 않음.
        // 이를 허용하면 d3-drag의 click.drag 핸들러가 window capture로 등록되어
        // stopImmediatePropagation()으로 React onClick을 차단한다.
        if (event.type === "mousedown" && (event.target as SVGElement).tagName === "circle") {
          return false;
        }
        const e = event as MouseEvent;
        return (!e.ctrlKey || event.type === "wheel") && !e.button;
      })
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    const selection = d3.select(svg);
    selection.call(zoom);

    return () => {
      selection.on(".zoom", null);
    };
  }, []);

  const municipalities = useMemo(() => {
    if (!topology) return null;
    return feature(
      topology,
      topology.objects.skorea_municipalities_2018_geo,
    ) as MunicipalityCollection;
  }, [topology]);

  const borders = useMemo(() => {
    if (!topology) return { municipality: null, province: null };

    const municipality = mesh(
      topology,
      topology.objects.skorea_municipalities_2018_geo,
      (a, b) => a !== b,
    );

    const province = mesh(
      topology,
      topology.objects.skorea_municipalities_2018_geo,
      (a, b) => {
        if (a === b) return true;
        const ap = (a as unknown as { properties: MunicipalityProperties }).properties.code.slice(0, 2);
        const bp = (b as unknown as { properties: MunicipalityProperties }).properties.code.slice(0, 2);
        return ap !== bp;
      },
    );

    return { municipality, province };
  }, [topology]);

  const projection = useMemo(() => {
    if (!municipalities) return null;
    return d3.geoMercator().fitSize([size.width, size.height], municipalities);
  }, [municipalities, size.height, size.width]);

  const pathGen = useMemo(() => {
    if (!projection) return null;
    return d3.geoPath(projection);
  }, [projection]);

  const areaPaths = useMemo(() => {
    if (!municipalities || !pathGen) return [];

    return municipalities.features.map((area) => ({
      area,
      d: pathGen(area) ?? "",
      fill: getAreaFill(area.properties.code, activeProvinces, selectedRegions),
      opacity: getAreaOpacity(area.properties.code, activeProvinces, selectedRegions),
      isActive: hasActivePlace(area.properties.code, activeProvinces, selectedRegions),
      province: getProvince(area.properties.code),
      region: getRegion(area.properties.code),
    }));
  }, [activeProvinces, municipalities, pathGen, selectedRegions]);

  const borderPaths = useMemo(() => {
    if (!pathGen) return { municipality: "", province: "" };
    return {
      municipality: borders.municipality ? pathGen(borders.municipality) ?? "" : "",
      province: borders.province ? pathGen(borders.province) ?? "" : "",
    };
  }, [borders.municipality, borders.province, pathGen]);

  const labels = useMemo(() => {
    if (!projection) return [];
    return PROVINCE_LABEL_COORDS.map((label) => {
      const point = projection([label.lng, label.lat]);
      if (!point) return null;
      return { ...label, x: point[0], y: point[1] };
    }).filter(Boolean) as Array<typeof PROVINCE_LABEL_COORDS[number] & { x: number; y: number }>;
  }, [projection]);

  const pins = useMemo(() => {
    if (!projection) return [];
    return places
      .map((place) => {
        const point = projection([place.lng, place.lat]);
        if (!point) return null;
        const region = place.province ? PROVINCE_TO_REGION[place.province] : null;

        return {
          place,
          x: point[0],
          y: point[1],
          fill: place.id === highlightedId
            ? "goldenrod"
            : region ? REGION_COLORS[region] : "#10b981",
          highlighted: place.id === highlightedId,
        };
      })
      .filter(Boolean) as Array<{
        place: TravelPlace;
        x: number;
        y: number;
        fill: string;
        highlighted: boolean;
      }>;
  }, [highlightedId, places, projection]);

  const handlePointerMove = useCallback((event: React.PointerEvent, title: string, subtitle?: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    setTooltip({
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
      title,
      subtitle,
    });
  }, []);

  const handleAreaClick = useCallback((province: string | null) => {
    if (!province) return;
    const matching = places.find((place) => place.province === province);
    if (matching) onPinClick(matching);
  }, [onPinClick, places]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 320, overflow: "hidden", position: "relative" }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label="국내 여행 지도"
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", background: "#0d1b2a" }}
        onPointerLeave={() => setTooltip(null)}
      >
        <rect width={size.width} height={size.height} fill="#0d1b2a" />

        {municipalities && (
          <g transform={transform.toString()}>
            <g className="municipalities">
              {areaPaths.map(({ area, d, fill, opacity, isActive, province, region }) => (
                <path
                  key={area.properties.code}
                  d={d}
                  fill={fill}
                  opacity={opacity}
                  stroke="none"
                  role="button"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={area.properties.name}
                  style={{
                    cursor: isActive ? "pointer" : "default",
                    outline: "none",
                    transition: "opacity 140ms ease, fill 140ms ease",
                  }}
                  onClick={() => handleAreaClick(province)}
                  onKeyDown={(event) => {
                    if (!isActive) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleAreaClick(province);
                    }
                  }}
                  onPointerMove={(event) => handlePointerMove(
                    event,
                    area.properties.name,
                    province ? `${province}${region ? ` · ${region}` : ""}` : undefined,
                  )}
                  onPointerLeave={() => setTooltip(null)}
                />
              ))}
            </g>

            {borderPaths.municipality && (
              <path
                d={borderPaths.municipality}
                fill="none"
                stroke="#1e293b"
                strokeWidth={0.3}
                pointerEvents="none"
              />
            )}
            {borderPaths.province && (
              <path
                d={borderPaths.province}
                fill="none"
                stroke="#1e293b"
                strokeWidth={1.2}
                pointerEvents="none"
              />
            )}

            <g className="province-labels" pointerEvents="none">
              {labels.map((label) => (
                <text
                  key={label.name}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    fill: "rgba(255,255,255,0.8)",
                    userSelect: "none",
                  }}
                >
                  {label.short}
                </text>
              ))}
            </g>

            <g className="pins">
              {pins.map(({ place, x, y, fill, highlighted }) => (
                <circle
                  key={place.id}
                  cx={x}
                  cy={y}
                  r={highlighted ? 8.5 : 7}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={highlighted ? 2.5 : 1.5}
                  role="button"
                  tabIndex={0}
                  aria-label={`${place.city}${place.province ? ` (${place.province})` : ""}`}
                  style={{
                    cursor: "pointer",
                    filter: highlighted ? "drop-shadow(0 0 8px rgba(245,158,11,0.85))" : undefined,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPinClick(place);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onPinClick(place);
                    }
                  }}
                  onPointerMove={(event) => handlePointerMove(
                    event,
                    place.city,
                    place.province ? `${place.province} · ${place.travel_date.slice(0, 7)}` : place.travel_date.slice(0, 7),
                  )}
                  onPointerLeave={() => setTooltip(null)}
                />
              ))}
            </g>
          </g>
        )}
      </svg>

      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: Math.min(tooltip.x + 12, Math.max(12, size.width - 156)),
            top: tooltip.y + 12,
            pointerEvents: "none",
            border: "1px solid rgba(148,163,184,0.45)",
            borderRadius: 8,
            padding: "0.42rem 0.55rem",
            background: "rgba(15,23,42,0.9)",
            color: "#f8fafc",
            boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
            fontSize: "0.76rem",
            fontWeight: 700,
            lineHeight: 1.35,
            backdropFilter: "blur(8px)",
            zIndex: 2,
          }}
        >
          <div>{tooltip.title}</div>
          {tooltip.subtitle && (
            <div style={{ color: "rgba(226,232,240,0.72)", fontSize: "0.68rem", fontWeight: 600 }}>
              {tooltip.subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
