import React, { useState, useEffect, useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchAllEquipmentData } from './utils/dataService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState('2568');
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedData = await fetchAllEquipmentData();
      setData(fetchedData);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter data based on selected year/month
  // The data structure contains a 'history' array of inspections for each equipment.
  // We need to find the latest inspection within the selected timeframe.
  const filteredData = useMemo(() => {
    if (!data.length) return [];

    return data.map(equip => {
      let validHistory = equip.history;
      
      if (selectedYear !== 'all') {
        const gregorianYear = parseInt(selectedYear) - 543;
        validHistory = validHistory.filter(h => h.date && h.date.getFullYear() === gregorianYear);
      }
      
      if (selectedMonth !== 'all') {
        const monthIndex = parseInt(selectedMonth);
        validHistory = validHistory.filter(h => h.date && h.date.getMonth() === monthIndex);
      }

      const latestInPeriod = validHistory.length > 0 ? validHistory[0] : null;
      
      return {
        ...equip,
        currentStatus: latestInPeriod ? latestInPeriod.status : 'Unknown',
        currentInspectionDate: latestInPeriod ? latestInPeriod.dateStr : 'ไม่มีข้อมูลในดือนนี้',
        currentInspector: latestInPeriod ? latestInPeriod.inspector : '-',
      };
    });
  }, [data, selectedYear, selectedMonth]);

  const kpis = useMemo(() => {
    const counts = {
      ER: { ready: 0, maintenance: 0 },
      IPD: { ready: 0, maintenance: 0 },
      EMS: { ready: 0, maintenance: 0 }
    };

    filteredData.forEach(eq => {
      if (eq.currentStatus === 'Ready') {
        if (counts[eq.department]) counts[eq.department].ready++;
      } else if (eq.currentStatus === 'Needs Maintenance') {
        if (counts[eq.department]) counts[eq.department].maintenance++;
      }
    });

    return counts;
  }, [filteredData]);

  const chartData = useMemo(() => {
    const types = ['Defibrillator', 'Auto CPR', 'EMS Box'];
    const readyCounts = [0, 0, 0];
    const maintCounts = [0, 0, 0];

    filteredData.forEach(eq => {
      let idx = types.indexOf(eq.type);
      if (idx !== -1) {
        if (eq.currentStatus === 'Ready') readyCounts[idx]++;
        else if (eq.currentStatus === 'Needs Maintenance') maintCounts[idx]++;
      }
    });

    return {
      labels: types,
      datasets: [
        {
          label: 'พร้อมใช้งาน (Ready)',
          data: readyCounts,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
        },
        {
          label: 'ซ่อมบำรุง (Maintenance)',
          data: maintCounts,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
        }
      ]
    };
  }, [filteredData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#f8fafc' } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8', stepSize: 1 },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { display: false }
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>กำลังดึงข้อมูลจาก Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-title">
          <h1>Medical Equipment Dashboard</h1>
          <p>ระบบจัดการเครื่องมือทางการแพทย์ที่มีความเสี่ยงสูง</p>
        </div>
        <div className="filters">
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
              <option value="all">ทุกเดือน</option>
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
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card er">
          <div className="kpi-header">
            <div className="kpi-title">ห้องฉุกเฉิน (ER)</div>
            <Activity color="#ef4444" size={24} />
          </div>
          <div className="kpi-stats">
            <div className="stat-item ready">
              <span className="stat-value">{kpis.ER.ready}</span>
              <span className="stat-label">พร้อมใช้งาน</span>
            </div>
            <div className="stat-item maintenance">
              <span className="stat-value">{kpis.ER.maintenance}</span>
              <span className="stat-label">ซ่อมบำรุง</span>
            </div>
          </div>
        </div>
        
        <div className="kpi-card ipd">
          <div className="kpi-header">
            <div className="kpi-title">ตึกผู้ป่วยใน (IPD)</div>
            <Activity color="#3b82f6" size={24} />
          </div>
          <div className="kpi-stats">
            <div className="stat-item ready">
              <span className="stat-value">{kpis.IPD.ready}</span>
              <span className="stat-label">พร้อมใช้งาน</span>
            </div>
            <div className="stat-item maintenance">
              <span className="stat-value">{kpis.IPD.maintenance}</span>
              <span className="stat-label">ซ่อมบำรุง</span>
            </div>
          </div>
        </div>

        <div className="kpi-card ems">
          <div className="kpi-header">
            <div className="kpi-title">ออกเหตุ (EMS)</div>
            <ShieldAlert color="#10b981" size={24} />
          </div>
          <div className="kpi-stats">
            <div className="stat-item ready">
              <span className="stat-value">{kpis.EMS.ready}</span>
              <span className="stat-label">พร้อมใช้งาน</span>
            </div>
            <div className="stat-item maintenance">
              <span className="stat-value">{kpis.EMS.maintenance}</span>
              <span className="stat-label">ซ่อมบำรุง</span>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="chart-section">
          <div className="section-title">อัตราความพร้อมใช้งานแยกตามประเภท (ในเดือนที่เลือก)</div>
          <div className="chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="table-section">
          <div className="section-title">ประวัติการตรวจสอบล่าสุด (อัปเดตตามตัวกรอง)</div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>อุปกรณ์</th>
                  <th>แผนก</th>
                  <th>วันที่ตรวจสอบ (ล่าสุด)</th>
                  <th>ผู้ตรวจสอบ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name} ({item.type})</td>
                    <td>{item.department}</td>
                    <td>{item.currentInspectionDate}</td>
                    <td>{item.currentInspector}</td>
                    <td>
                      <span className={`status-badge ${
                        item.currentStatus === 'Ready' ? 'ready' : 
                        item.currentStatus === 'Needs Maintenance' ? 'maintenance' : 'unknown'
                      }`}>
                        {item.currentStatus === 'Ready' ? <CheckCircle size={14} /> : 
                         item.currentStatus === 'Needs Maintenance' ? <AlertTriangle size={14} /> : null}
                        {item.currentStatus === 'Ready' ? 'พร้อมใช้งาน' : 
                         item.currentStatus === 'Needs Maintenance' ? 'ต้องซ่อมบำรุง' : 'ไม่มีข้อมูล'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
