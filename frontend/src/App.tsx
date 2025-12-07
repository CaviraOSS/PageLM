import React, { useState, useEffect, useMemo } from 'react';
import { Laptop, FilterState, SortOption } from './types';

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// --- Components ---

const LaptopCard: React.FC<{ laptop: Laptop }> = ({ laptop }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 flex flex-col h-full">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img 
          src={laptop.image} 
          alt={laptop.model} 
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-gray-800 shadow-sm">
          {laptop.brand}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{laptop.model}</h3>
        <p className="text-2xl font-bold text-primary mb-4">${laptop.price.toLocaleString()}</p>
        
        <div className="space-y-2 mb-4 flex-grow">
          <div className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-gray-900 min-w-[80px]">Processor:</span>
            <span className="ml-1 truncate">{laptop.specs.processor}</span>
          </div>
          <div className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-gray-900 min-w-[80px]">RAM:</span>
            <span className="ml-1">{laptop.specs.ram}</span>
          </div>
          <div className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-gray-900 min-w-[80px]">Storage:</span>
            <span className="ml-1">{laptop.specs.storage}</span>
          </div>
          <div className="flex items-start text-sm text-gray-600">
            <span className="font-medium text-gray-900 min-w-[80px]">Display:</span>
            <span className="ml-1 truncate">{laptop.specs.display}</span>
          </div>
        </div>

        <button className="w-full mt-auto bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          View Details
        </button>
      </div>
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center">
    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
    <h2 className="text-xl font-semibold text-gray-800">Loading Laptops from Google Sheet...</h2>
    <p className="text-gray-500 mt-2">Fetching the latest inventory data.</p>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center p-6 bg-red-50 rounded-xl border border-red-100">
    <div className="w-12 h-12 text-red-500 mb-3">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </div>
    <h3 className="text-lg font-bold text-red-800 mb-2">Something went wrong</h3>
    <p className="text-red-600 mb-4 max-w-md">{message}</p>
    <button 
      onClick={onRetry}
      className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
    >
      Try Again
    </button>
  </div>
);

// --- Main App ---

export default function App() {
  // Data State
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort State
  const [sortOption, setSortOption] = useState<SortOption>('price-asc');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    brands: [],
    minPrice: 0,
    maxPrice: 5000,
    minRam: 0,
  });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // --- Fetching Logic ---
  const fetchLaptops = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/get-laptops');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      // Basic validation to ensure we got an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }
      
      setLaptops(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred while loading data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaptops();
  }, []);

  // --- Derived State (Filtering & Sorting) ---

  const availableBrands = useMemo(() => {
    const brands = new Set(laptops.map(l => l.brand));
    return Array.from(brands).sort();
  }, [laptops]);

  const filteredLaptops = useMemo(() => {
    return laptops
      .filter(laptop => {
        // Search
        if (filters.search && !laptop.model.toLowerCase().includes(filters.search.toLowerCase()) && !laptop.brand.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        // Brands
        if (filters.brands.length > 0 && !filters.brands.includes(laptop.brand)) {
          return false;
        }
        // Price
        if (laptop.price < filters.minPrice || laptop.price > filters.maxPrice) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          case 'name-asc': return a.model.localeCompare(b.model);
          default: return 0;
        }
      });
  }, [laptops, filters, sortOption]);

  // --- Handlers ---

  const handleBrandToggle = (brand: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-white p-1.5 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">SheetSpec<span className="text-primary">.</span></h1>
            </div>

            <div className="flex-1 max-w-lg mx-8 hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search brands, models..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
               <button 
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
               >
                 <FilterIcon />
               </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Search Bar (Below header on mobile) */}
        <div className="md:hidden border-t border-gray-200 p-4 bg-white">
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <aside className={`md:w-64 flex-shrink-0 ${isMobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
            <div className="sticky top-24 space-y-8">
              
              {/* Brands */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Brands</h3>
                <div className="space-y-2">
                  {availableBrands.length === 0 && isLoading ? (
                    <div className="h-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.brands.includes(brand)}
                          onChange={() => handleBrandToggle(brand)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900">{brand}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Max Price: ${filters.maxPrice}</h3>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>$500</span>
                  <span>$5000+</span>
                </div>
              </div>

            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
              <h2 className="text-lg font-medium text-gray-900">
                {isLoading ? 'Checking inventory...' : `${filteredLaptops.length} Results`}
              </h2>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchLaptops} />
            ) : filteredLaptops.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLaptops.map(laptop => (
                  <LaptopCard key={laptop.id} laptop={laptop} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No laptops found</h3>
                <p className="text-gray-500">Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => setFilters({ search: '', brands: [], minPrice: 0, maxPrice: 5000, minRam: 0 })}
                  className="mt-4 text-primary hover:text-blue-700 font-medium text-sm"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
