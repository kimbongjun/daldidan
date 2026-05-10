"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { GeoPermissibleObjects } from "d3";
import worldData from "world-atlas/countries-110m.json";
import type { TravelPlace, TravelContinent } from "@/lib/travel-shared";

interface TravelWorldMapProps {
  places: TravelPlace[];
  onPinClick: (place: TravelPlace) => void;
  highlightedId?: string | null;
  selectedContinents?: TravelContinent[];
  activeContinents?: TravelContinent[];   // NEW — continents with ≥1 travel record
  onLoad?: () => void;
}

const CONTINENT_COLORS: Record<string, string> = {
  Asia: "#f59e0b",
  Europe: "#60a5fa",
  NorthAmerica: "#34d399",
  SouthAmerica: "#fbbf24",
  Africa: "#f87171",
  Oceania: "#a78bfa",
  Antarctica: "#94a3b8",
  Americas: "#34d399", // 구버전 DB 데이터 호환
  default: "#6b7280",
};

const ISO_TO_CONTINENT: Record<number, string> = {
  // Asia
  4: "Asia", 50: "Asia", 64: "Asia", 96: "Asia", 104: "Asia", 116: "Asia",
  156: "Asia", 144: "Asia", 360: "Asia", 392: "Asia", 398: "Asia",
  408: "Asia", 410: "Asia", 417: "Asia", 418: "Asia", 458: "Asia",
  462: "Asia", 496: "Asia", 524: "Asia", 586: "Asia", 608: "Asia",
  626: "Asia", 702: "Asia", 704: "Asia", 762: "Asia", 764: "Asia",
  795: "Asia", 860: "Asia", 51: "Asia", 31: "Asia", 48: "Asia",
  196: "Asia", 268: "Asia", 364: "Asia", 368: "Asia", 376: "Asia",
  400: "Asia", 414: "Asia", 422: "Asia", 512: "Asia", 275: "Asia",
  634: "Asia", 682: "Asia", 760: "Asia", 792: "Asia", 784: "Asia", 887: "Asia",
  // Europe
  8: "Europe", 20: "Europe", 40: "Europe", 56: "Europe", 70: "Europe",
  100: "Europe", 112: "Europe", 191: "Europe", 203: "Europe", 208: "Europe",
  233: "Europe", 246: "Europe", 250: "Europe", 276: "Europe", 300: "Europe",
  336: "Europe", 348: "Europe", 352: "Europe", 372: "Europe", 380: "Europe",
  428: "Europe", 438: "Europe", 440: "Europe", 442: "Europe", 470: "Europe",
  492: "Europe", 498: "Europe", 499: "Europe", 528: "Europe", 578: "Europe",
  616: "Europe", 620: "Europe", 642: "Europe", 643: "Europe", 674: "Europe",
  688: "Europe", 703: "Europe", 705: "Europe", 724: "Europe", 752: "Europe",
  756: "Europe", 804: "Europe", 807: "Europe", 826: "Europe",
  // North America (캐나다·미국·멕시코·중미·카리브해)
  124: "NorthAmerica", 840: "NorthAmerica", 484: "NorthAmerica",
  84: "NorthAmerica", 188: "NorthAmerica", 192: "NorthAmerica",
  212: "NorthAmerica", 214: "NorthAmerica", 222: "NorthAmerica",
  308: "NorthAmerica", 320: "NorthAmerica", 332: "NorthAmerica",
  340: "NorthAmerica", 388: "NorthAmerica", 558: "NorthAmerica",
  591: "NorthAmerica", 630: "NorthAmerica",
  28: "NorthAmerica", 44: "NorthAmerica", 52: "NorthAmerica",
  659: "NorthAmerica", 662: "NorthAmerica", 670: "NorthAmerica",
  780: "NorthAmerica",
  // South America (남미)
  32: "SouthAmerica", 68: "SouthAmerica", 76: "SouthAmerica",
  152: "SouthAmerica", 170: "SouthAmerica", 218: "SouthAmerica",
  328: "SouthAmerica", 600: "SouthAmerica", 604: "SouthAmerica",
  740: "SouthAmerica", 858: "SouthAmerica", 862: "SouthAmerica",
  // Africa
  12: "Africa", 24: "Africa", 72: "Africa", 108: "Africa", 120: "Africa",
  132: "Africa", 140: "Africa", 148: "Africa", 174: "Africa", 178: "Africa",
  180: "Africa", 204: "Africa", 226: "Africa", 231: "Africa", 232: "Africa",
  262: "Africa", 266: "Africa", 270: "Africa", 288: "Africa",
  324: "Africa", 384: "Africa", 404: "Africa", 426: "Africa", 430: "Africa",
  434: "Africa", 450: "Africa", 454: "Africa", 466: "Africa", 478: "Africa",
  480: "Africa", 504: "Africa", 508: "Africa", 516: "Africa", 562: "Africa",
  566: "Africa", 624: "Africa", 646: "Africa", 678: "Africa", 686: "Africa",
  690: "Africa", 694: "Africa", 706: "Africa", 710: "Africa", 716: "Africa",
  728: "Africa", 729: "Africa", 748: "Africa", 768: "Africa", 788: "Africa",
  800: "Africa", 818: "Africa", 834: "Africa", 854: "Africa", 894: "Africa",
  // Oceania
  36: "Oceania", 242: "Oceania", 296: "Oceania", 520: "Oceania",
  548: "Oceania", 554: "Oceania", 583: "Oceania", 584: "Oceania",
  585: "Oceania", 598: "Oceania", 776: "Oceania", 798: "Oceania",
  882: "Oceania", 90: "Oceania",
  // Antarctica
  10: "Antarctica",
};

