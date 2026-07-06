import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllEquipmentData } from './utils/dataService';
import Calendar from './components/Calendar';
import './App.css';

const getChecklist = (type) => {
  if (type === 'เครื่องกระตุกหัวใจ') return [
    '(1) จอแสดงผลความพร้อมใช้เบื้องต้น',
    '(2) ตัว paddle defibrillator ประจำเครื่อง',
    '(3) ความพร้อมใช้แบตเตอรี่',
    '(4) ผลทดสอบระบบความพร้อมใช้ของเครื่อง(Delivery test)',
    '(5) Electrode pads(อุปกรณ์สำรองมากับเครื่องสำหรับระบบAED)',
    '(6) แผ่นอิเลคโทรด (Red Dot Electrode) EKG',
    '(7) กระดาษปริ้นเตอร์ เครื่องdefibrillator',
    '(8) Electrode Gel',
    '(9) อุปกรณ์วัดความดันโลหิต BP(สำหรับเด็กและผู้ใหญ่)',
    '(10) อุปกรณ์วัดออกซิเจนปลายนิ้วมือ'
  ];
  if (type === 'เครื่องปั๊มหัวใจอัตโนมัติ') return [
    '(1) แบตเตอรี่เต็มหรือไม่',
    '(2) เครื่องแสดงผลผิดปกติหรือไม่',
    '(3) จำนวนแผ่นรองสำหรับกดหน้าอก',
    '(4) อุปกรณ์เสริมของเครื่องปั๊มหัวใจอัตโนมัติ ครบถ้วนหรือไม่'
  ];
  if (type === 'กล่องพยาบาล EMS') return [
    '1.1 ปรอทวัดไข้',
    '1.2 เครื่องเจาะ DTX พร้อมชุดเจาะ',
    '1.3 Tourniquet',
    '1.4 กระปุกออกซิเจน',
    '1.5 O2 Cannula',
    '1.6 O2 Mask with bag',
    '1.7 T-way',
    '2.1 Medi-cut No.18,20,22,24 อย่างละ 2 ชิ้น',
    '2.2 Syringe ขนาด 3,5,10,20,50 อย่างละ 2 ชิ้น',
    '2.3 Needle No 18,20,21,23,24 อย่างละ 3 ชิ้น',
    '2.4 Elastic bandage ขนาด 3" 4" 6" อย่างละ 2 ชิ้น',
    '2.5 Set IV เด็กและผู้ใหญ่ อย่างละ 2 ชิ้น',
    '2.6 0.9% NSS 1000 ml. ต้องมีจำนวน 1 ขวด',
    '2.7 5% DN/2 1000 ml. ต้องมีจำนวน 1 ขวด',
    '2.8 50% Glucose inj. 50 ml. ต้องมีจำนวน 1 ขวด',
    '2.9 Sterile water 100 ml. ต้องมีจำนวน 1 ขวด',
    '2.10 Transpore 1 " ต้องมีจำนวน 2 ชิ้น',
    '2.11 Alcohol Ball ต้องมีจำนวน 2 แพ็ก',
    '2.12 อุปกรณ์ชุดทำแผล'
  ];
  return [];
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentYearStr = String(new Date().getFullYear() + 543);
  const currentMonthStr = String(new Date().getMonth());

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedLocation, setSelectedLocation] = useState('ER');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedData = await fetchAllEquipmentData();
      setData(fetchedData);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    let fd = data;
    if (selectedLocation !== 'all') fd = fd.filter(d => d.department === selectedLocation);
    return fd;
  }, [data, selectedLocation]);

  const gregorianYear = parseInt(selectedYear) - 543;
  const monthIndex = parseInt(selectedMonth);
  const daysInMonth = new Date(gregorianYear, monthIndex + 1, 0).getDate();

  const getEquipmentStats = (equip) => {
    const expectedPerDay = equip.type === 'กล่องพยาบาล EMS' ? 1 : 3;
    const totalExpected = expectedPerDay * daysInMonth;
    
    let totalCompleted = 0;
    let totalReady = 0;

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
          const checklist = getChecklist(equip.type);
          
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

              <div className="equipment-actions">
                {equip.formUrl && (
                  <a href={equip.formUrl} target="_blank" rel="noopener noreferrer" className="btn-form">
                    📝 กรอกแบบตรวจสอบ
                  </a>
                )}
                
                {checklist.length > 0 && (
                  <details className="checklist-details">
                    <summary>ดูรายการตรวจสอบ (Checklist)</summary>
                    <ul className="checklist-ul">
                      {checklist.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              
              <div className="calendar-wrapper">
                <div className="section-header-row">
                  <div className="section-title">
                    รอบการตรวจสอบรายเดือน 
                    <span className="subtitle-note">(จุดสี 3 จุด แสดงเวร: ดึก / เช้า / บ่าย)</span>
                  </div>
                  <div className="legend">
                    <div className="legend-item"><div className="indicator green"></div> พร้อมใช้งาน</div>
                    <div className="legend-item"><div className="indicator red"></div> ต้องซ่อมบำรุง</div>
                    <div className="legend-item"><div className="indicator gray"></div> ขาดตรวจ</div>
                  </div>
                </div>
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
