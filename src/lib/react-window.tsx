import React, { CSSProperties, ReactNode, UIEvent, useCallback, useMemo, useState } from 'react';

export interface ListChildComponentProps<T> {
  index: number;
  style: CSSProperties;
  data: T;
}

type ListChildComponentType<T> = React.ComponentType<ListChildComponentProps<T>>;

interface FixedSizeListProps<T> {
  height: number;
  itemCount: number;
  itemSize: number;
  width?: number | string;
  children: ListChildComponentType<T>;
  itemData?: T;
  overscanCount?: number;
}

export function FixedSizeList<T>({
  height,
  itemCount,
  itemSize,
  width = '100%',
  children,
  itemData,
  overscanCount = 4
}: FixedSizeListProps<T>): JSX.Element {
  const [scrollOffset, setScrollOffset] = useState(0);

  const totalHeight = itemCount * itemSize;

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollOffset / itemSize) - overscanCount);
    const visibleCount = Math.ceil(height / itemSize) + overscanCount * 2;
    const end = Math.min(itemCount - 1, start + visibleCount - 1);

    return {
      startIndex: start,
      endIndex: end
    };
  }, [height, itemCount, itemSize, overscanCount, scrollOffset]);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollOffset(event.currentTarget.scrollTop);
  }, []);

  const items: ReactNode[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const style: CSSProperties = {
      position: 'absolute',
      top: index * itemSize,
      height: itemSize,
      width: '100%'
    };

    items.push(
      React.createElement(children, {
        key: index,
        index,
        style,
        data: itemData as T
      })
    );
  }

  return (
    <div
      style={{ height, width, overflowY: 'auto', position: 'relative' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>{items}</div>
    </div>
  );
}

export type FixedSizeListComponent<T> = typeof FixedSizeList<T>;
