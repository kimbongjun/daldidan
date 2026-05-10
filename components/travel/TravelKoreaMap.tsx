"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import type { TravelPlace, KoreaRegion } from "@/lib/travel-shared";
import { PROVINCE_TO_REGION, CODE_TO_PROVINCE } from "@/lib/travel-shared";

interface MunicipalityProperties {
  name: string;
  name_eng: string;
  code: string;
  base_year: string;
}

type KoreaMunicipalityTopology = Topology<{
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

const REGION_COLORS: Record<KoreaRegion, string> = {
  "서울": "#f59e0b",
  "경기/인천": "#60a5fa",
  "강원": "#34d399",
  "충청": "#f87171",
  "전라": "#a78bfa",
  "경상": "#fb923c",
  "제주": "#e879f9",
};

const GRAY_FILL = "#374151";

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

function getMunicipalityFill(
  code: string,
  activeProvinces?: string[],
  selectedRegions?: KoreaRegion[],
): string {
  const province = CODE_TO_PROVINCE[code.slice(0, 2)];
  const region = province ? PROVINCE_TO_REGION[province] : null;
  if (!region) return GRAY_FILL;

  if (selectedRegions && selectedRegions.length > 0) {
    return selectedRegions.includes(region) ? REGION_COLORS[region] : GRAY_FILL;
  }

  if (activeProvinces && activeProvinces.length > 0) {
    return province && activeProvinces.includes(province) ? REGION_COLORS[region] : GRAY_FILL;
  }

  return REGION_COLORS[region];
}

function getMunicipalityOpacity(
  code: string,
  activeProvinces?: string[],
  selectedRegions?: KoreaRegion[],
): number {
  const province = CODE_TO_PROVINCE[code.slice(0, 2)];
  const region = province ? PROVINCE_TO_REGION[province] : null;

  if (selectedRegions && selectedRegions.length > 0) {
    return region && selectedRegions.includes(region) ? 0.95 : 0.2;
  }

  if (activeProvinces && activeProvinces.length > 0) {
    return province && activeProvinces.includes(province) ? 0.85 : 0.45;
  }

  return 0.85;
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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathGenRef = useRef<d3.GeoPath | null>(null);
  const featuresRef = useRef<Feature<Geometry, MunicipalityProperties>[]>([]);
  const placesRef = useRef(places);
  const onPinClickRef = useRef(onPinClick);
  const onLoadRef = useRef(onLoad);
  const activeProvincesRef = useRef(activeProvinces);

  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  useEffect(() => { activeProvincesRef.current = activeProvinces; }, [activeProvinces]);

  // ── Main D3 initialisation (runs once) ────────────────────────────────────
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

    const projection = d3.geoMercator()
      .center([127.7, 36.0])
      .scale(Math.min(w, h) * 5.5)
      .translate([w / 2, h / 2]);
    projectionRef.current = projection;

    const pathGen = d3.geoPath().projection(projection);
    pathGenRef.current = pathGen;

    const mapGroup = svg.append("g").attr("class", "map-group");
    const municipalitiesG = mapGroup.append("g").attr("class", "municipalities");
    const municipalityBordersG = mapGroup.append("g").attr("class", "municipality-borders");
    const provinceBordersG = mapGroup.append("g").attr("class", "province-borders");
    const labelsG = mapGroup.append("g").attr("class", "province-labels");
    const pinsG = mapGroup.append("g").attr("class", "pins");

    fetch("/data/korea-municipalities-topo.json")
      .then((r) => r.json())
      .then((topo: KoreaMunicipalityTopology) => {
        const municipalities = feature(topo, topo.objects.skorea_municipalities_2018_geo);
        featuresRef.current = municipalities.features as Feature<Geometry, MunicipalityProperties>[];

        projection.fitSize([w, h], municipalities);

        // Municipality fills
        municipalitiesG
          .selectAll<SVGPathElement, Feature<Geometry, MunicipalityProperties>>("path")
          .data(municipalities.features as Feature<Geometry, MunicipalityProperties>[])
          .join("path")
          .attr("d", (d) => pathGen(d) ?? "")
          .attr("fill", (d) => getMunicipalityFill(d.properties.code, activeProvincesRef.current, selectedRegions))
          .attr("opacity", (d) => getMunicipalityOpacity(d.properties.code, activeProvincesRef.current, selectedRegions))
          .attr("stroke", "none")
          .style("cursor", "pointer")
          .on("click", (_event, d) => {
            const province = CODE_TO_PROVINCE[d.properties.code.slice(0, 2)];
            const matching = placesRef.current.find((p) => p.province === province);
            if (matching) onPinClickRef.current(matching);
          });

        // Thin municipality borders
        const muniMesh = mesh(
          topo,
          topo.objects.skorea_municipalities_2018_geo,
          (a, b) => a !== b,
        );
        municipalityBordersG
          .append("path")
          .datum(muniMesh)
          .attr("d", pathGen)
          .attr("fill", "none")
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 0.3);

        // Thick province borders
        const provMesh = mesh(
          topo,
          topo.objects.skorea_municipalities_2018_geo,
          (a, b) => {
            if (a === b) return true; // exterior (coastline)
            const ap = (a as unknown as { properties: MunicipalityProperties }).properties.code.slice(0, 2);
            const bp = (b as unknown as { properties: MunicipalityProperties }).properties.code.slice(0, 2);
            return ap !== bp;
          },
        );
        provinceBordersG
          .append("path")
          .datum(provMesh)
          .attr("d", pathGen)
          .attr("fill", "none")
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 1.2);

        // Province labels
        labelsG
          .selectAll("text")
          .data(PROVINCE_LABEL_COORDS)
          .join("text")
          .attr("transform", (d) => {
            const pt = projection([d.lng, d.lat]);
            return pt ? `translate(${pt[0]},${pt[1]})` : "";
          })
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "8px")
          .style("font-weight", "700")
          .style("fill", "rgba(255,255,255,0.8)")
          .style("pointer-events", "none")
          .style("user-select", "none")
          .text((d) => d.short);

        renderKoreaPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);
        onLoadRef.current?.();
      })
      .catch(() => {
        renderKoreaPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);
        onLoadRef.current?.();
      });

    // Zoom/pan
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

      mapGroup.selectAll<SVGPathElement, Feature<Geometry, MunicipalityProperties>>("g.municipalities path")
        .attr("d", (d) => pathGen(d) ?? "");

      mapGroup.selectAll<SVGPathElement, unknown>("g.municipality-borders path, g.province-borders path")
        .attr("d", (d) => pathGen(d as Parameters<typeof pathGen>[0]) ?? "");

      mapGroup.selectAll<SVGTextElement, typeof PROVINCE_LABEL_COORDS[number]>("g.province-labels text")
        .attr("transform", (d) => {
          const pt = projection([d.lng, d.lat]);
          return pt ? `translate(${pt[0]},${pt[1]})` : "";
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

  // ── Update fills/pins when props change ──────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const projection = projectionRef.current;
    if (!svg || !projection) return;

    const sel = d3.select(svg);

    sel.select("g.municipalities")
      .selectAll<SVGPathElement, Feature<Geometry, MunicipalityProperties>>("path")
      .attr("fill", (d) => getMunicipalityFill(d.properties.code, activeProvinces, selectedRegions))
      .attr("opacity", (d) => getMunicipalityOpacity(d.properties.code, activeProvinces, selectedRegions));

    renderKoreaPins(
      sel.select<SVGGElement>("g.pins"),
      places,
      highlightedId ?? null,
      projection,
      onPinClickRef,
    );
  }, [places, highlightedId, selectedRegions, activeProvinces]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 320, overflow: "hidden" }}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
