import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
    >
      <span className="theme-toggle__icon">
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle__text">
        {isDark ? 'Sáng' : 'Tối'}
      </span>
    </button>
  );
};

export default ThemeToggle;

