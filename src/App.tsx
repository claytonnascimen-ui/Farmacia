import { useState, useEffect } from 'react';
import { 
  getProducts, getSales, getSupabaseConfig, 
  getLocalProducts 
} from './lib/db';
import { Product, Sale } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import SupabaseSettings from './components/SupabaseSettings';
import { 
  LayoutDashboard, Package, ShoppingCart, Database, 
  Activity, ShieldAlert, ArrowUpRight, Barcode, Pill, Sparkles,
  Menu, X, RefreshCw
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'estoque' | 'vendas' | 'supabase'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbNotification, setDbNotification] = useState<{ message: string; type: 'success' | 'warn' | '' }>({
    message: '',
    type: '',
  });

  // Load configuration indicator
  const checkSupabaseStatus = () => {
    const config = getSupabaseConfig();
    setSupabaseConnected(!!config);
  };

  // Load all core data (Products & Sales)
  const loadData = async () => {
    setLoading(true);
    checkSupabaseStatus();

    try {
      // Fetch products
      const prodRes = await getProducts();
      setProducts(prodRes.products);

      // Fetch sales
      const saleRes = await getSales();
      setSales(saleRes.sales);

      // Handle custom user logs/warnings in top bar
      if (prodRes.error || saleRes.error) {
        setDbNotification({
          message: prodRes.error || saleRes.error || 'Erro na conexão de dados do Supabase. Usando cópia local.',
          type: 'warn'
        });
      } else if (getSupabaseConfig()) {
        setDbNotification({
          message: 'Banco de dados Supabase totalmente conectado e sincronizado!',
          type: 'success'
        });
      } else {
        setDbNotification({
          message: 'Usando armazenamento local. Configure o Supabase para sincronizar nas nuvens.',
          type: 'success'
        });
      }
    } catch (e: any) {
      console.error('Core data load error:', e);
      setDbNotification({
        message: 'Falha crítica ao ler do banco. Usando armazenamento local temporário.',
        type: 'warn'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'estoque', label: 'Estoque', icon: <Package className="w-5 h-5" /> },
    { id: 'vendas', label: 'Vendas', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'supabase', label: 'Supabase', icon: <Database className="w-5 h-5" /> },
  ];

  // Helper title & subtitle for header
  const getHeaderDetails = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard Geral', subtitle: 'Relatórios consolidados em tempo real' };
      case 'estoque':
        return { title: 'Controle de Estoque', subtitle: 'Cadastre e gerencie a validade e a quantidade de seus produtos' };
      case 'vendas':
        return { title: 'Ponto de Venda (PDV)', subtitle: 'Registre e emita cupons para novas vendas' };
      case 'supabase':
        return { title: 'Integração Supabase', subtitle: 'Conecte sua farmácia com um banco de dados persistente nas nuvens' };
    }
  };

  const { title, subtitle } = getHeaderDetails();

  return (
    <div id="farmacontrol-app" className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden md:flex w-64 bg-[#0D3B3B] text-white flex-col border-r border-[#0A2E2E] shrink-0 min-h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b border-[#1A4B4B]">
          <div className="w-8 h-8 bg-[#2DD4BF] rounded-lg flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-[#0D3B3B]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PHARMAGRID</h1>
            <p className="text-[9px] uppercase font-bold tracking-widest text-[#2DD4BF]">FARMA CONTROL</p>
          </div>
        </div>
        
        {/* Navigation Items */}
        <div className="flex-1 px-4 py-8 space-y-2">
          {navigationItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <div
                id={`sidebar-tab-${item.id}`}
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/20 font-semibold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Database connectivity status card in sidebar bottom */}
        <div className="p-6">
          <div className="bg-[#1A4B4B] p-4 rounded-xl border border-[#235858]">
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5">Status Supabase</p>
            <div 
              onClick={() => setActiveTab('supabase')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${supabaseConnected ? 'bg-[#2DD4BF] animate-ping' : 'bg-slate-400'}`} />
              <div className={`w-2.5 h-2.5 rounded-full ${supabaseConnected ? 'bg-[#2DD4BF]' : 'bg-slate-400'} absolute`} />
              <span className="text-sm font-semibold text-white/90 group-hover:text-white tracking-tight">
                {supabaseConnected ? 'Sincronizado' : 'Modo Local'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER (Mobile only) */}
      <header className="md:hidden bg-[#0D3B3B] text-white py-4 px-5 flex items-center justify-between border-b border-[#0A2E2E] sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#2DD4BF] rounded-lg flex items-center justify-center">
            <Pill className="w-5 h-5 text-[#0D3B3B]" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-sm">PHARMAGRID</h1>
            <p className="text-[8px] uppercase tracking-wide text-teal-200">Farma Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="mobile-sync-btn"
            onClick={loadData}
            disabled={loading}
            className="p-1.5 hover:bg-white/5 rounded-lg text-white/80"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-[#1A4B4B] text-white rounded-lg hover:bg-[#235858]"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER (Mobile menu backdrop) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 bg-[#0D3B3B] text-white h-full flex flex-col p-6 animate-slide-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-6 border-b border-[#1A4B4B] mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#2DD4BF] rounded-lg flex items-center justify-center text-[#0D3B3B] font-bold text-xs">
                  <Pill className="w-4 h-4" />
                </div>
                <h1 className="font-bold tracking-tight">PHARMAGRID</h1>
              </div>
              <button id="close-mobile-drawer" onClick={() => setIsMobileMenuOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 flex-1">
              {navigationItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <div
                    id={`mobile-tab-${item.id}`}
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/20 font-semibold'
                        : 'text-white/60 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#1A4B4B] p-4 rounded-xl border border-[#235858] mt-auto">
              <p className="text-[9px] text-white/40 uppercase font-black tracking-widest mb-1">Status database</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-[#2DD4BF]' : 'bg-slate-400'}`} />
                <span className="text-xs font-semibold text-white/80">{supabaseConnected ? 'Sincronizado' : 'Modo Local'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Top Header details */}
        <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5 flex items-center justify-between sticky top-0 md:relative z-20">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight font-display">{title}</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans">{subtitle}</p>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            {activeTab !== 'vendas' && (
              <button
                id="header-goto-sales"
                onClick={() => setActiveTab('vendas')}
                className="flex items-center gap-2 px-4.5 py-2.5 bg-[#2DD4BF] text-[#0D3B3B] hover:bg-[#25bda9] font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-[#0D3B3B]" />
                Nova Venda
              </button>
            )}
            
            <button
              id="header-sync-btn-desktop"
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Recarregar e Sincronizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          </div>
        </header>

        {/* Inner Content Area */}
        <main className="flex-1 p-5 sm:p-8 space-y-6">
          
          {/* Dynamic connection alert logs in content container */}
          {dbNotification.message && (
            <div 
              className={`p-4 rounded-2xl text-xs sm:text-sm border flex items-center justify-between gap-3 ${
                dbNotification.type === 'warn'
                  ? 'bg-rose-50/70 text-rose-900 border-rose-100'
                  : 'bg-emerald-50/40 text-emerald-900 border-emerald-100/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 shrink-0 col-span-1 ${dbNotification.type === 'warn' ? 'text-rose-500' : 'text-[#2DD4BF]'}`} />
                <span className="font-semibold">{dbNotification.message}</span>
              </div>
              <button 
                id="close-content-notif"
                onClick={() => setDbNotification({ message: '', type: '' })}
                className="text-xs px-2.5 py-1 bg-black/5 hover:bg-black/10 rounded-lg font-bold"
              >
                Ignorar
              </button>
            </div>
          )}

          {/* Dynamic tabs */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              products={products} 
              sales={sales} 
              isLoading={loading}
              onNavigateToStock={() => setActiveTab('estoque')}
              onNavigateToSales={() => setActiveTab('vendas')}
            />
          )}

          {activeTab === 'estoque' && (
            <Inventory 
              products={products} 
              onRefresh={loadData}
              isLoading={loading}
            />
          )}

          {activeTab === 'vendas' && (
            <Sales 
              products={products} 
              onRefresh={loadData}
            />
          )}

          {activeTab === 'supabase' && (
            <SupabaseSettings 
              onConfigChanged={loadData}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200/60 py-5 text-center text-slate-400 text-xs">
          <p>© 2026 PharmaGrid & FarmaControl • Licença Farmácia Simplificada • Ativo e Preparado para Supabase</p>
        </footer>
      </div>

    </div>
  );
}

