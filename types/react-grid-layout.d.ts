declare module "react-grid-layout" {
  import React from "react";

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    moved?: boolean;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export interface ResponsiveLayout {
    [key: string]: Layout[];
  }

  export interface GridLayoutProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    verticalCompact?: boolean;
    compactType?: "vertical" | "horizontal" | null;
    layout?: Layout[];
    margin?: [number, number];
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    isBounded?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    allowOverlap?: boolean;
    preventCollision?: boolean;
    isDroppable?: boolean;
    resizeHandles?: Array<"s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne">;
    resizeHandle?: React.ComponentType<any>;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStart?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      e: MouseEvent,
      element: HTMLElement,
    ) => void;
    onDrag?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      e: MouseEvent,
      element: HTMLElement,
    ) => void;
    onDragStop?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      e: MouseEvent,
      element: HTMLElement,
    ) => void;
    onResizeStart?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      e: MouseEvent,
      element: HTMLElement,
    ) => void;
    onResize?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      e: MouseEvent,
      element: HTMLElement,
    ) => void;
    onResizeStop?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      e: MouseEvent,
      element: HTMLElement,
    ) => void;
    onDrop?: (layout: Layout[], layoutItem: Layout, e: DragEvent) => void;
    children?: React.ReactNode;
  }

  export interface ResponsiveProps extends Omit<
    GridLayoutProps,
    "cols" | "layout" | "onLayoutChange"
  > {
    breakpoints?: { [key: string]: number };
    cols?: { [key: string]: number };
    layouts?: ResponsiveLayout;
    onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
    onLayoutChange?: (layout: Layout[], layouts: ResponsiveLayout) => void;
    onWidthChange?: (
      containerWidth: number,
      margin: [number, number],
      cols: number,
      containerPadding: [number, number],
    ) => void;
  }

  declare const GridLayout: React.ComponentType<GridLayoutProps>;
  export default GridLayout;

  export const Responsive: React.ComponentType<ResponsiveProps>;
  export const WidthProvider: <T extends object>(
    component: React.ComponentType<T>,
  ) => React.ComponentType<T>;
}

declare module "react-resizable/css/styles.css";
declare module "react-grid-layout/css/styles.css";
