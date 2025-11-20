import React from 'react';
import { FormControl } from 'react-bootstrap';

export const DropdownFilter = ({ column }) => {
	const { filterValue, setFilter } = column;
	
	return (
		<div>
			<FormControl
				as="select"
				className="form-control input-search"
				value={filterValue || ''}
				onChange={(e) => setFilter(e.target.value || undefined)}
			>
				<option value="">All</option>
				<option value="Uploaded">Uploaded</option>
				<option value="Pending">Pending</option>
			</FormControl>
		</div>
	);
};

