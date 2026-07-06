import Papa from 'papaparse';
import { EQUIPMENT_SOURCES } from '../config';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [datePart] = dateStr.split(/[,\s]+/); // Split by comma or space to handle "22/6/2026 8:26:28" or "22/6/2026, 8:26:28"
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
    // Ignore meta columns
    if (key.includes('ประทับเวลา') || 
        key.includes('คะแนน') || 
        key.includes('ชื่อ') || 
        key.includes('เวร') || 
        key.includes('แผนก')) continue;
        
    const val = String(row[key] || '');
    if (val.startsWith('0') || val.includes('ชำรุด') || val.includes('ไม่พร้อม') || val.includes('ผิดปกติ') || val.includes('ไม่ครบ')) {
      return 'Needs Maintenance';
    }
  }
  return 'Ready';
};

const determineShift = (shiftStr) => {
  if (!shiftStr) return 0;
  // Night shift (00:00 - 08:00) -> Dot 1
  if (shiftStr.includes('ดึก') || (shiftStr.includes('3') && !shiftStr.includes('1') && !shiftStr.includes('2'))) return 1;
  // Morning shift (08:00 - 16:00) -> Dot 2
  if (shiftStr.includes('เช้า') || shiftStr.includes('1')) return 2;
  // Afternoon shift (16:00 - 00:00) -> Dot 3
  if (shiftStr.includes('บ่าย') || shiftStr.includes('2')) return 3;
  return 1; // fallback
};

const getColumnValue = (row, ...keywords) => {
  for (const key in row) {
    if (keywords.some(kw => key.includes(kw))) {
      return row[key];
    }
  }
  return undefined;
};

export const fetchAllEquipmentData = async () => {
  const promises = EQUIPMENT_SOURCES.map(source => {
    return new Promise((resolve) => {
      Papa.parse(source.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
          const data = results.data;
          
          // Filter valid rows (must have timestamp)
          const validData = data.filter(row => getColumnValue(row, 'ประทับเวลา'));
          
          if (validData.length === 0) {
             resolve({ ...source, history: [], historyByDate: {} });
             return;
          }

          // Process history
          const history = validData.map(row => {
            const timestamp = getColumnValue(row, 'ประทับเวลา');
            const date = parseDate(timestamp);
            const shiftVal = getColumnValue(row, 'เวร') || getColumnValue(row, 'ประจำเวร');
            const inspectorVal = getColumnValue(row, 'ชื่อ-สกุล', 'ชื่อ-นามสกุล', 'ผู้ตรวจสอบ');

            return {
              date: date,
              dateStr: timestamp,
              inspector: inspectorVal || 'N/A',
              shift: determineShift(shiftVal),
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
