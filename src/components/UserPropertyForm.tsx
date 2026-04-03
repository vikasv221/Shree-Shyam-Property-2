import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { X, Image as ImageIcon, Loader2, CheckCircle2, MapPin, Ruler, IndianRupee, FileText, Map, User, Phone, Home, Building } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface UserPropertyFormProps {
  onClose: () => void;
  customUser: { uid: string; name: string; phone: string } | null;
}

export default function UserPropertyForm({ onClose, customUser }: UserPropertyFormProps) {
  const [type, setType] = useState<'plot' | 'house' | 'rental'>('house');
  const [colony, setColony] = useState('');
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [ownerName, setOwnerName] = useState(customUser?.name || '');
  const [ownerContact, setOwnerContact] = useState(customUser?.phone || '');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [image, setImage] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colony || !village || !area || !image || !ownerName || !ownerContact) {
      setError('कृपया सभी आवश्यक जानकारी भरें और एक फोटो चुनें।');
      return;
    }

    if (!auth.currentUser && !customUser) {
      setError('कृपया पहले लॉगिन करें।');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
      const compressedFile = await imageCompression(image, options);

      const storageRef = ref(storage, `properties/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);

      const userId = auth.currentUser?.uid || customUser?.uid || 'unknown';

      await addDoc(collection(db, 'properties'), {
        type,
        status: 'pending',
        colony,
        village,
        area,
        price,
        description,
        mapUrl,
        imageUrl: url,
        userId: userId,
        ownerName,
        ownerContact,
        ownerAddress,
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error("Error submitting property:", err);
      setError(err.message || 'प्रॉपर्टी जोड़ने में विफल। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl transform animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-serif font-bold text-zinc-900 mb-2">धन्यवाद! (Thank You!)</h3>
          <p className="text-zinc-600 mb-6">
            आपकी प्रॉपर्टी की जानकारी एडमिन के पास भेज दी गई है। अप्रूवल के बाद यह वेबसाइट पर दिखाई देगी।
          </p>
          <button onClick={onClose} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold w-full">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative my-8">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full text-zinc-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 border-b border-zinc-100 bg-gradient-to-r from-amber-50 to-white rounded-t-3xl">
          <h2 className="text-3xl font-serif font-bold text-zinc-900">अपनी प्रॉपर्टी जोड़ें</h2>
          <p className="text-zinc-600 mt-2">प्लॉट, घर या रेंटल रूम की जानकारी दें। (Submit your property details)</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-sm flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-red-500" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Property Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-zinc-900 border-b pb-2">प्रॉपर्टी की जानकारी (Property Details)</h3>
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-3">प्रॉपर्टी का प्रकार (Property Type) *</label>
                <div className="grid grid-cols-3 gap-3">
                  {['plot', 'house', 'rental'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t as any)}
                      className={`py-3 px-2 rounded-xl font-medium text-sm border-2 transition-all flex flex-col items-center gap-2 ${
                        type === t 
                          ? 'border-amber-500 bg-amber-50 text-amber-700' 
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-amber-200'
                      }`}
                    >
                      {t === 'plot' && <Map className="w-5 h-5" />}
                      {t === 'house' && <Home className="w-5 h-5" />}
                      {t === 'rental' && <Building className="w-5 h-5" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Colony (कॉलोनी) *</label>
                  <input type="text" value={colony} onChange={(e) => setColony(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Village/Area (क्षेत्र) *</label>
                  <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Size (आकार) *</label>
                  <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. 100 Gaj" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Price (कीमत)</label>
                  <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 15,00,000" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Google Maps Link</label>
                <input type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Photo (फोटो) *</label>
                <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200" required />
              </div>
            </div>

            {/* Right Column: Owner Details & Description */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-zinc-900 border-b pb-2">आपकी जानकारी (Your Details)</h3>
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                यह जानकारी वेबसाइट पर नहीं दिखेगी। यह सिर्फ एडमिन के संपर्क के लिए है। (This info is kept private for admin contact only.)
              </p>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Full Name (पूरा नाम) *</label>
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Contact Number (मोबाइल नंबर) *</label>
                <input type="tel" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Address (पता)</label>
                <input type="text" value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Property Description (विवरण)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none" />
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-100 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-8 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-70">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
