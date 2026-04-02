import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where, increment, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Building2, Search, LogIn, LogOut, Phone, Trash2, MapPin, Maximize, IndianRupee, MessageCircle, ShieldCheck, Star, Map, Home, Building, PlusCircle } from 'lucide-react';
import AdminPanel from './components/AdminPanel';
import UserPropertyForm from './components/UserPropertyForm';
import { Property } from './types';

const PHONE_NUMBER = "8302443961";
const WHATSAPP_NUMBER = "918302443961";
const ADMIN_EMAIL = "ravatreena83@gmail.com";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [legacyPlots, setLegacyPlots] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'plot' | 'house' | 'rental'>('all');

  useEffect(() => {
    // Track site visit
    const visitRef = doc(db, 'analytics', 'site_stats');
    setDoc(visitRef, { totalVisits: increment(1) }, { merge: true }).catch(console.error);

    let unsubscribePropsPublic: () => void;
    let unsubscribePropsAdmin: () => void;
    let unsubscribePropsUser: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const isUserAdmin = currentUser?.email === ADMIN_EMAIL;
      setIsAdmin(isUserAdmin);

      // Clean up previous listeners when auth state changes
      if (unsubscribePropsPublic) unsubscribePropsPublic();
      if (unsubscribePropsAdmin) unsubscribePropsAdmin();
      if (unsubscribePropsUser) unsubscribePropsUser();

      if (isUserAdmin) {
        // Admin sees all properties
        const qAdmin = query(collection(db, 'properties'));
        unsubscribePropsAdmin = onSnapshot(qAdmin, (snapshot) => {
          const propsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Property[];
          // Sort locally to avoid needing a composite index
          propsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProperties(propsData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching admin properties:", error);
          setLoading(false);
        });
      } else {
        // Non-admin sees approved properties
        const qPublic = query(collection(db, 'properties'), where('status', '==', 'approved'));
        
        let publicProps: Property[] = [];
        let userProps: Property[] = [];

        const updateCombinedProps = () => {
          const combined = [...publicProps];
          userProps.forEach(up => {
            if (!combined.find(p => p.id === up.id)) {
              combined.push(up);
            }
          });
          combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProperties(combined);
          setLoading(false);
        };

        unsubscribePropsPublic = onSnapshot(qPublic, (snapshot) => {
          publicProps = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Property[];
          updateCombinedProps();
        }, (error) => {
          console.error("Error fetching public properties:", error);
          setLoading(false);
        });

        if (currentUser) {
          // Logged in user also sees their own pending properties
          const qUser = query(collection(db, 'properties'), where('userId', '==', currentUser.uid));
          unsubscribePropsUser = onSnapshot(qUser, (snapshot) => {
            userProps = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Property[];
            updateCombinedProps();
          }, (error) => {
            console.error("Error fetching user properties:", error);
          });
        }
      }
    });

    const qPlots = query(collection(db, 'plots'), orderBy('createdAt', 'desc'));
    const unsubscribePlots = onSnapshot(qPlots, (snapshot) => {
      const plotsData = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'plot',
        status: 'approved',
        ...doc.data()
      })) as Property[];
      setLegacyPlots(plotsData);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribePropsPublic) unsubscribePropsPublic();
      if (unsubscribePropsAdmin) unsubscribePropsAdmin();
      if (unsubscribePropsUser) unsubscribePropsUser();
      unsubscribePlots();
    };
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDelete = async (id: string, isLegacy: boolean) => {
    if (window.confirm("क्या आप वाकई इस प्रॉपर्टी को हटाना चाहते हैं? (Are you sure you want to delete this property?)")) {
      try {
        await deleteDoc(doc(db, isLegacy ? 'plots' : 'properties', id));
      } catch (error) {
        console.error("Error deleting property:", error);
        alert("Failed to delete property.");
      }
    }
  };

  const handlePropertyInteraction = async (property: Property) => {
    if (!property.id) return;
    const isLegacy = !('type' in property) || property.type === undefined;
    const collectionName = isLegacy ? 'plots' : 'properties';
    try {
      await updateDoc(doc(db, collectionName, property.id), {
        views: increment(1)
      });
    } catch (e) {
      console.error("Error tracking view:", e);
    }
  };

  const allProperties = [...properties, ...legacyPlots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayedProperties = allProperties.filter(p => {
    if (filter !== 'all' && p.type !== filter) return false;
    
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = p.colony?.toLowerCase().includes(searchLower) ||
                          p.village?.toLowerCase().includes(searchLower) ||
                          p.area?.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    if (isAdmin) return true; // Admin sees all (pending handled in AdminPanel)
    if (p.status === 'approved') return true;
    if (user && p.userId === user.uid) return true; // User sees their own pending
    return false;
  }).filter(p => isAdmin ? true : p.status === 'approved' || (user && p.userId === user.uid));

  const getWhatsAppLeadLink = (plot: Property) => {
    const message = `*New Lead Inquiry* 🌟\n\nHello Shree Shyam Property,\nI am highly interested in your premium property:\n\n📍 *Location:* ${plot.colony}, ${plot.village}\n📐 *Size:* ${plot.area}\n💰 *Price:* ${plot.price || 'On Request'}\n\nI would like to schedule a site visit and get more details.\n\n*My Name:* \n*My Contact:* `;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-amber-200 selection:text-amber-900">
      {/* Top Navigation Bar */}
      <nav className="bg-zinc-950 sticky top-0 z-50 border-b border-zinc-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg">
                <Building2 className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight text-white leading-none">
                  Shree Shyam <span className="text-amber-500">Property</span>
                </h1>
                <p className="text-[10px] font-bold text-amber-500/70 tracking-[0.2em] uppercase mt-1">Luxury Real Estate</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {!isAdmin && user && (
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  className="hidden md:flex items-center gap-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-zinc-950 px-4 py-2 rounded-full font-bold transition-all border border-amber-500/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  Post Property (Free)
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <span className="text-sm font-medium text-amber-500 hidden md:flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </span>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-zinc-900 px-5 py-2.5 rounded-xl transition-all shadow-md font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 text-zinc-400 hover:text-amber-500 font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Login / Post Property</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2075&q=80" 
            alt="Luxury Real Estate Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-sm mb-8 backdrop-blur-sm uppercase tracking-widest">
            <Star className="w-4 h-4 fill-amber-400" />
            Premium Properties
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-6 drop-shadow-2xl leading-tight">
            ज़मीन सिर्फ एक टुकड़ा नहीं, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 italic pr-4">
              आपका सुरक्षित भविष्य है
            </span>
          </h2>
          <p className="mt-6 text-xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
            आज का सही निवेश, कल की सबसे बड़ी ताकत है। श्री श्याम प्रॉपर्टीज़ के साथ पाएं 100% सुरक्षित, प्राइम लोकेशन वाले प्लॉट्स और घर—जहाँ हर सौदा भरोसे और पारदर्शिता के साथ होता है। अपने सपनों को हकीकत में बदलें!
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href={`tel:${PHONE_NUMBER}`}
              className="inline-flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-4 rounded-none font-bold text-lg transition-all shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] hover:-translate-y-1"
            >
              <Phone className="w-5 h-5" />
              Call Now: {PHONE_NUMBER}
            </a>
            <a 
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20Shree%20Shyam%20Property,%20I%20am%20looking%20for%20a%20premium%20property.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-transparent hover:bg-white/5 text-white border border-white/30 px-8 py-4 rounded-none font-bold text-lg transition-all backdrop-blur-sm hover:-translate-y-1"
            >
              <MessageCircle className="w-5 h-5 text-amber-400" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-16 relative z-10">
        {/* Admin Panel */}
        {isAdmin && (
          <div className="mb-20">
            <AdminPanel properties={allProperties} />
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-12 max-w-3xl mx-auto">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-zinc-400 group-focus-within:text-amber-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by colony, village, area... (कॉलोनी, गाँव खोजें)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-16 pr-6 py-6 border border-zinc-200 rounded-2xl leading-5 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-lg transition-all shadow-xl shadow-zinc-200/50 text-zinc-800 font-medium"
            />
          </div>
        </div>

        {/* Section Title & Filters */}
        {!isAdmin && (
          <div className="flex flex-col items-center justify-center mb-12 text-center">
            <h3 className="text-4xl font-serif text-zinc-900 mb-4">
              Exclusive Portfolio
            </h3>
            <div className="w-24 h-1 bg-amber-500 rounded-full mb-8"></div>
            
            {/* Filters */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { id: 'all', label: 'All Properties' },
                { id: 'plot', label: 'Plots', icon: Map },
                { id: 'house', label: 'Houses', icon: Home },
                { id: 'rental', label: 'Rental Rooms', icon: Building }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${
                    filter === f.id 
                      ? 'bg-zinc-900 text-amber-500 shadow-lg' 
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:border-amber-500 hover:text-amber-600'
                  }`}
                >
                  {f.icon && <f.icon className="w-4 h-4" />}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Mobile Post Property Button */}
            {user && (
              <div className="md:hidden flex justify-center mb-8">
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-2 bg-amber-500 text-zinc-950 px-6 py-3 rounded-full font-bold shadow-lg shadow-amber-500/20"
                >
                  <PlusCircle className="w-5 h-5" />
                  Post Your Property
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plots Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
            <p className="mt-6 text-zinc-500 font-medium text-lg">Curating premium properties...</p>
          </div>
        ) : displayedProperties.filter(p => !isAdmin || p.status === 'approved').length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-zinc-100">
            <div className="bg-zinc-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-12 w-12 text-zinc-300" />
            </div>
            <h3 className="text-2xl font-serif text-zinc-900">No properties found</h3>
            <p className="mt-2 text-zinc-500 max-w-md mx-auto">
              {searchQuery ? "We couldn't find any properties matching your search. Try different keywords." : "We are updating our inventory. Check back soon for new listings!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {displayedProperties.filter(p => !isAdmin || p.status === 'approved').map((plot) => (
              <div key={plot.id} className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-zinc-200/50 border border-zinc-100 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-500 group flex flex-col">
                {/* Image Container */}
                <div className="relative h-72 overflow-hidden bg-zinc-100">
                  <img 
                    src={plot.imageUrl} 
                    alt={plot.colony} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-amber-500 text-zinc-950 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                      {plot.type === 'plot' ? 'Plot' : plot.type === 'house' ? 'House' : 'Rental'}
                    </span>
                    {plot.status === 'pending' && (
                      <span className="bg-zinc-900/80 backdrop-blur-md text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                        Pending Approval
                      </span>
                    )}
                  </div>

                  {/* Price Badge */}
                  <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-none text-lg font-serif text-amber-400 shadow-xl flex items-center gap-1 border border-amber-500/30">
                    <IndianRupee className="w-5 h-5" />
                    {plot.price || "Price on Request"}
                  </div>
                  
                  {/* Location Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-2xl font-serif font-bold mb-1 drop-shadow-md">{plot.colony}</h3>
                    <div className="flex items-center text-zinc-300 text-sm">
                      <MapPin className="w-4 h-4 mr-1 text-amber-500" />
                      {plot.village}
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6 flex-1 flex flex-col bg-white">
                  <div className="space-y-4 mb-6 flex-1">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div className="flex items-center text-zinc-600 font-medium">
                        <Maximize className="w-5 h-5 text-amber-500 mr-2" />
                        <span className="text-lg">{plot.area}</span>
                      </div>
                      {plot.mapUrl && (
                        <a 
                          href={plot.mapUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={() => handlePropertyInteraction(plot)}
                          className="flex items-center text-amber-600 hover:text-amber-700 text-sm font-bold transition-colors bg-amber-50 px-3 py-1.5 rounded-full"
                        >
                          <Map className="w-4 h-4 mr-1" /> Map View
                        </a>
                      )}
                    </div>
                    
                    {plot.description && (
                      <p className="text-sm text-zinc-500 line-clamp-3 leading-relaxed">
                        {plot.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-zinc-100">
                    <div className="flex gap-3">
                      <a 
                        href={`tel:${PHONE_NUMBER}`}
                        onClick={() => handlePropertyInteraction(plot)}
                        className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-3.5 rounded-xl font-bold transition-all shadow-md hover:-translate-y-0.5"
                      >
                        <Phone className="w-5 h-5 text-amber-500" />
                        Call
                      </a>
                      <a 
                        href={getWhatsAppLeadLink(plot)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handlePropertyInteraction(plot)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3.5 rounded-xl font-bold transition-all shadow-md hover:-translate-y-0.5"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Inquire
                      </a>
                    </div>
                    
                    {(isAdmin || (user && plot.userId === user.uid)) && (
                      <button 
                        onClick={() => handleDelete(plot.id, !('type' in plot) || plot.type === undefined)}
                        className="flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-colors font-bold border border-red-100 mt-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Listing
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20Shree%20Shyam%20Property,%20I%20want%20to%20know%20more%20about%20premium%20properties.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 flex items-center justify-center group border-2 border-white"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-8 h-8" />
        <span className="absolute right-full mr-4 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-zinc-800">
          Chat with us!
        </span>
      </a>

      {/* Modals */}
      {showSubmitModal && <UserPropertyForm onClose={() => setShowSubmitModal(false)} />}

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-16 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <Building2 className="w-8 h-8 text-amber-500" />
            <span className="text-2xl font-serif font-bold text-white">Shree Shyam <span className="text-amber-500">Property</span></span>
          </div>
          <p className="mb-8 max-w-md mx-auto font-light">Your trusted partner in finding the perfect premium property. Building legacies, one plot at a time.</p>
          <div className="w-16 h-px bg-zinc-800 mx-auto mb-8"></div>
          <p className="text-sm">© {new Date().getFullYear()} Shree Shyam Property. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
