import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Loader2 } from 'lucide-react';

import React, { useState } from 'react';

interface PaymentFormProps {
  clientSecret: string;
  processing: boolean;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: any) => void;
  onBack: () => void;
}

function PaymentForm({ 
  clientSecret, 
  processing, 
  onSuccess, 
  onError,
  onBack 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;
      
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (confirmError) throw confirmError;

      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      } else {
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      onError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement className="mb-6" />
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <button
          type="submit"
          disabled={!stripe || processing}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </button>
      </div>

      <p className="mt-2 text-sm text-center text-gray-500">
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

interface PaymentStepProps {
  clientSecret: string;
  processing: boolean;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: any) => void;
  onBack: () => void;
}

export function Payment(props: PaymentStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
        <p className="mt-2 text-gray-600">
          Complete your booking by providing payment information
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        <PaymentForm {...props} />
      </div>
    </div>
  );
}
