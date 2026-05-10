"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import type { TravelPlace, KoreaRegion } from "@/lib/travel-shared";
import { PROVINCE_TO_REGION } from "@/lib/travel-shared";

interface ProvinceProperties {
  name: string;
  name_eng: string;
  code: string;
}

type KoreaTopology = Topology<{
  skorea_provinces_2018_geo: GeometryCollection<ProvinceProperties>;
}>;

interface TravelKoreaMapProps {
  places: TravelPlace[];
  onPinClick: (place: TravelPlace) => void;
  highlightedId?: string | null;
  selectedRegions?: KoreaRegion[];
  onLoad?: () => void;
}

const REGION_COLORS: Record<KoreaRegion, string> = {
  "서울": "#f59e0b",
  "경기/인천": "#60a5fa",
  "강원": "#34d399",
  "충청": "#f87171",
  "전라": "#a78bfa",
  "경상": "#fb923c",
  "제주": "#e879f9",
};

export default function TravelKoreaMap({
  places,
  onPinClick,
  highlightedId,
  selectedRegions,
  onLoad,
}: TravelKoreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathGenRef = useRef<d3.GeoPath | null>(null);
  const featuresRef = useRef<Feature<Geometry, ProvinceProperties>[]>([]);
  const placesRef = useRef(places);
  const onPinClickRef = useRef(onPinClick);
  const onLoadRef = useRef(onLoad);

  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);

  // ── Main D3 initialisation (runs once) ───────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 500;

    d3.select(container).selectAll("svg").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block")
      .style("background", "#0d1b2a");

    svgRef.current = svg.node();

    const projection = d3
      .geoMercator()
      .center([127.7, 36.0])
      .scale(Math.min(w, h) * 5.5)
      .translate([w / 2, h / 2]);
    projectionRef.current = projection;

    const pathGen = d3.geoPath().projection(projection);
    pathGenRef.current = pathGen;

    const mapGroup = svg.append("g").attr("class", "map-group");
    const provincesG = mapGroup.append("g").attr("class", "provinces");
    const pinsG = mapGroup.append("g").attr("class", "pins");

    // TopoJSON 로드
    fetch("/data/korea-provinces-topo.json")
      .then((r) => r.json())
      .then((topo: KoreaTopology) => {
        const provinces = feature(topo, topo.objects.skorea_provinces_2018_geo);
        featuresRef.current = provinces.features as Feature<Geometry, ProvinceProperties>[];

        // 한반도에 맞게 projection 자동 피팅
        projection.fitSize([w, h], provinces);

        // 시도 면 렌더링
        provincesG
          .selectAll<SVGPathElement, Feature<Geometry, ProvinceProperties>>("path")
          .data(provinces.features as Feature<Geometry, ProvinceProperties>[])
          .join("path")
          .attr("d", (d) => pathGen(d) ?? "")
          .attr("fill", (d) => {
            const region = PROVINCE_TO_REGION[d.properties.name];
            return region ? REGION_COLORS[region] : "#374151";
          })
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 0.6)
          .attr("opacity", (d) => getProvinceOpacity(d.properties.name, selectedRegions))
          .on("click", (_event, d) => {
            // 시도 클릭 시 해당 지역 핀 첫 번째 표시
            const matching = placesRef.current.find((p) => p.province === d.properties.name);
            if (matching) onPinClickRef.current(matching);
          })
          .style("cursor", "pointer");

        // 경계선 레이블 (시도명)
        provincesG
          .selectAll<SVGTextElement, Feature<Geometry, ProvinceProperties>>("text")
          .data(provinces.features as Feature<Geometry, ProvinceProperties>[])
          .join("text")
          .attr("class", "province-label")
          .attr("transform", (d) => {
            const centroid = pathGen.centroid(d);
            return centroid ? `translate(${centroid[0]},${centroid[1]})` : "";
          })
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "9px")
          .style("font-weight", "600")
          .style("fill", "rgba(255,255,255,0.85)")
          .style("pointer-events", "none")
          .style("user-select", "none")
          .text((d) => getShortName(d.properties.name));

        renderKoreaPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);
        onLoadRef.current?.();
      })
      .catch(() => {
        renderKoreaPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);
        onLoadRef.current?.();
      });

    // 줌/팬
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 12])
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform.toString());
      });
    svg.call(zoom);

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh || featuresRef.current.length === 0) return;

      const fc = { type: "FeatureCollection" as const, features: featuresRef.current };
      projection.fitSize([nw, nh], fc);

      mapGroup
        .selectAll<SVGPathElement, Feature<Geometry, ProvinceProperties>>("g.provinces path")
        .attr("d", (d) => pathGen(d) ?? "");

      mapGroup
        .selectAll<SVGTextElement, Feature<Geometry, ProvinceProperties>>("g.provinces text")
        .attr("transform", (d) => {
          const centroid = pathGen.centroid(d);
          return centroid ? `translate(${centroid[0]},${centroid[1]})` : "";
        });

      renderKoreaPins(
        mapGroup.select<SVGGElement>("g.pins"),
        placesRef.current,
        null,
        projection,
        onPinClickRef,
      );
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      d3.select(container).selectAll("svg").remove();
      svgRef.current = null;
      projectionRef.current = null;
      pathGenRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 필터 / 핀 업데이트 ───────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const projection = projectionRef.current;
    if (!svg || !projection) return;

    const sel = d3.select(svg);

    sel
      .select("g.provinces")
      .selectAll<SVGPathElement, Feature<Geometry, ProvinceProperties>>("path")
      .attr("opacity", (d) => getProvinceOpacity(d.properties.name, selectedRegions));

    renderKoreaPins(
      sel.select<SVGGElement>("g.pins"),
      places,
      highlightedId ?? null,
      projection,
      onPinClickRef,
    );
  }, [places, highlightedId, selectedRegions]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 320, overflow: "hidden" }}
    />
  );
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

