import React, { useEffect, useMemo, useState } from 'react';
import { OverdueSnapshot, loadOverdueHistory } from '../utils/overdue';
import { StudySession } from '../types';

interface OverdueTrendChartProps {
  sessions: StudySession[];
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = 640;

const OverdueTrendChart: React.FC<OverdueTrendChartProps> = ({ sessions }) => {
  const [history, setHistory] = useState<OverdueSnapshot[]>([]);
  const totalSessions = sessions.length;

  useEffect(() => {
    const snapshots = loadOverdueHistory();
    setHistory(snapshots);
  }, [sessions]);

  const chartData = useMemo(() => {
    if (!history.length) {
      return [] as OverdueSnapshot[];
    }

    return history
      .slice(-14)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history]);

  const maxCount = useMemo(() => {
    if (!chartData.length) {
      return 1;
    }
    return Math.max(...chartData.map(point => point.count), 1);
  }, [chartData]);

  const points = useMemo(() => {
    if (!chartData.length) {
      return '';
    }

    const stepX = chartData.length > 1 ? CHART_WIDTH / (chartData.length - 1) : 0;

    return chartData
      .map((point, index) => {
        const x = stepX * index;
        const y = CHART_HEIGHT - (point.count / maxCount) * (CHART_HEIGHT - 20) - 10;
        return `${x},${y}`;
      })
      .join(' ');
  }, [chartData, maxCount]);

  const labels = useMemo(() => {
    return chartData.map(point => {
      const date = new Date(point.date);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' });
    });
  }, [chartData]);

  const currentCount = chartData.length ? chartData[chartData.length - 1].count : 0;

  if (!chartData.length) {
    return (
      <div className="card" style={{ marginTop: '16px', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '12px' }}>📊 Xu hướng thẻ trễ hạn</h2>
        <p className="chart-description">
          Khi bạn học và cập nhật thẻ mỗi ngày, biểu đồ này sẽ hiển thị xu hướng số lượng thẻ trễ hạn trong 2 tuần gần nhất.
          {' '}
          {totalSessions > 0
            ? 'Hãy tiếp tục duy trì nhịp độ học để thu thập thêm dữ liệu.'
            : 'Bắt đầu một phiên học để tạo bản ghi đầu tiên!'}
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '16px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>📊 Xu hướng thẻ trễ hạn</h2>
          <p className="chart-description" style={{ margin: 0 }}>
            Cập nhật hàng ngày. Hiện có <strong>{currentCount}</strong> thẻ đang quá hạn.
          </p>
        </div>
      </div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points={`${points} ${CHART_WIDTH},${CHART_HEIGHT} 0,${CHART_HEIGHT}`}
            fill="url(#overdueGradient)"
            opacity={0.6}
          />
          {chartData.map((point, index) => {
            const stepX = chartData.length > 1 ? CHART_WIDTH / (chartData.length - 1) : 0;
            const x = stepX * index;
            const y = CHART_HEIGHT - (point.count / maxCount) * (CHART_HEIGHT - 20) - 10;
            return (
              <g key={point.date}>
                <circle cx={x} cy={y} r={4} fill="#ea580c" />
                <text
                  x={x}
                  y={CHART_HEIGHT - 2}
                  textAnchor="middle"
                  fontSize="10"
                  style={{ fill: 'var(--text-secondary)' }}
                >
                  {labels[index]}
                </text>
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fontSize="10"
                  style={{ fill: 'var(--text-primary)' }}
                >
                  {point.count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default OverdueTrendChart;
