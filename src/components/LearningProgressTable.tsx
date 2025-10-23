import React, { useMemo } from 'react';
import { StudySession } from '../types';
import { aggregateStudySessions } from '../utils/studySessionStats';

interface LearningProgressTableProps {
  sessions: StudySession[];
}

const LearningProgressTable: React.FC<LearningProgressTableProps> = ({ sessions }) => {
  const summary = useMemo(() => aggregateStudySessions(sessions), [sessions]);

  if (!sessions.length) {
    return (
      <div className="card" style={{ marginTop: '16px' }}>
        <h2 style={{ marginBottom: '12px', color: '#1f2937' }}>📈 Bảng đánh giá tiến độ</h2>
        <p style={{ color: '#6b7280' }}>
          Khi bạn hoàn thành các phiên học, bảng này sẽ hiển thị tiến độ theo ngày, tháng và năm để bạn dễ dàng theo dõi.
        </p>
      </div>
    );
  }

  const formatMinutes = (minutes: number) => {
    if (minutes <= 0) {
      return '0';
    }
    if (minutes < 0.1) {
      return '< 0.1';
    }
    const rounded = Math.round(minutes * 10) / 10;
    return rounded % 1 === 0 ? `${rounded}` : rounded.toFixed(1);
  };

  const rows: Array<{ label: string; day: number | string; month: number | string; year: number | string; suffix?: string }> = [
    {
      label: 'Số phiên học',
      day: summary.day.sessions,
      month: summary.month.sessions,
      year: summary.year.sessions
    },
    {
      label: 'Thẻ đã ôn luyện',
      day: summary.day.cardsStudied,
      month: summary.month.cardsStudied,
      year: summary.year.cardsStudied
    },
    {
      label: 'Câu trả lời đúng',
      day: summary.day.correctAnswers,
      month: summary.month.correctAnswers,
      year: summary.year.correctAnswers
    },
    {
      label: 'Tỷ lệ chính xác',
      day: `${summary.day.accuracy}%`,
      month: `${summary.month.accuracy}%`,
      year: `${summary.year.accuracy}%`
    },
    {
      label: 'Thời gian học (phút)',
      day: formatMinutes(summary.day.minutes),
      month: formatMinutes(summary.month.minutes),
      year: formatMinutes(summary.year.minutes)
    }
  ];

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <h2 style={{ marginBottom: '12px', color: '#1f2937' }}>📈 Bảng đánh giá tiến độ</h2>
      <p style={{ color: '#6b7280', marginBottom: '16px' }}>
        Theo dõi nhanh mức độ học tập của bạn trong hôm nay, tháng này và cả năm.
      </p>
      <div className="analytics-table__wrapper">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Chỉ số</th>
              <th>Hôm nay</th>
              <th>Tháng này</th>
              <th>Năm nay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.day}</td>
                <td>{row.month}</td>
                <td>{row.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LearningProgressTable;
