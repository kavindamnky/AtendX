// src/components/attendance/QRCheckModal.jsx
import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, LogIn, LogOut, Building, Hash, X, QrCode } from 'lucide-react';

export default function QRCheckModal({ employeeData, profile, darkMode, onConfirm, onClose }) {
  const now = new Date();
  const displayProfile = employeeData || profile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white'}`}>
        {/* Header */}
        <div className="px-6 py-5 text-center relative bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X size={20} />
          </button>
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <QrCode size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Confirm Attendance
          </h2>
          <p className="text-white/80 text-sm mt-1">{format(now, 'hh:mm a, EEEE MMMM d')}</p>
        </div>

        {/* Employee details */}
        <div className="p-6 space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            {displayProfile?.profile_photo_url ? (
              <img src={displayProfile.profile_photo_url} alt="Profile" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-red-100 dark:ring-red-900/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-red-100 dark:ring-red-900/30">
                {(displayProfile?.full_name || displayProfile?.name || 'E').charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center">
            <h3 className="text-lg font-bold">{displayProfile?.full_name || displayProfile?.name || 'Employee'}</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{displayProfile?.department}</p>
          </div>

          <div className={`rounded-xl divide-y ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-gray-50 divide-gray-100'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Hash size={16} className="text-red-500" />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Employee ID</span>
              <span className="ml-auto text-sm font-medium">{displayProfile?.employee_id || displayProfile?.employee_code || '—'}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Building size={16} className="text-red-500" />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Department</span>
              <span className="ml-auto text-sm font-medium">{displayProfile?.department || '—'}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onConfirm('in')}
                className="py-3 rounded-xl font-semibold text-sm text-white transition shadow-lg bg-green-600 hover:bg-green-700 shadow-green-500/20 flex items-center justify-center gap-1.5"
              >
                <LogIn size={16} />
                Check In
              </button>
              <button
                onClick={() => onConfirm('out')}
                className="py-3 rounded-xl font-semibold text-sm text-white transition shadow-lg bg-red-600 hover:bg-red-700 shadow-red-500/20 flex items-center justify-center gap-1.5"
              >
                <LogOut size={16} />
                Check Out
              </button>
            </div>
            <button
              onClick={onClose}
              className={`w-full py-2.5 rounded-xl text-xs font-medium transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
