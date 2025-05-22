import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, CreditCard, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StudioCard } from '../components/StudioCard';
import type { Studio } from '../types/database';

export function Home() {
  const [featuredStudios, setFeaturedStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedStudios() {
      const { data } = await supabase
        .from('studios')
        .select(`
          *,
          organization:organizations(name, logo_url),
          rooms(
            id,
            name,
            hourly_rate,
            room_type:room_types(name)
          )
        `)
        .limit(3)
        .order('created_at', { ascending: false });

      setFeaturedStudios(data || []);
      setLoading(false);
    }

    loadFeaturedStudios();
  }, []);

  return (
    <div className="space-y-16">
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5" />
        <div className="relative">
          <div className="text-center space-y-8">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight">
              Find Your Perfect Recording Space
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Book professional recording studios, mixing rooms, and podcast spaces.
              Your next hit starts here.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/studios"
                className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Browse Studios
              </Link>
              <Link
                to="/signup"
                className="inline-block bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-50 transition-colors"
              >
                List Your Studio
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-gray-50 to-white py-16 -mx-4 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl font-bold">Featured Studios</h2>
            <p className="text-gray-600">
              Discover our latest and most popular recording spaces
            </p>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading studios...</p>
            </div>
          ) : featuredStudios.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="mt-4 text-gray-600">No studios available yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredStudios.map((studio) => (
                <StudioCard key={studio.id} studio={studio} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="text-center space-y-4">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold">Easy Search</h3>
          <p className="text-gray-600">
            Find the perfect studio based on location, type, and equipment
          </p>
        </div>

        <div className="text-center space-y-4">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold">Real-time Availability</h3>
          <p className="text-gray-600">
            See instant availability and book your sessions with ease
          </p>
        </div>

        <div className="text-center space-y-4">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold">Secure Payments</h3>
          <p className="text-gray-600">
            Book with confidence using our secure payment system
          </p>
        </div>
      </section>
    </div>
  );
}
