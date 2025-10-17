import React, { useState, useEffect } from 'react';
import { Activity, Heart, Calendar, TrendingUp } from 'lucide-react';
import MetricsCharts from './MetricsCharts';

const HealthTracker = () => {
  const [metrics, setMetrics] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    steps: '',
    heart_rate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/metrics`;
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      params.append('t', Date.now().toString()); // cache-buster
      url += `?${params.toString()}`;

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      const sorted = data.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      setMetrics(sorted);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${API_URL}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          steps: formData.steps,          // send raw values; server validates & parses
          heart_rate: formData.heart_rate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save metric');
      }

      // Optimistic update with saved row
      const saved = await response.json(); // { id, date, steps, heart_rate, ... }
      setMetrics(prev =>
        [...prev, saved].sort((a, b) => new Date(a.date) - new Date(b.date))
      );

      setSuccess('Metric saved successfully!');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        steps: '',
        heart_rate: ''
      });

      // Keep state canonical
      fetchMetrics();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save metric');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const avgSteps =
    metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.steps, 0) / metrics.length)
      : 0;

  const avgHeartRate =
    metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.heart_rate, 0) / metrics.length)
      : 0;

  return (
    <div className="min-h-screen">
      {/* Header gradient */}
      <div
        className="py-8 px-4"
        style={{
          background:
            'linear-gradient(180deg, rgba(53,244,192,0.15) 0%, rgba(43,212,255,0.12) 100%)',
          borderBottom: '1px solid rgba(120,150,200,0.12)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
              <Activity className="w-7 h-7 text-[var(--accent-2)]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Health Tracker
            </h1>
          </div>
          <p className="text-[var(--muted)] text-base">
            Advanced Health Metrics Dashboard
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats quick glance — top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--muted)] text-xs font-semibold uppercase mb-1">Total entries</p>
                <p className="text-4xl font-bold text-white">{metrics.length}</p>
              </div>
              <Calendar className="w-14 h-14 text-[var(--accent-2)] opacity-60" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--muted)] text-xs font-semibold uppercase mb-1">Avg steps</p>
                <p className="text-4xl font-bold text-white">{avgSteps.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-14 h-14 text-[var(--accent)] opacity-60" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--muted)] text-xs font-semibold uppercase mb-1">Avg heart rate</p>
                <p className="text-4xl font-bold text-white">
                  {avgHeartRate} <span className="text-xl">bpm</span>
                </p>
              </div>
              <Heart className="w-14 h-14 text-[#ff7aa0] opacity-60" />
            </div>
          </div>
        </div>

        {/* Add New Entry + Filter (combined) */}
        <div className="card">
          {/* Heading */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 rounded bg-gradient-to-b from-[var(--accent-2)] to-[var(--accent)]" />
            <h2 className="text-xl md:text-2xl font-semibold text-white">Add New Entry</h2>
          </div>

          {/* Add Entry row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase">
                Date
              </label>
              <div className="input-wrap">
                <Calendar className="w-5 h-5 input-icon" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase">
                Steps
              </label>
              <div className="input-wrap">
                <TrendingUp
                  className="w-5 h-5 input-icon"
                  strokeWidth={2.5}
                  style={{ color: 'var(--accent)' }}
                />
                <input
                  type="number"
                  placeholder="e.g. 8500"
                  min="0"
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            {/* Heart rate */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase">
                Heart Rate
              </label>
              <div className="input-wrap">
                <Heart className="w-5 h-5 input-icon" style={{ color: 'var(--danger)' }} strokeWidth={2.25} />
                <input
                  type="number"
                  placeholder="e.g. 72"
                  min="30"
                  max="220"
                  value={formData.heart_rate}
                  onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            {/* Button */}
            <div className="flex lg:items-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary animate-glow w-full"
              >
                {loading ? 'Saving…' : 'Add Entry'}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div
              className="mt-6 p-4 rounded-xl"
              style={{
                background: 'rgba(255, 91, 110, 0.08)',
                border: '1px solid rgba(255, 91, 110, 0.35)',
                color: '#ffb3bd',
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="mt-6 p-4 rounded-xl"
              style={{
                background: 'rgba(53, 244, 192, 0.08)',
                border: '1px solid rgba(53, 244, 192, 0.35)',
                color: '#bffbe9',
              }}
            >
              {success}
            </div>
          )}

          {/* Divider */}
          <div className="my-6 border-t hr" />

          {/* Filter section */}
          <h3 className="text-sm font-semibold text-[var(--muted)] tracking-wide uppercase mb-4">
            Filter by Date Range
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Start */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-2">
                Start Date
              </label>
              <div className="input-wrap">
                <Calendar className="w-5 h-5 input-icon" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            {/* End */}
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-2">
                End Date
              </label>
              <div className="input-wrap">
                <Calendar className="w-5 h-5 input-icon" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            {/* Spacer on large if you want symmetry */}
            <div className="hidden lg:block" />

            {/* Clear button */}
            <div className="flex lg:items-end">
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="input-dark text-left hover:brightness-110 transition w-full"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>

        {/* Trend */}
        <div className="card">
          <MetricsCharts data={metrics} />
        </div>

        {/* Table */}
        <div className="card">
           <div className="flex items-center gap-2 mb-4">
    <div className="w-1.5 h-6 rounded bg-gradient-to-b from-[var(--accent-2)] to-[var(--accent)]" />
    <h2 className="text-xl md:text-2xl font-semibold text-white">All Entries</h2>
  </div>
          {metrics.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b hr">
                    <th className="text-left py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Steps</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[var(--muted)] uppercase">Heart rate</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={m.id || i} className="border-b hr hover:bg-[#0c1427] transition">
                      <td className="py-3 px-4 text-white">{m.date}</td>
                      <td className="py-3 px-4 text-[var(--accent-2)] font-semibold">{m.steps.toLocaleString()}</td>
                      <td className="py-3 px-4 text-[var(--accent)] font-semibold">{m.heart_rate} bpm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--muted)]">No entries yet. Start tracking!</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthTracker;
