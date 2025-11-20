import React from 'react';
import { FormControl } from 'react-bootstrap';

export const StatusDropdownFilter = ({ column }) => {
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
				<option value="Upload">Upload</option>
				<option value="Uploaded">Uploaded</option>
			</FormControl>
		</div>
	);
};

