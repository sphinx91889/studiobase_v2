import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeft, DollarSign } from 'lucide-react';
import { format, parse, addHours } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { formatPrice, formatTimezone } from '../../../lib/utils';

interface ReviewBookingProps {
  roomName: string;
  roomType: string;
  roomTimezone: string;
  selectedDate: string;
  selectedTime: string;
  hours: number;
  hourlyRate: number;
  onBack: () => void;
  onConfirm: () => void;
  processing: boolean;
}

export function ReviewBooking({
  roomName,
  roomType,
  roomTimezone,
  selectedDate,
  selectedTime,
  hours,
  hourlyRate,
  onBack,
  onConfirm,
  processing
}: ReviewBookingProps) {
  const [userTimezone, setUserTimezone] = useState<string>('');

  // Get user's timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  }, []);

  // Calculate end time
  const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
  const endDateTime = addHours(startDateTime, hours);
  
  // Format date and times
  const formattedDate = format(startDateTime, 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(startDateTime, 'h:mm a');
  const formattedEndTime = format(endDateTime, 'h:mm a');
  
  // Calculate total amount
  const totalAmount = hourlyRate * hours;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Review Your Booking</h2>
        <p className="mt-2 text-gray-600">
          Please confirm your booking details
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{roomName}</h3>
          <p className="text-gray-600">{roomType}</p>
        </div>

        <div className="flex items-start space-x-3 pt-2">
          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">{formattedDate}</p>
            <p className="text-sm text-gray-600">
              {roomTimezone && formatTimezone(roomTimezone)}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              {formattedStartTime} - {formattedEndTime}
            </p>
            <p className="text-sm text-gray-600">
              {hours} hour{hours !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              {formatPrice(totalAmount)}
            </p>
            <p className="text-sm text-gray-600">
              {formatPrice(hourlyRate)} × {hours} hour{hours !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        
        <button
          onClick={onConfirm}
          disabled={processing}
          className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Confirm & Pay'}
        </button>
      </div>
    </div>
  );
}
