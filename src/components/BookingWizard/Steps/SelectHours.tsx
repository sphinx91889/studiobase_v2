import React from 'react';
import { Clock } from 'lucide-react';
import { formatPrice } from '../../../lib/utils';

interface SelectHoursProps {
  minimumHours: number;
  hourlyRate: number;
  selectedHours: number;
  onHoursChange: (hours: number) => void;
  onNext: () => void;
}

export function SelectHours({ 
  minimumHours, 
  hourlyRate, 
  selectedHours, 
  onHoursChange, 
  onNext 
}: SelectHoursProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">How long do you need?</h2>
        <p className="mt-2 text-gray-600">
          Select the number of hours you'd like to book
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Hours</span>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min={minimumHours}
              value={selectedHours}
              onChange={(e) => onHoursChange(Math.max(minimumHours, parseInt(e.target.value)))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Minimum booking: {minimumHours} hours
          </p>
        </label>

        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Rate per hour</span>
            <span>{formatPrice(hourlyRate)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
            <span>Hours</span>
            <span>× {selectedHours}</span>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="flex items-center justify-between font-medium">
              <span>Total</span>
              <span>{formatPrice(hourlyRate * selectedHours)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue to Select Time
        </button>
      </div>
    </div>
  );
}
