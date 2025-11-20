import {format} from 'date-fns';
import { ColumnFilter } from './ColumnFilter';
import { DateFilter } from './DateFilter';

export const COLUMNS = [
	{
		Header : 'Id',
		Footer : 'Id',
		accessor: 'id',
		Filter: ColumnFilter,
		//disableFilters: true,
	},
	{
		Header : 'First Name',
		Footer : 'First Name',
		accessor: 'first_name',
		Filter: ColumnFilter,
	},
	{
		Header : 'Last Name',
		Footer : 'Last Name',
		accessor: 'last_name',
		Filter: ColumnFilter,
	},
	{
		Header : 'Email Id',
		Footer : 'Email Id',
		accessor: 'email',
		Filter: ColumnFilter,
	},
	{
		Header: 'Date of Birth',
		Footer: 'Date of Birth',
		accessor: 'date_of_birth',
		Cell: ({ value }) => {
		  const date = new Date(value);
		  return date.toLocaleDateString('en-GB'); // Converts to dd/mm/yyyy format
		},
		Filter: DateFilter,
		filter: (rows, id, filterValue) => {
		  const [startDate, endDate] = filterValue;
		  return rows.filter(row => {
			const rowDate = new Date(row.values[id]);
			return (
			  (!startDate || rowDate >= new Date(startDate)) &&
			  (!endDate || rowDate <= new Date(endDate))
			);
		  });
		},
	  },

	  
	{
		Header : 'Country',
		Footer : 'Country',
		accessor: 'country',
		Filter: ColumnFilter,
	},
	{
		Header : 'Phone',
		Footer : 'Phone',
		accessor: 'phone',
		Filter: ColumnFilter,
	},
]

export const GROUPED_COLUMNS = [
	{
		Header : 'Id',
		Footer : 'Id',
		accessor: 'id'
	},
	{
		Header : 'Name',
		Footer : 'Name',
		columns: [
			{
				Header : 'First Name',
				Footer : 'First Name',
				accessor: 'first_name'
			},
			{
				Header : 'Last Name',
				Footer : 'Last Name',
				accessor: 'last_name'
			},
		]
	},
	{
		Header: 'Info',
		Footer: 'Info',
		columns: [
			{
				Header : 'Date of  Birth',
				Footer : 'Date of  Birth',
				accessor: 'date_of_birth'
			},
			{
				Header : 'Country',
				Footer : 'Country',
				accessor: 'country',
			},
			{
				Header : 'Phone',
				Footer : 'Phone',
				accessor: 'phone'
			},
		]
	},
]