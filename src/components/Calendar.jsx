import React from 'react';
import './Calendar.css';

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

export default function Calendar({ year, month, data }) {
  // data is an array of equipment items (or a single item if filtered)
  // For the calendar, we want to aggregate the status for each day of the month.
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // Calculate day statuses
  // A day's status is determined by the selected equipment data
  const getDayStatus = (day) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // We expect each equipment to have shifts completed
    let shift1 = { expected: false, status: 'none' };
    let shift2 = { expected: false, status: 'none' };
    let shift3 = { expected: false, status: 'none' };

    let totalExpectedShifts = 0;

    data.forEach(equip => {
      // Determine expected shifts
      let expectedForEquip = 3; 
      if (equip.type === 'EMS Box') expectedForEquip = 1;
      
      if (totalExpectedShifts < expectedForEquip) {
        totalExpectedShifts = expectedForEquip;
      }
      
      if (expectedForEquip >= 1) shift1.expected = true;
      if (expectedForEquip >= 2) shift2.expected = true;
      if (expectedForEquip >= 3) shift3.expected = true;

      const dayData = equip.historyByDate[dateKey] || [];
      dayData.forEach(inspection => {
        const s = inspection.shift;
        const statusStr = inspection.status === 'Ready' ? 'ready' : 'maintenance';
        if (s === 1 || (expectedForEquip === 1 && s === 0)) shift1.status = statusStr;
        if (s === 2) shift2.status = statusStr;
        if (s === 3) shift3.status = statusStr;
      });
    });

    return { shift1, shift2, shift3, totalExpectedShifts };
  };

  const renderIndicator = (shift) => {
    if (!shift.expected) return null;
    let className = 'indicator ';
    if (shift.status === 'ready') className += 'green';
    else if (shift.status === 'maintenance') className += 'red';
    else className += 'gray';
    
    return <div className={className}></div>;
  };

  return (
    <div className="calendar">
      <div className="weekdays">
        <div>อา.</div><div>จ.</div><div>อ.</div><div>พ.</div><div>พฤ.</div><div>ศ.</div><div>ส.</div>
      </div>
      <div className="days-grid">
        {blanks.map(b => <div key={`blank-${b}`} className="day empty"></div>)}
        {days.map(day => {
          const { shift1, shift2, shift3, totalExpectedShifts } = getDayStatus(day);
          
          return (
            <div key={day} className="day">
              <span className="day-number">{day}</span>
              <div className={`indicators shifts-${totalExpectedShifts}`}>
                {renderIndicator(shift1)}
                {renderIndicator(shift2)}
                {renderIndicator(shift3)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
