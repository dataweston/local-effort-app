import React, { useState } from 'react';
import { Upload, Check, X, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const CSVImporter = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',');
      
      const parsed = rows.slice(1).map((row, i) => {
        const values = row.split(',');
        const obj = { _rowNum: i + 2 };
        headers.forEach((h, j) => { obj[h.trim()] = values[j]?.trim(); });
        return obj;
      });
      
      const validationErrors = [];
      parsed.forEach((row, i) => {
        if (!row.title) validationErrors.push(`Row ${row._rowNum}: Missing title`);
        if (!row.start_date) validationErrors.push(`Row ${row._rowNum}: Missing start_date`);
        if (row.start_date && isNaN(Date.parse(row.start_date))) validationErrors.push(`Row ${row._rowNum}: Invalid date format`);
        if (row.capacity && (isNaN(row.capacity) || Number(row.capacity) < 0)) validationErrors.push(`Row ${row._rowNum}: Invalid capacity`);
      });
      
      setPreview(parsed);
      setErrors(validationErrors);
    };
    reader.readAsText(selectedFile);
  };
  
  const handleImport = async () => {
    if (errors.length > 0) return;
    setImporting(true);
    
    try {
      const cleanedData = preview.map(row => ({
        title: row.title,
        start_date: row.start_date,
        end_date: row.end_date || null,
        event_type: row.event_type || 'other',
        visibility: row.visibility || 'private',
        status: row.status || 'scheduled',
        location: row.location || '',
        capacity: row.capacity ? parseInt(row.capacity) : null,
        estimated_revenue: row.estimated_revenue ? parseFloat(row.estimated_revenue) : 0,
        estimated_food_cost: row.estimated_food_cost ? parseFloat(row.estimated_food_cost) : 0,
        estimated_labor_cost: row.estimated_labor_cost ? parseFloat(row.estimated_labor_cost) : 0,
        notes: row.notes || ''
      }));
      
      await onImport(cleanedData);
      setFile(null);
      setPreview([]);
      setErrors([]);
      onClose();
    } catch (error) {
      setErrors([error.message]);
    } finally {
      setImporting(false);
    }
  };
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-50 p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">Import Events from CSV</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800"><strong>Expected format:</strong> title, start_date, end_date, event_type, visibility, status, location, capacity, estimated_revenue, estimated_food_cost, estimated_labor_cost, notes</p>
              <p className="text-sm text-blue-800 mt-1">Date format: YYYY-MM-DD</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Upload CSV File</label>
              <input type="file" accept=".csv" onChange={handleFileChange} className="w-full px-3 py-2 border rounded-md" />
            </div>
            
            {errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="font-semibold text-red-800">Validation Errors ({errors.length})</p>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.slice(0, 10).map((err, i) => <li key={i}>• {err}</li>)}
                  {errors.length > 10 && <li>...and {errors.length - 10} more errors</li>}
                </ul>
              </div>
            )}
            
            {preview.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Preview ({preview.length} events)</h3>
                <div className="max-h-64 overflow-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Title</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Visibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{row.title}</td>
                          <td className="p-2">{row.start_date}</td>
                          <td className="p-2">{row.event_type || 'other'}</td>
                          <td className="p-2">{row.visibility || 'private'}</td>
                        </tr>
                      ))}
                      {preview.length > 20 && (
                        <tr><td colSpan={4} className="p-2 text-center text-gray-500">...and {preview.length - 20} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Dialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleImport}
                disabled={preview.length === 0 || errors.length > 0 || importing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : `Import ${preview.length} Events`}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CSVImporter;