type WorldTopology = Topology<{
  countries: GeometryCollection;
  land: GeometryCollection;
}>;

export default function TravelWorldMap({
  places,
  onPinClick,
  highlightedId,
  selectedContinents,
  activeContinents,
  onLoad,
}: TravelWorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const placesRef = useRef(places);
  const onPinClickRef = useRef(onPinClick);
  const onLoadRef = useRef(onLoad);
  const activeContinentsRef = useRef(activeContinents);
  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);

  // keep refs in sync without re-running main effect
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  useEffect(() => { activeContinentsRef.current = activeContinents; }, [activeContinents]);

  // ── Main D3 initialisation (runs once) ──────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const topo = worldData as unknown as WorldTopology;
    const countries = feature(topo, topo.objects.countries);
    const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
    const land = feature(topo, topo.objects.land);

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;

    // Remove any previous svg
    d3.select(container).selectAll("svg").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block")
      .style("background", "#0d1b2a");

    svgRef.current = svg.node();

    // Ocean background
    svg
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "#0d1b2a");

    const projection = d3
      .geoNaturalEarth1()
      .fitSize([w, h], land as GeoPermissibleObjects);

    projectionRef.current = projection;

    const pathGen = d3.geoPath().projection(projection);

    // Zoomable group
    const mapGroup = svg.append("g").attr("class", "map-group");

    // Graticule
    const graticule = d3.geoGraticule()();
    mapGroup
      .append("g")
      .attr("class", "graticule")
      .append("path")
      .datum(graticule as GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-width", 0.5);

    // Countries
    const countriesG = mapGroup.append("g").attr("class", "countries");
    countriesG
      .selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", (d) => pathGen(d) ?? "")
      .attr("fill", (d) => {
        const isoNum = Number(d.id);
        const continent = ISO_TO_CONTINENT[isoNum] ?? "default";

        // 전체 모드 (no filter): only show color if continent has records
        if (!selectedContinents || selectedContinents.length === 0) {
          const ac = activeContinentsRef.current;
          if (!ac || ac.length === 0) {
            return CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default;
          }
          return ac.includes(continent as TravelContinent)
            ? (CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default)
            : "#374151";
        }

        // 필터 모드: selected → color, unselected → gray
        return selectedContinents.includes(continent as TravelContinent)
          ? (CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default)
          : "#374151";
      })
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 0.4)
      .attr("opacity", (d) => {
        const isoNum = Number(d.id);
        const continent = ISO_TO_CONTINENT[isoNum];

        if (!selectedContinents || selectedContinents.length === 0) {
          const ac = activeContinentsRef.current;
          if (!ac || ac.length === 0) return 0.85;
          return ac.includes(continent as TravelContinent) ? 0.85 : 0.45;
        }

        return continent && selectedContinents.includes(continent as TravelContinent) ? 1 : 0.25;
      });

    // Borders mesh
    mapGroup
      .append("g")
      .attr("class", "borders")
      .append("path")
      .datum(borders as GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-width", 0.6);

    // Pins group
    const pinsG = mapGroup.append("g").attr("class", "pins");
    renderPins(pinsG, placesRef.current, highlightedId ?? null, projection, onPinClickRef);

    onLoadRef.current?.();

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        mapGroup.attr("transform", event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      projection.fitSize([nw, nh], land as GeoPermissibleObjects);
      // redraw all paths
      mapGroup.selectAll<SVGPathElement, d3.GeoPermissibleObjects>("path").attr("d", (d) => pathGen(d) ?? "");
      // reposition pins
      const currentPinsG = mapGroup.select<SVGGElement>("g.pins");
      renderPins(currentPinsG, placesRef.current, null, projection, onPinClickRef);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      d3.select(container).selectAll("svg").remove();
      svgRef.current = null;
      zoomRef.current = null;
      projectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update pins + continent dimming when props change ───────────────────
  useEffect(() => {
    const svg = svgRef.current;
    const projection = projectionRef.current;
    if (!svg || !projection) return;

    const sel = d3.select(svg);

    // Update continent fill + opacity
    sel.select("g.countries").selectAll<SVGPathElement, d3.GeoPermissibleObjects>("path")
      .attr("fill", (d) => {
        const feature = d as { id?: string | number };
        const isoNum = Number(feature.id);
        const continent = ISO_TO_CONTINENT[isoNum] ?? "default";

        if (!selectedContinents || selectedContinents.length === 0) {
          if (!activeContinents || activeContinents.length === 0) {
            return CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default;
          }
          return activeContinents.includes(continent as TravelContinent)
            ? (CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default)
            : "#374151";
        }

        return selectedContinents.includes(continent as TravelContinent)
          ? (CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default)
          : "#374151";
      })
      .attr("opacity", (d) => {
        const feature = d as { id?: string | number };
        const isoNum = Number(feature.id);
        const continent = ISO_TO_CONTINENT[isoNum];

        if (!selectedContinents || selectedContinents.length === 0) {
          if (!activeContinents || activeContinents.length === 0) return 0.85;
          return activeContinents.includes(continent as TravelContinent) ? 0.85 : 0.45;
        }

        return continent && selectedContinents.includes(continent as TravelContinent) ? 1 : 0.25;
      });

    // Update pins
    const pinsG = sel.select<SVGGElement>("g.pins");
    renderPins(pinsG, places, highlightedId ?? null, projection, onPinClickRef);
  }, [places, highlightedId, selectedContinents, activeContinents]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 320, overflow: "hidden" }}
    />
  );
}

// ── Helper: render/update pin circles ────────────────────────────────────
function renderPins(
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

  // Append title for tooltip
  entered.append("title");

  const merged = entered.merge(circles);

  merged
    .attr("cx", (d) => {
      const p = projection([d.lng, d.lat]);
      return p ? p[0] : 0;
    })
    .attr("cy", (d) => {
      const p = projection([d.lng, d.lat]);
      return p ? p[1] : 0;
    })
    .attr("fill", (d) => {
      if (d.id === highlightedId) return "goldenrod";
      const continent = d.continent ?? "default";
      return CONTINENT_COLORS[continent] ?? CONTINENT_COLORS.default;
    })
    .attr("stroke-width", (d) => (d.id === highlightedId ? 2.5 : 1.5));

  merged.select("title").text((d) => `${d.city}, ${d.country}`);
}
