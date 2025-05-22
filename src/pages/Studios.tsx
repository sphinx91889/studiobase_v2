import React from 'react';
import { useState } from 'react';
import { useStudios } from '../hooks/useStudios';
import { StudioCard } from '../components/StudioCard';
import { SearchFilters } from '../components/SearchFilters';
import { Music } from 'lucide-react';

export function Studios() {
  const [search, setSearch] = useState('');
  const { studios, loading, error } = useStudios();

  const filteredStudios = studios.filter(studio => {
    const searchLower = search.toLowerCase();
    return (
      studio.name.toLowerCase().includes(searchLower) ||
      studio.city.toLowerCase().includes(searchLower) ||
      studio.state.toLowerCase().includes(searchLower) ||
      studio.country.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Recording Studios</h1>
        <p className="text-xl text-gray-600">
          Find and book the perfect studio for your next session
        </p>
      </header>

      <SearchFilters search={search} onSearchChange={setSearch} />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading studios...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
        </div>
      ) : filteredStudios.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">
            {search
              ? "No studios found matching your search"
              : "No studios available at the moment"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Showing {filteredStudios.length} studio
            {filteredStudios.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudios.map(studio => (
              <StudioCard key={studio.id} studio={studio} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
