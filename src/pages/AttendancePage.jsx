// src/pages/AttendancePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { QrCode, CheckCircle, XCircle, Clock, ChevronDown, Calendar } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import QRCheckModal from '../components/attendance/QRCheckModal';

export default function AttendancePage() {
  const { profile, darkMode } = useApp();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [checkModal, setCheckModal] = useState(null); // { type: 'in'|'out', data }
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (profile) loadRecords();
    return () => stopScanner();
  }, [profile]);

  async function loadRecords() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', profile.id)
      .order('date', { ascending: false })
      .limit(30);
    setRecords(data || []);
    setTodayRecord(data?.find(r => r.date === today) || null);
    setLoading(false);
  }

  async function resolveScannedEmployee(decodedText) {
    let scanData = null;

    if (decodedText?.startsWith('{')) {
      try {
        scanData = JSON.parse(decodedText);
      } catch {
        scanData = null;
      }
    }

    if (!scanData) {
      scanData = { rawValue: decodedText?.trim() };
    }

    let query = supabase.from('profiles').select('*').maybeSingle();

    if (scanData.employee_id) {
      query = query.eq('id', scanData.employee_id);
    } else if (scanData.email) {
      query = query.eq('email', scanData.email);
    } else if (scanData.employee_code) {
      query = query.eq('employee_id', scanData.employee_code);
    } else if (scanData.rawValue) {
      const value = scanData.rawValue;
      if (value.includes('@')) {
        query = query.eq('email', value);
      } else if (value.length === 36 && value.includes('-')) {
        query = query.eq('id', value);
      } else {
        query = query.eq('employee_id', value);
      }
    }

    const { data, error } = await query;
    if (error || !data) return null;

    return data;
  }

  async function startScanner() {
    setScanning(true);
    setScanResult(null);
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode('qr-reader');
        html5QrcodeRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            stopScanner();
            const employeeData = await resolveScannedEmployee(decodedText);
            if (employeeData) {
              setScanResult({ data: employeeData });
              setCheckModal({ employeeData });
            } else {
              setScanResult({ data: { full_name: 'Unknown employee', employee_id_code: decodedText } });
              setCheckModal({ employeeData: { full_name: 'Unknown employee', department: 'Unknown', employee_id: null, employee_code: decodedText } });
            }
          },
          () => {}
        );
      } catch (err) {
        console.error('Scanner error:', err);
        // Kiosk demo mode — simulate scanning current profile
        const demoData = {
          employee_id: profile?.id,
          full_name: profile?.full_name,
          department: profile?.department,
          employee_code: profile?.employee_id,
          profile_photo_url: profile?.profile_photo_url,
        };
        setScanResult({ data: demoData });
        setCheckModal({ employeeData: demoData });
        setScanning(false);
      }
    }, 100);
  }

  async function stopScanner() {
    if (html5QrcodeRef.current) {
      try { await html5QrcodeRef.current.stop(); } catch {}
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  }

  async function handleConfirmAttendance(actionType, employeeData) {
    const now = new Date().toISOString();
    const targetEmployeeId = employeeData?.employee_id || employeeData?.id;
    if (!targetEmployeeId) {
      setCheckModal(null);
      return;
    }

    if (actionType === 'in') {
      const { data: existing } = await supabase.from('attendance')
        .select('*')
        .eq('employee_id', targetEmployeeId)
        .eq('date', today)
        .maybeSingle();

      let err;
      if (existing) {
        const { error } = await supabase.from('attendance').update({
          check_in: now,
          status: new Date().getHours() > 9 ? 'late' : 'present',
        }).eq('id', existing.id);
        err = error;
      } else {
        const { error } = await supabase.from('attendance').insert({
          employee_id: targetEmployeeId,
          date: today,
          check_in: now,
          status: new Date().getHours() > 9 ? 'late' : 'present',
        });
        err = error;
      }

      if (!err) {
        setCheckModal(null);
        loadRecords();
      }
    } else {
      const { data: existing } = await supabase.from('attendance')
        .select('*')
        .eq('employee_id', targetEmployeeId)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        const checkIn = new Date(existing.check_in);
        const checkOut = new Date(now);
        const hours = (checkOut - checkIn) / (1000 * 60 * 60);

        await supabase.from('attendance').update({
          check_out: now,
          work_hours: parseFloat(hours.toFixed(2)),
        }).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert({
          employee_id: targetEmployeeId,
          date: today,
          check_out: now,
          status: 'present',
        });
      }
      setCheckModal(null);
      loadRecords();
    }
  }

  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;

  const statusBadge = (status) => {
    const map = {
      present: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      late: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      absent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      half_day: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Scan any employee QR code here, then confirm their details and check them in or out.
        </p>
      </div>

      {/* Today card */}
      <div className={card}>
        <h2 className="font-semibold mb-4">Today — {format(new Date(), 'EEEE, MMMM d')}</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Status</p>
            <p className="font-semibold text-sm mt-1 capitalize">{todayRecord?.status || '—'}</p>
          </div>
          <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Check In</p>
            <p className="font-semibold text-sm mt-1">
              {todayRecord?.check_in ? format(new Date(todayRecord.check_in), 'hh:mm a') : '—'}
            </p>
          </div>
          <div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Check Out</p>
            <p className="font-semibold text-sm mt-1">
              {todayRecord?.check_out ? format(new Date(todayRecord.check_out), 'hh:mm a') : '—'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center">
          <button
            onClick={() => startScanner()}
            disabled={scanning}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
          >
            <QrCode size={18} />
            Scan Employee QR Code
          </button>
        </div>
      </div>

      {/* QR Scanner */}
      {scanning && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Scanning…</h2>
            <button onClick={stopScanner} className="text-red-500 text-sm font-medium">Cancel</button>
          </div>
          <div id="qr-reader" className="overflow-hidden rounded-xl" />
          <p className={`text-xs text-center mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Point your camera at the employee QR code
          </p>
        </div>
      )}

      {/* History */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Attendance History</h2>
          <div className="flex items-center gap-1 text-sm text-red-500">
            <Calendar size={14} />
            <span>Last 30 days</span>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : records.length === 0 ? (
          <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No attendance records</div>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.status === 'present' ? 'bg-green-100 dark:bg-green-900/30' : r.status === 'late' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {r.status === 'present' ? <CheckCircle size={16} className="text-green-500" /> :
                      r.status === 'late' ? <Clock size={16} className="text-amber-500" /> :
                      <XCircle size={16} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{format(parseISO(r.date), 'EEE, MMM d')}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {r.check_in ? format(new Date(r.check_in), 'hh:mm a') : '--'}
                      {' – '}
                      {r.check_out ? format(new Date(r.check_out), 'hh:mm a') : '--'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.work_hours && <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{r.work_hours}h</span>}
                  <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${statusBadge(r.status)}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Check confirmation modal */}
      {checkModal && (
        <QRCheckModal
          employeeData={checkModal.employeeData}
          profile={profile}
          darkMode={darkMode}
          onConfirm={(actionType) => handleConfirmAttendance(actionType, checkModal.employeeData)}
          onClose={() => setCheckModal(null)}
        />
      )}
    </div>
  );
}
