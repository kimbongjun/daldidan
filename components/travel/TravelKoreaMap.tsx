"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TravelPlace, KoreaRegion } from "@/lib/travel-shared";
import { PROVINCE_TO_REGION } from "@/lib/travel-shared";

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

export default function TravelKoreaMap({ places, onPinClick, highlightedId, selectedRegions, onLoad }: TravelKoreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const placesRef = useRef(places);
  const onPinClickRef = useRef(onPinClick);
  const onLoadRef = useRef(onLoad);

  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 500;

    d3.select(container).selectAll("svg").remove();

    const svg = d3.select(container)
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

    const mapGroup = svg.append("g").attr("class", "map-group");
    const provincesG = mapGroup.append("g").attr("class", "provinces");
    const pinsG = mapGroup.append("g").attr("class", "pins");

    fetch("/data/korea-provinces.json")
      .then((r) => r.json())
      .then((geoData: { type: string; features: Array<{ properties: { name: string }; geometry: { type: string } }> }) => {
        const hasPolygons = geoData.features.some(
          (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
        );

        if (hasPolygons) {
          provincesG.selectAll("path")
            .data(geoData.features)
            .join("path")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr("d", (d) => pathGen(d as any) ?? "")
            .attr("fill", (d) => {
              const region = PROVINCE_TO_REGION[d.properties.name];
              return region ? REGION_COLORS[region] : "#374151";
            })
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 0.8)
            .attr("opacity", (d) => {
              if (!selectedRegions || selectedRegions.length === 0) return 0.75;
              const region = PROVINCE_TO_REGION[d.properties.name];
              return region && selectedRegions.includes(region) ? 0.9 : 0.2;
            });
        }

        renderKoreaPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);
        onLoadRef.current?.();
      })
      .catch(() => {
        renderKoreaPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);
        onLoadRef.current?.();
      });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event) => { mapGroup.attr("transform", event.transform.toString()); });
    svg.call(zoom);

    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      projection.center([127.7, 36.0]).scale(Math.min(nw, nh) * 5.5).translate([nw / 2, nh / 2]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapGroup.selectAll<SVGPathElement, any>("path").attr("d", (d) => pathGen(d) ?? "");
      renderKoreaPins(mapGroup.select<SVGGElement>("g.pins"), placesRef.current, null, projection, onPinClickRef);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      d3.select(container).selectAll("svg").remove();
      svgRef.current = null;
      projectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const projection = projectionRef.current;
    if (!svg || !projection) return;
    const sel = d3.select(svg);

    sel.select("g.provinces").selectAll<SVGPathElement, { properties: { name: string } }>("path")
      .attr("opacity", (d) => {
        if (!selectedRegions || selectedRegions.length === 0) return 0.75;
        const region = PROVINCE_TO_REGION[d.properties.name];
        return region && selectedRegions.includes(region) ? 0.9 : 0.2;
      });

    renderKoreaPins(sel.select<SVGGElement>("g.pins"), places, highlightedId ?? null, projection, onPinClickRef);
  }, [places, highlightedId, selectedRegions]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 320, overflow: "hidden" }} />;
}

function renderKoreaPins(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  places: TravelPlace[],
  highlightedId: string | null,
  projection: d3.GeoProjection,
  onPinClickRef: React.MutableRefObject<(place: TravelPlace) => void>,
) {
  const circles = group.selectAll<SVGCircleElement, TravelPlace>("circle").data(places, (d) => d.id);
  circles.exit().remove();
  const entered = circles.enter().append("circle")
    .attr("r", 7).attr("stroke", "#ffffff").attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("click", (_event, d) => { onPinClickRef.current(d); });
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
