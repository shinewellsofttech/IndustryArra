import React, { useMemo } from 'react';

export const ColumnFilter = ({ column }) => {
  const { filterValue, setFilter } = column;
  return (
    <div>
      <input
        className="form-control input-search"
        value={filterValue || ""}
        onChange={(e) => setFilter(e.target.value)}
      />
    </div>
  );
};

export const SelectColumnFilter = ({ column }) => {
  const { filterValue, setFilter, preFilteredRows, id } = column;

  const options = useMemo(() => {
    const optionSet = new Set();
    preFilteredRows.forEach((row) => {
      const value = row.values[id];
      if (value !== null && value !== undefined && value !== "") {
        optionSet.add(value);
      }
    });
    return Array.from(optionSet);
  }, [id, preFilteredRows]);

  return (
    <div>
      <select
        className="form-control input-search"
        value={filterValue || ""}
        onChange={(e) => {
          setFilter(e.target.value || undefined);
        }}
      >
        <option value="">All</option>
        {options.map((option, idx) => (
          <option key={`${id}-${idx}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};