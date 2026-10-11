import React from 'react';

interface FilteredCountProps {
  filtered: number;
  total: number;
  label: string;
}

const FilteredCount: React.FC<FilteredCountProps> = ({ filtered, total, label }) => (
  <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
    <strong style={{ color: 'var(--primary)', fontSize: 16 }}>{filtered}</strong>
    {' '}of {total} {label}
  </p>
);

export default FilteredCount;
