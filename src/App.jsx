import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllEquipmentData } from './utils/dataService';
import Calendar from './components/Calendar';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentYearStr = String(new Date().getFullYear() + 543);
  const currentMonthStr = String(new Date().getMonth());

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedLocation, setSelectedLocation] = useState('ER'); // Default to ER instead of all to avoid clutter

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedData = await fetchAllEquipmentData();
      setData(fetchedData);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter data to only show equipment in the selected location
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    let fd = data;
    if (selectedLocation !== 'all') fd = fd.filter(d => d.department === selectedLocation);
    return fd;
  }, [data, selectedLocation]);

  const gregorianYear = parseInt(selectedYear) - 543;
  const monthIndex = parseInt(selectedMonth);
  const daysInMonth = new Date(gregorianYear, monthIndex + 1, 0).getDate();

  // Helper to calculate stats per equipment
  const getEquipmentStats = (equip) => {
    const expectedPerDay = equip.type === 'EMS Box' ? 1 : 3;
    const totalExpected = expectedPerDay * daysInMonth;
    
    let totalCompleted = 0;
    let totalReady = 0; // Shifts that were inspected and are ready

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${gregorianYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = equip.historyByDate[dateKey] || [];
      
      let shiftsCompleted = 0;
      let shiftsReady = 0;
      
      const countedShifts = new Set();
      dayData.forEach(inspection => {
        if (!countedShifts.has(inspection.shift)) {
          countedShifts.add(inspection.shift);
          shiftsCompleted++;
          if (inspection.status === 'Ready') {
            shiftsReady++;
          }
        }
      });

      totalCompleted += Math.min(shiftsCompleted, expectedPerDay);
      totalReady += Math.min(shiftsReady, expectedPerDay);
    }

    const completionRate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    const readinessRate = totalCompleted > 0 ? Math.round((totalReady / totalCompleted) * 100) : 0;

    return { completionRate, readinessRate };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังดึงข้อมูลจากระบบ...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-title">
          <h1>ระบบตรวจสอบเครื่องมือทางการแพทย์</h1>
          <p>กระทรวงสาธารณสุข - การติดตามความพร้อมใช้งาน (Compliance Tracking)</p>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>ปี พ.ศ.</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="2568">2568 (2025)</option>
              <option value="2569">2569 (2026)</option>
              <option value="2570">2570 (2027)</option>
            </select>
          </div>
          <div className="filter-group">
            <label>เดือน</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="0">มกราคม</option>
              <option value="1">กุมภาพันธ์</option>
              <option value="2">มีนาคม</option>
              <option value="3">เมษายน</option>
              <option value="4">พฤษภาคม</option>
              <option value="5">มิถุนายน</option>
              <option value="6">กรกฎาคม</option>
              <option value="7">สิงหาคม</option>
              <option value="8">กันยายน</option>
              <option value="9">ตุลาคม</option>
              <option value="10">พฤศจิกายน</option>
              <option value="11">ธันวาคม</option>
            </select>
          </div>
          <div className="filter-group" style={{ flex: 2 }}>
            <label>จุดวาง/แผนก</label>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
              <option value="ER">ห้องฉุกเฉิน (ER)</option>
              <option value="IPD">ตึกผู้ป่วยใน (IPD)</option>
              <option value="EMS">หน่วยกู้ชีพ (EMS)</option>
              <option value="all">ดูทั้งหมดทุกแผนก</option>
            </select>
          </div>
        </div>
      </div>

      <div className="equipment-list">
        {filteredData.map((equip) => {
          const stats = getEquipmentStats(equip);
          
          return (
            <div key={equip.id} className="equipment-card">
              <div className="equipment-header">
                <div className="equipment-title">
                  <h2>{equip.name}</h2>
                  <span>ประเภท: {equip.type} | จุดวาง: {equip.department}</span>
                </div>
                <div className="equipment-kpis">
                  <div className="kpi-mini-card">
                    <span className={`kpi-val ${stats.completionRate >= 80 ? 'blue' : 'red'}`}>{stats.completionRate}%</span>
                    <span className="kpi-lbl">ร้อยละการตรวจสอบ</span>
                  </div>
                  <div className="kpi-mini-card">
                    <span className={`kpi-val ${stats.readinessRate === 100 ? 'green' : 'red'}`}>{stats.readinessRate}%</span>
                    <span className="kpi-lbl">ร้อยละความพร้อมใช้</span>
                  </div>
                </div>
              </div>
              
              <div className="calendar-wrapper">
                <div className="section-header-row">
                  <div className="section-title">รอบการตรวจสอบรายเดือน</div>
                  <div className="legend">
                    <div className="legend-item"><div className="indicator green"></div> พร้อมใช้งาน</div>
                    <div className="legend-item"><div className="indicator red"></div> ต้องซ่อมบำรุง</div>
                    <div className="legend-item"><div className="indicator gray"></div> ขาดตรวจ</div>
                  </div>
                </div>
                {/* We pass an array containing just this equipment to the Calendar */}
                <Calendar year={gregorianYear} month={monthIndex} data={[equip]} />
              </div>
            </div>
          );
        })}
        
        {filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            ไม่มีข้อมูลเครื่องมือในแผนกที่เลือก
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
