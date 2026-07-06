import Papa from 'papaparse';
import { EQUIPMENT_SOURCES } from '../config';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // Google Sheets format often: DD/MM/YYYY, HH:MM:SS
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
  // A heuristic: if any value starts with "0" or contains "ชำรุด", it needs maintenance
  for (const key in row) {
    if (key === 'ประทับเวลา' || key === 'คะแนน' || key === 'ชื่อ-สกุลผู้ตรวจสอบ' || key === 'ประจำเวร') continue;
    const val = String(row[key] || '');
    if (val.startsWith('0') || val.includes('ชำรุด')) {
      return 'Needs Maintenance';
    }
  }
  return 'Ready';
};

export const fetchAllEquipmentData = async () => {
  const promises = EQUIPMENT_SOURCES.map(source => {
    return new Promise((resolve) => {
      Papa.parse(source.csvUrl, {
        download: true,
        header: true,
        complete: (results) => {
          const data = results.data;
          // Filter out empty rows
          const validData = data.filter(row => row['ประทับเวลา']);
          
          if (validData.length === 0) {
             resolve({
                ...source,
                latestInspection: null,
                status: 'Unknown',
                history: []
             });
             return;
          }

          // Process history
          const history = validData.map(row => {
            const date = parseDate(row['ประทับเวลา']);
            return {
              date: date,
              dateStr: row['ประทับเวลา'],
              inspector: row['ชื่อ-สกุลผู้ตรวจสอบ'] || 'N/A',
              status: determineStatus(row),
              raw: row
            };
          }).filter(item => item.date !== null);

          // Sort by date descending
          history.sort((a, b) => b.date - a.date);

          const latest = history[0];

          resolve({
            ...source,
            latestInspection: latest ? latest.dateStr : null,
            latestInspector: latest ? latest.inspector : null,
            status: latest ? latest.status : 'Unknown',
            history: history
          });
        },
        error: (error) => {
          console.error(`Error fetching data for ${source.name}:`, error);
          resolve({
            ...source,
            latestInspection: null,
            status: 'Error',
            history: []
          });
        }
      });
    });
  });

  return Promise.all(promises);
};
