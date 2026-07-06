import Papa from 'papaparse';
import { EQUIPMENT_SOURCES } from '../config';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [datePart] = dateStr.split(',');
  if (!datePart) return null;
  const parts = datePart.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
};

const determineStatus = (row) => {
  for (const key in row) {
    if (key === 'ประทับเวลา' || key === 'คะแนน' || key === 'ชื่อ-สกุลผู้ตรวจสอบ' || key === 'ประจำเวร') continue;
    const val = String(row[key] || '');
    if (val.startsWith('0') || val.includes('ชำรุด')) {
      return 'Needs Maintenance';
    }
  }
  return 'Ready';
};

const determineShift = (shiftStr) => {
  if (!shiftStr) return 0;
  if (shiftStr.includes('1 เช้า') || shiftStr.includes('1')) return 1;
  if (shiftStr.includes('2 บ่าย') || shiftStr.includes('2')) return 2;
  if (shiftStr.includes('3 ดึก') || shiftStr.includes('3')) return 3;
  return 1; // fallback
};

export const fetchAllEquipmentData = async () => {
  const promises = EQUIPMENT_SOURCES.map(source => {
    return new Promise((resolve) => {
      Papa.parse(source.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
          const data = results.data;
          const validData = data.filter(row => row['ประทับเวลา']);
          
          if (validData.length === 0) {
             resolve({ ...source, history: [], historyByDate: {} });
             return;
          }

          // Process history
          const history = validData.map(row => {
            const date = parseDate(row['ประทับเวลา']);
            return {
              date: date,
              dateStr: row['ประทับเวลา'],
              inspector: row['ชื่อ-สกุลผู้ตรวจสอบ'] || 'N/A',
              shift: determineShift(row['ประจำเวร']),
              status: determineStatus(row),
              raw: row
            };
          }).filter(item => item.date !== null);

          // Group by Date String (YYYY-MM-DD)
          const historyByDate = {};
          history.forEach(item => {
            const d = item.date;
            const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!historyByDate[dateKey]) historyByDate[dateKey] = [];
            historyByDate[dateKey].push(item);
          });

          resolve({
            ...source,
            history: history,
            historyByDate: historyByDate
          });
        },
        error: (error) => {
          console.error(`Error fetching data for ${source.name}:`, error);
          resolve({ ...source, history: [], historyByDate: {} });
        }
      });
    });
  });

  return Promise.all(promises);
};
