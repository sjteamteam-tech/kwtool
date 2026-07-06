import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, AlertTriangle, ListChecks } from 'lucide-react';
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
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedData = await fetchAllEquipmentData();
      setData(fetchedData);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter data
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    let fd = data;
    if (selectedType !== 'all') fd = fd.filter(d => d.type === selectedType);
    if (selectedLocation !== 'all') fd = fd.filter(d => d.department === selectedLocation);
    if (selectedEquipment !== 'all') fd = fd.filter(d => d.id === selectedEquipment);
    return fd;
  }, [data, selectedType, selectedLocation, selectedEquipment]);

  // Calculate compliance statistics for the current month
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalCompleted = 0;
    let totalDefects = 0;

    const gregorianYear = parseInt(selectedYear) - 543;
    const monthIndex = parseInt(selectedMonth);
    const daysInMonth = new Date(gregorianYear, monthIndex + 1, 0).getDate();

    filteredData.forEach(equip => {
      const expectedPerDay = equip.type === 'EMS Box' ? 1 : 3;
      totalExpected += expectedPerDay * daysInMonth;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${gregorianYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = equip.historyByDate[dateKey] || [];
        
        let shiftsCompleted = 0;
        let dayDefects = 0;
        
        const countedShifts = new Set();
        dayData.forEach(inspection => {
          if (!countedShifts.has(inspection.shift)) {
            countedShifts.add(inspection.shift);
            shiftsCompleted++;
          }
          if (inspection.status === 'Needs Maintenance') {
            dayDefects++;
          }
        });

        totalCompleted += Math.min(shiftsCompleted, expectedPerDay);
        totalDefects += dayDefects;
      }
    });

    const completionRate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

    return { totalExpected, totalCompleted, totalDefects, completionRate };
  }, [filteredData, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังดึงข้อมูลจาก Google Sheets...</p>
      </div>
    );
  }

  const gregorianYear = parseInt(selectedYear) - 543;
  const monthIndex = parseInt(selectedMonth);

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-title">
          <h1>Medical Equipment Dashboard</h1>
          <p>ระบบตรวจสอบความพร้อมใช้งานตามเกณฑ์ (Compliance Tracking)</p>
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
          <div className="filter-group">
            <label>ประเภท</label>
            <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setSelectedEquipment('all'); }}>
              <option value="all">ทุกประเภท</option>
              <option value="Defibrillator">Defibrillator</option>
              <option value="Auto CPR">Auto CPR</option>
              <option value="EMS Box">EMS Box</option>
            </select>
          </div>
          <div className="filter-group">
            <label>จุดวาง/แผนก</label>
            <select value={selectedLocation} onChange={(e) => { setSelectedLocation(e.target.value); setSelectedEquipment('all'); }}>
              <option value="all">ทุกจุดวาง</option>
              <option value="ER">ER</option>
              <option value="IPD">IPD</option>
              <option value="EMS">EMS</option>
            </select>
          </div>
          <div className="filter-group">
            <label>เครื่องเฉพาะเจาะจง</label>
            <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)}>
              <option value="all">ดูทั้งหมดที่เลือก</option>
              {data.filter(d => 
                (selectedType === 'all' || d.type === selectedType) && 
                (selectedLocation === 'all' || d.department === selectedLocation)
              ).map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.department})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--border-color': 'var(--accent-blue)' }}>
          <div className="kpi-header">
            <div className="kpi-title">อัตราการตรวจครบตามเกณฑ์</div>
            <ListChecks color="var(--accent-blue)" size={24} />
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>{stats.completionRate}%</span>
              <span className="stat-label">ตรวจไปแล้ว {stats.totalCompleted}/{stats.totalExpected} รอบ</span>
            </div>
          </div>
        </div>
        
        <div className="kpi-card" style={{ '--border-color': 'var(--accent-green)' }}>
          <div className="kpi-header">
            <div className="kpi-title">สถานะความพร้อมสูงสุด</div>
            <ShieldCheck color="var(--accent-green)" size={24} />
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-value" style={{ color: 'var(--accent-green)' }}>พร้อมใช้</span>
              <span className="stat-label">เกณฑ์ตรวจผ่านส่วนใหญ่</span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ '--border-color': 'var(--accent-red)' }}>
          <div className="kpi-header">
            <div className="kpi-title">พบข้อบกพร่อง/ชำรุด</div>
            <AlertTriangle color="var(--accent-red)" size={24} />
          </div>
          <div className="kpi-stats">
            <div className="stat-item">
              <span className="stat-value" style={{ color: 'var(--accent-red)' }}>{stats.totalDefects}</span>
              <span className="stat-label">ครั้งในเดือนนี้</span>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="calendar-section">
          <div className="section-header-row">
            <div className="section-title">ปฏิทินความพร้อมใช้งานรายเดือน</div>
            <div className="legend">
              <div className="legend-item"><div className="indicator green"></div> พร้อมใช้งาน</div>
              <div className="legend-item"><div className="indicator red"></div> ต้องซ่อมบำรุง</div>
              <div className="legend-item"><div className="indicator gray"></div> ขาดตรวจ</div>
            </div>
          </div>
          <Calendar year={gregorianYear} month={monthIndex} data={filteredData} />
        </div>
      </div>
    </div>
  );
}

export default App;
