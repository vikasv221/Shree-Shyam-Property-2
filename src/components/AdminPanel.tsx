import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Plus, Image as ImageIcon, Loader2, CheckCircle2, MapPin, Ruler, IndianRupee, FileText, Map, TrendingUp, Building, Eye, Home, Check, X, User, Phone, Users } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Property } from '../types';

interface AdminPanelProps {
  properties: Property[];
}

export default function AdminPanel({ properties }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'pending' | 'users'>('add');
  const [siteStats, setSiteStats] = useState({ totalVisits: 0 });
  const [users, setUsers] = useState<any[]>([]);
  
  // Form State
  const [type, setType] = useState<'plot' | 'house' | 'rental'>('plot');
  const [colony, setColony] = useState('');
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'analytics', 'site_stats'), (doc) => {
      if (doc.exists()) {
        setSiteStats(doc.data() as { totalVisits: number });
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by creation date descending
      usersData.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUsers(usersData);
    });

    return () => {
      unsubStats();
      unsubUsers();
    };
  }, []);

  const pendingProperties = properties.filter(p => p.status === 'pending');
  const approvedProperties = properties.filter(p => p.status === 'approved');

  const plots = approvedProperties.filter(p => p.type === 'plot' || !p.type);
  const houses = approvedProperties.filter(p => p.type === 'house');
  const rentals = approvedProperties.filter(p => p.type === 'rental');

  const sumViews = (props: Property[]) => props.reduce((sum, p) => sum + (p.views || 0), 0);

  const plotsViews = sumViews(plots);
  const housesViews = sumViews(houses);
  const rentalsViews = sumViews(rentals);

  const totalValue = approvedProperties.reduce((acc, plot) => {
    const num = parseInt(plot.price.replace(/[^0-9]/g, ''));
    return acc + (isNaN(num) ? 0 : num);
  }, 0);
  
  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lac`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colony || !village || !area || !image) {
      setError('कृपया सभी आवश्यक जानकारी भरें और एक फोटो चुनें।');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
      const compressedFile = await imageCompression(image, options);

      const storageRef = ref(storage, `properties/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'properties'), {
        type,
        status: 'approved', // Admin adds directly as approved
        colony,
        village,
        area,
        price,
        description,
        mapUrl,
        imageUrl: url,
        userId: 'admin',
        views: 0,
        createdAt: new Date().toISOString()
      });

      // Reset form
      setColony(''); setVillage(''); setArea(''); setPrice(''); setDescription(''); setMapUrl(''); setImage(null);
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error adding property:", err);
      setError(err.message || 'प्रॉपर्टी जोड़ने में विफल।');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'properties', id), { status: 'approved' });
    } catch (err) {
      console.error("Error approving:", err);
      alert("Failed to approve property.");
    }
  };

  const handleReject = async (id: string) => {
    if (window.confirm("Are you sure you want to reject and delete this submission?")) {
      try {
        await deleteDoc(doc(db, 'properties', id));
      } catch (err) {
        console.error("Error rejecting:", err);
        alert("Failed to reject property.");
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-amber-500/10 p-6 rounded-full">
            <Users className="w-12 h-12 text-amber-500/20" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Total Public Visits</p>
          <h3 className="text-3xl font-serif text-white">{siteStats.totalVisits}</h3>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-amber-500/10 p-6 rounded-full">
            <Map className="w-12 h-12 text-amber-500/20" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Plots (Views)</p>
          <h3 className="text-3xl font-serif text-white">{plots.length} <span className="text-lg text-zinc-500 font-sans">({plotsViews} views)</span></h3>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-amber-500/10 p-6 rounded-full">
            <Home className="w-12 h-12 text-amber-500/20" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Houses (Views)</p>
          <h3 className="text-3xl font-serif text-white">{houses.length} <span className="text-lg text-zinc-500 font-sans">({housesViews} views)</span></h3>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-amber-500/10 p-6 rounded-full">
            <Building className="w-12 h-12 text-amber-500/20" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Rentals (Views)</p>
          <h3 className="text-3xl font-serif text-white">{rentals.length} <span className="text-lg text-zinc-500 font-sans">({rentalsViews} views)</span></h3>
        </div>
        
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden lg:col-span-2">
          <div className="absolute -right-4 -top-4 bg-amber-500/10 p-6 rounded-full">
            <IndianRupee className="w-12 h-12 text-amber-500/20" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Portfolio Value</p>
          <h3 className="text-3xl font-serif text-white">{formatCurrency(totalValue)}</h3>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden cursor-pointer hover:bg-zinc-800 transition-colors lg:col-span-2" onClick={() => setActiveTab('pending')}>
          <div className="absolute -right-4 -top-4 bg-amber-500/10 p-6 rounded-full">
            <Eye className="w-12 h-12 text-amber-500/20" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">Pending Approvals</p>
          <h3 className="text-3xl font-serif text-amber-400">{pendingProperties.length}</h3>
          {pendingProperties.length > 0 && (
            <p className="text-amber-500 text-xs mt-2 animate-pulse">Action Required!</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 pb-px overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('add')}
          className={`px-6 py-3 font-bold text-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === 'add' ? 'border-amber-500 text-amber-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          Add Property
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-bold text-lg border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'pending' ? 'border-amber-500 text-amber-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          Pending Approvals
          {pendingProperties.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingProperties.length}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold text-lg border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-amber-500 text-amber-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          <Users className="w-5 h-5" />
          Registered Users
          <span className="bg-zinc-200 text-zinc-700 text-xs px-2 py-0.5 rounded-full">{users.length}</span>
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-600 z-0"></div>
          <div className="relative z-10 px-8 pt-10 pb-6 border-b border-zinc-100">
            <h2 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight">Add Premium Listing</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="relative z-10 p-8 bg-white">
            {error && <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-sm">{error}</div>}
            {success && <div className="mb-8 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r-xl text-sm">Property added successfully!</div>}

            <div className="mb-8">
              <label className="block text-sm font-bold text-zinc-700 mb-3">Property Type</label>
              <div className="flex gap-4">
                {['plot', 'house', 'rental'].map((t) => (
                  <button
                    key={t} type="button" onClick={() => setType(t as any)}
                    className={`px-6 py-3 rounded-xl font-bold border-2 transition-all flex items-center gap-2 ${type === t ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-zinc-200 text-zinc-600'}`}
                  >
                    {t === 'plot' && <Map className="w-5 h-5" />}
                    {t === 'house' && <Home className="w-5 h-5" />}
                    {t === 'rental' && <Building className="w-5 h-5" />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Colony Name *</label>
                  <input type="text" value={colony} onChange={(e) => setColony(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Village / Area *</label>
                  <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Size *</label>
                  <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Price</label>
                  <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Google Maps Link</label>
                  <input type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>
              
              <div className="space-y-6 flex flex-col">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none h-full min-h-[140px]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Property Photo *</label>
                  <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-amber-100 file:text-amber-700" required />
                </div>
              </div>
            </div>
            
            <div className="mt-10 pt-6 border-t border-zinc-100 flex justify-end">
              <button type="submit" disabled={loading} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-amber-500 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-70">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                Publish Listing
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-6">
          {pendingProperties.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-zinc-100 shadow-sm">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-2xl font-serif font-bold text-zinc-900">All Caught Up!</h3>
              <p className="text-zinc-500 mt-2">There are no pending property submissions to review.</p>
            </div>
          ) : (
            pendingProperties.map(plot => (
              <div key={plot.id} className="bg-white rounded-3xl shadow-lg border border-amber-200 overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-1/3 h-64 md:h-auto relative">
                  <img src={plot.imageUrl} alt="Property" className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-amber-500 text-zinc-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {plot.type}
                  </div>
                </div>
                <div className="p-6 md:w-2/3 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">{plot.colony}</h3>
                      <p className="text-zinc-500 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {plot.village} • {plot.area}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">{plot.price || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Owner Details Section (Visible only to Admin) */}
                  <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100">
                    <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2 border-b border-amber-200 pb-2">
                      <User className="w-4 h-4" /> Submitter Details (Private)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-amber-700 block text-xs font-bold uppercase">Name</span>
                        <span className="text-zinc-900 font-medium">{plot.ownerName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-amber-700 block text-xs font-bold uppercase">Contact</span>
                        <a href={`tel:${plot.ownerContact}`} className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                          <Phone className="w-3 h-3" /> {plot.ownerContact || 'N/A'}
                        </a>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-amber-700 block text-xs font-bold uppercase">Address</span>
                        <span className="text-zinc-900">{plot.ownerAddress || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3 pt-4 border-t border-zinc-100">
                    <button onClick={() => handleApprove(plot.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      <Check className="w-5 h-5" /> Approve & Publish
                    </button>
                    <button onClick={() => handleReject(plot.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-red-200">
                      <X className="w-5 h-5" /> Reject & Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden">
          <div className="px-8 pt-10 pb-6 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white">
            <h2 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight">Registered Users</h2>
            <p className="text-zinc-500 mt-2">View and analyze all users who have logged in via phone number.</p>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="py-4 px-6 font-bold text-zinc-700 text-sm uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 font-bold text-zinc-700 text-sm uppercase tracking-wider">Mobile Number</th>
                  <th className="py-4 px-6 font-bold text-zinc-700 text-sm uppercase tracking-wider">Registered On</th>
                  <th className="py-4 px-6 font-bold text-zinc-700 text-sm uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-zinc-500">
                      No users registered yet.
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                            {u.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-bold text-zinc-900">{u.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <a href={`tel:${u.phone}`} className="text-blue-600 font-medium hover:underline flex items-center gap-2">
                          <Phone className="w-4 h-4" /> {u.phone || 'N/A'}
                        </a>
                      </td>
                      <td className="py-4 px-6 text-zinc-500 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <a 
                          href={`https://wa.me/91${u.phone}?text=Hello%20${encodeURIComponent(u.name)},%20greetings%20from%20Shree%20Shyam%20Property!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                          WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
