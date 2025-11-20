export const DateFilter = ({ column }) => {
    const { filterValue = [], setFilter } = column;
    const [startDate, endDate] = filterValue;
  
    const handleStartDateChange = (e) => {
      const newStartDate = new Date(e.target.value);
      setFilter([newStartDate, endDate]);
    };
  
    const handleEndDateChange = (e) => {
      const newEndDate = new Date(e.target.value);
      setFilter([startDate, newEndDate]); 
    };
  
    return (
      <div>
        {/* <label>Start Date:</label> */}
        <input
          type="date"
          className="form-control input-search"
          value={startDate ? startDate.toISOString().split('T')[0] : ''}
          onChange={handleStartDateChange}
        />
        <label style={{color:'grey'}}>To : </label>
        <input
          type="date"
          className="form-control input-search"
          value={endDate ? endDate.toISOString().split('T')[0] : ''}
          onChange={handleEndDateChange}
        />
      </div>
    );
  };
  