"use client";

import React, { Children, ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Datum = Record<string, string | number | null | undefined>;

type ChartProps = {
  data?: Datum[];
  children?: ReactNode;
  margin?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  width?: number;
  height?: number;
};

type AxisProps = {
  dataKey?: string;
  tickFormatter?: (value: string | number) => string;
  tickCount?: number;
  stroke?: string;
  tick?: { fill?: string; fontSize?: number };
};

type GridProps = {
  stroke?: string;
};

type LineProps = {
  dataKey?: string;
  stroke?: string;
  strokeWidth?: number;
  dot?: boolean;
};

type BarProps = {
  dataKey?: string;
  fill?: string;
  radius?: number;
};

type TooltipProps = {
  formatter?: (value: string | number | null | undefined) => ReactNode;
};

function isElementOfType(element: ReactNode, component: React.ComponentType<any>) {
  return React.isValidElement(element) && element.type === component;
}

function getChildrenOfType<T extends Record<string, any>>(
  children: ReactNode,
  component: React.ComponentType<T>
): T[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<T> => isElementOfType(child, component))
    .map((child) => child.props);
}

function getChildOfType<T extends Record<string, any>>(
  children: ReactNode,
  component: React.ComponentType<T>
): T | undefined {
  return Children.toArray(children)
    .find((child): child is ReactElement<T> => isElementOfType(child, component))?.props;
}

export function ResponsiveContainer({
  children,
  width = "100%",
  height = "100%"
}: {
  children: ReactNode;
  width?: string | number;
  height?: string | number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const child = Children.only(children) as ReactElement<ChartProps>;

  return (
    <div ref={ref} style={{ width, height }}>
      {size.width > 0 && size.height > 0 ? React.cloneElement(child, { width: size.width, height: size.height }) : null}
    </div>
  );
}

function ChartShell({
  width = 0,
  height = 0,
  data = [],
  children,
  margin = {}
}: ChartProps) {
  const top = margin.top ?? 8;
  const right = margin.right ?? 12;
  const bottom = margin.bottom ?? 24;
  const left = margin.left ?? 44;
  const innerWidth = Math.max(0, width - left - right);
  const innerHeight = Math.max(0, height - top - bottom);

  const xAxis = getChildOfType(children, XAxis);
  const yAxis = getChildOfType(children, YAxis);
  const grid = getChildOfType(children, CartesianGrid);
  const tooltip = getChildOfType(children, Tooltip);
  const lines = getChildrenOfType(children, Line);
  const bars = getChildrenOfType(children, Bar);

  const xKey = xAxis?.dataKey ?? "name";
  const xValues = data.map((row) => String(row[xKey] ?? ""));
  const yCandidates = [
    ...lines.map((line) => line.dataKey).filter(Boolean),
    ...bars.map((bar) => bar.dataKey).filter(Boolean)
  ] as string[];
  const numericSeries = yCandidates.length ? yCandidates : [xKey];

  const yValues = data.flatMap((row) =>
    numericSeries.map((key) => Number(row[key] ?? 0)).filter((value) => Number.isFinite(value))
  );
  const maxY = Math.max(1, ...yValues);
  const minY = 0;
  const tickCount = yAxis?.tickCount ?? 5;
  const yTicks = Array.from({ length: tickCount }, (_, i) => minY + ((maxY - minY) * (tickCount - 1 - i)) / Math.max(1, tickCount - 1));
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;
  const paddingBottomForTicks = 18;
  const chartHeight = innerHeight - paddingBottomForTicks;

  const getPoint = (value: number, index: number) => {
    const x = left + (data.length === 1 ? innerWidth / 2 : index * stepX);
    const y = top + chartHeight - ((value - minY) / Math.max(1, maxY - minY)) * chartHeight;
    return { x, y };
  };

  return (
    <svg width={width} height={height} role="img" aria-label="chart">
      {grid && (
        <>
          {yTicks.map((tick, index) => {
            const y = top + (chartHeight * index) / Math.max(1, yTicks.length - 1);
            return (
              <line
                key={`grid-${index}`}
                x1={left}
                x2={left + innerWidth}
                y1={y}
                y2={y}
                stroke={grid.stroke ?? "#E1E4EA"}
                strokeDasharray="3 3"
              />
            );
          })}
        </>
      )}

      <line x1={left} x2={left} y1={top} y2={top + chartHeight} stroke="#E1E4EA" />
      <line x1={left} x2={left + innerWidth} y1={top + chartHeight} y2={top + chartHeight} stroke="#E1E4EA" />

      {yAxis &&
        yTicks.map((tick, index) => {
          const y = top + (chartHeight * index) / Math.max(1, yTicks.length - 1);
          const value = yAxis.tickFormatter ? yAxis.tickFormatter(tick) : Math.round(tick).toString();
          return (
            <text
              key={`y-${index}`}
              x={left - 8}
              y={y + 4}
              textAnchor="end"
              fill={yAxis.tick?.fill ?? "#706E6E"}
              fontSize={yAxis.tick?.fontSize ?? 11}
            >
              {value}
            </text>
          );
        })}

      {xValues.map((value, index) => {
        if (data.length > 16 && index % Math.ceil(data.length / 8) !== 0 && index !== data.length - 1) {
          return null;
        }
        const x = data.length === 1 ? left + innerWidth / 2 : left + index * stepX;
        return (
          <text
            key={`x-${index}`}
            x={x}
            y={top + chartHeight + 16}
            textAnchor="middle"
            fill={xAxis?.tick?.fill ?? "#706E6E"}
            fontSize={xAxis?.tick?.fontSize ?? 11}
          >
            {xAxis?.tickFormatter ? xAxis.tickFormatter(value) : value}
          </text>
        );
      })}

      {bars.map((bar) => {
        const values = data.map((row) => Number(row[bar.dataKey ?? ""] ?? 0));
        const barWidth = Math.max(8, innerWidth / Math.max(1, values.length * 1.8));
        const gap = values.length > 1 ? (innerWidth - barWidth * values.length) / (values.length - 1) : 0;
        return values.map((value, index) => {
          const x = data.length === 1 ? left + innerWidth / 2 - barWidth / 2 : left + index * (barWidth + gap);
          const h = ((value - minY) / Math.max(1, maxY - minY)) * chartHeight;
          return (
            <rect
              key={`bar-${index}`}
              x={x}
              y={top + chartHeight - h}
              width={barWidth}
              height={h}
              rx={bar.radius ?? 4}
              fill={bar.fill ?? "#2067FF"}
            />
          );
        });
      })}

      {lines.map((line) => {
        const points = data.map((row, index) => getPoint(Number(row[line.dataKey ?? ""] ?? 0), index));
        const path = points
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
          .join(" ");
        return (
          <g key={line.dataKey ?? "line"}>
            <path d={path} fill="none" stroke={line.stroke ?? "#2067FF"} strokeWidth={line.strokeWidth ?? 2.5} />
            {(line.dot ?? true) &&
              points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  fill={line.stroke ?? "#2067FF"}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
          </g>
        );
      })}

      {tooltip ? null : null}
    </svg>
  );
}

export function LineChart(props: ChartProps) {
  return <ChartShell {...props} />;
}

export function BarChart(props: ChartProps) {
  return <ChartShell {...props} />;
}

export function Line(_props: LineProps) {
  return null;
}

export function Bar(_props: BarProps) {
  return null;
}

export function XAxis(_props: AxisProps) {
  return null;
}

export function YAxis(_props: AxisProps) {
  return null;
}

export function CartesianGrid(_props: GridProps) {
  return null;
}

export function Tooltip(_props: TooltipProps) {
  return null;
}