function getProvinceOpacity(name: string, selectedRegions?: KoreaRegion[]): number {
  if (!selectedRegions || selectedRegions.length === 0) return 0.8;
  const region = PROVINCE_TO_REGION[name];
  return region && selectedRegions.includes(region) ? 0.95 : 0.18;
}

function getShortName(name: string): string {
  const overrides: Record<string, string> = {
    "서울특별시": "서울",
    "부산광역시": "부산",
    "대구광역시": "대구",
    "인천광역시": "인천",
    "광주광역시": "광주",
    "대전광역시": "대전",
    "울산광역시": "울산",
    "세종특별자치시": "세종",
    "경기도": "경기",
    "강원특별자치도": "강원",
    "충청북도": "충북",
    "충청남도": "충남",
    "전북특별자치도": "전북",
    "전라남도": "전남",
    "경상북도": "경북",
    "경상남도": "경남",
    "제주특별자치도": "제주",
  };
  return overrides[name] ?? name;
}

function renderKoreaPins(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  places: TravelPlace[],
  highlightedId: string | null,
  projection: d3.GeoProjection,
  onPinClickRef: React.MutableRefObject<(place: TravelPlace) => void>,
) {
  const circles = group
    .selectAll<SVGCircleElement, TravelPlace>("circle")
    .data(places, (d) => d.id);

  circles.exit().remove();

  const entered = circles
    .enter()
    .append("circle")
    .attr("r", 7)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("click", (_event, d) => {
      onPinClickRef.current(d);
    });

  entered.append("title");

  const merged = entered.merge(circles);
  merged
    .attr("cx", (d) => { const p = projection([d.lng, d.lat]); return p ? p[0] : 0; })
    .attr("cy", (d) => { const p = projection([d.lng, d.lat]); return p ? p[1] : 0; })
    .attr("fill", (d) => {
      if (d.id === highlightedId) return "goldenrod";
      const region = d.province ? PROVINCE_TO_REGION[d.province] : null;
      return region ? REGION_COLORS[region] : "#10b981";
    })
    .attr("stroke-width", (d) => (d.id === highlightedId ? 2.5 : 1.5));

  merged.select("title").text((d) => `${d.city}${d.province ? ` (${d.province})` : ""}`);
}
