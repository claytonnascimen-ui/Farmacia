import { useMemo } from 'react';
import { Product, Sale } from '../types';
import { 
  TrendingUp, DollarSign, Package, ShoppingBag, Percent, AlertOctagon, 
  ArrowUpRight, AlertTriangle, HelpCircle, Activity, Star, Calendar, CreditCard, Tag
} from 'lucide-react';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  isLoading: boolean;
  onNavigateToStock: () => void;
  onNavigateToSales: () => void;
}

export default function Dashboard({ products, sales, isLoading, onNavigateToStock, onNavigateToSales }: DashboardProps) {
  
  // Real stats calculation
  const stats = useMemo(() => {
    // 1. Total sales count
    const salesCount = sales.length;

    // 2. Gross revenue
    const grossRevenue = sales.reduce((sum, s) => sum + s.total, 0);

    // 3. Total discounts
    const totalDiscounts = sales.reduce((sum, s) => sum + s.discount, 0);

    // 4. Products Cost valuation in Stock
    const totalInventoryCost = products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);
    // Sales value in stock
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

    // 5. Profit margins of Completed Sales
    // We calculate cost of items sold
    let totalCostOfSoldItems = 0;
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          totalCostOfSoldItems += item.quantity * prod.cost_price;
        } else {
          // If product got deleted but sale recorded, we estimate cost as 50%
          totalCostOfSoldItems += item.quantity * (item.price * 0.6);
        }
      });
    });

    const netProfit = Math.max(0, grossRevenue - totalCostOfSoldItems);
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // 6. Average Ticket
    const avgTicket = salesCount > 0 ? grossRevenue / salesCount : 0;

    // 7. Inventory alerts
    const outOfStockCount = products.filter(p => p.quantity === 0).length;
    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= p.min_quantity).length;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiredCount = products.filter(p => new Date(p.expiration_date) <= today).length;

    // 8. Breakdown of payment methods
    const payments = {
      DINHEIRO: 0,
      PIX: 0,
      CARTAO_CREDITO: 0,
      CARTAO_DEBITO: 0,
    };
    sales.forEach(s => {
      if (payments[s.payment_method] !== undefined) {
        payments[s.payment_method] += s.total;
      }
    });

    return {
      salesCount,
      grossRevenue,
      totalDiscounts,
      totalInventoryCost,
      totalInventoryValue,
      netProfit,
      profitMargin,
      avgTicket,
      outOfStockCount,
      lowStockCount,
      expiredCount,
      payments,
    };
  }, [products, sales]);

  // Rank Best Selling Products from real sales
  const topSellingProducts = useMemo(() => {
    const counts: { [id: string]: { name: string; qty: number; revenue: number } } = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!counts[item.product_id]) {
          counts[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
        }
        counts[item.product_id].qty += item.quantity;
        counts[item.product_id].revenue += item.total;
      });
    });

    return Object.entries(counts)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  // Category statistics
  const categoryStats = useMemo(() => {
    const categories: { [name: string]: { count: number; value: number } } = {};
    products.forEach(p => {
      if (!categories[p.category]) {
        categories[p.category] = { count: 0, value: 0 };
      }
      categories[p.category].count += p.quantity;
      categories[p.category].value += p.quantity * p.price;
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.value - a.value);
  }, [products]);

  // Handle empty state gracefully (No preloaded mock data)
  const isBrandNew = products.length === 0 && sales.length === 0;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Activity id="loading-dashboard-icon" className="w-12 h-12 animate-pulse text-[#2DD4BF]" />
        <p className="mt-4 text-sm font-medium">Carregando métricas da farmácia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dynamic Alerts Banner if inventory warnings exist */}
      {(stats.outOfStockCount > 0 || stats.lowStockCount > 0 || stats.expiredCount > 0) && (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">Atenção! Alertas no Estoque de Medicamentos</h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Existem {stats.outOfStockCount} itens esgotados, {stats.lowStockCount} itens com estoque abaixo do mínimo configurado e {stats.expiredCount} itens com data de validade vencida.
              </p>
            </div>
          </div>
          <button
            id="alert-resolver-btn"
            onClick={onNavigateToStock}
            className="text-xs font-bold text-[#0D3B3B] bg-[#2DD4BF] hover:bg-[#25bda9] px-4 py-2 rounded-xl transition-all whitespace-nowrap active:scale-95 text-center cursor-pointer"
          >
            Verificar Estoque
          </button>
        </div>
      )}

      {/* Brand New Welcome Message (No mock data) */}
      {isBrandNew && (
        <div className="bg-gradient-to-br from-[#0D3B3B] to-[#0A2E2E] text-white p-8 rounded-3xl shadow-sm relative overflow-hidden border border-[#2DD4BF]/20">
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10">
            <Package className="w-80 h-80" />
          </div>
          <div className="max-w-xl relative z-10 space-y-4">
            <div className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md text-xs font-semibold rounded-full text-[#2DD4BF]">
              ⚡ Sistema Pronto para Uso
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Seja bem-vindo ao FarmaControl!</h2>
            <p className="text-teal-100 text-sm leading-relaxed">
              Como solicitado, não criamos nenhuma informação modelo ou dados de mentira. Todo o painel está limpo para que você construa o seu registro original!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="dash-welcome-add-btn"
                onClick={onNavigateToStock}
                className="px-5 py-2.5 bg-[#2DD4BF] text-[#0D3B3B] font-bold text-xs rounded-xl shadow-sm hover:bg-[#25bda9] transition-all active:scale-95 cursor-pointer"
              >
                Cadastrar Primeiro Produto
              </button>
              <button
                id="dash-welcome-sales-btn"
                onClick={onNavigateToSales}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/25 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Ir para o Caixa de Vendas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Gross revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Faturamento Bruto</p>
            <h3 className="text-2xl font-bold font-mono text-slate-800">R$ {stats.grossRevenue.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#2DD4BF]" /> Real acumulado
            </p>
          </div>
          <div className="p-3 bg-[#e6fcf5] text-[#0D3B3B] rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Net Profit Margin */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lucro Líquido Est.</p>
            <h3 className="text-2xl font-bold font-mono text-[#0D3B3B]">R$ {stats.netProfit.toFixed(2)}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
              <Percent className="w-3 h-3 text-teal-500" /> {stats.profitMargin.toFixed(1)}% Margem líquida
            </p>
          </div>
          <div className="p-3 bg-[#e6fcf5] text-emerald-700 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Sales counts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Vendas</p>
            <h3 className="text-2xl font-bold font-mono text-slate-800">{stats.salesCount}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              Ticket Médio: <strong className="text-slate-700 font-mono">R$ {stats.avgTicket.toFixed(2)}</strong>
            </p>
          </div>
          <div className="p-3 bg-teal-50 text-[#0D3B3B] rounded-2xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Stock investment value */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Valor em Estoque</p>
            <h3 className="text-2xl font-bold font-mono text-slate-800">R$ {stats.totalInventoryValue.toFixed(2)}</h3>
            <p className="text-[10px] text-slate-400">
              Total de itens: <strong className="text-slate-700 font-mono">{products.reduce((acc, p) => acc + p.quantity, 0)} un</strong>
            </p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Reports rows */}
      {!isBrandNew && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Top products sold & Breakdown */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Best Sellers */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Produtos Mais Vendidos (Top Saídas)
              </h3>

              {topSellingProducts.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhuma venda concluída ainda para gerar ranqueamento.</p>
              ) : (
                <div className="space-y-4">
                  {topSellingProducts.map((p, idx) => {
                    // find original product
                    const orig = products.find(op => op.id === p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-[#2DD4BF]/15 text-[#0D3B3B] rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-1">{p.name}</p>
                            {orig && <p className="text-[10px] text-slate-400">Restam em estoque: {orig.quantity} un</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold font-mono text-xs sm:text-sm text-slate-800">{p.qty} un</p>
                          <p className="text-[10px] text-slate-400 font-mono">R$ {p.revenue.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Sales lists */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#0D3B3B]" />
                  Últimas Vendas Registradas
                </h3>
                <button
                  id="go-to-sales-btn"
                  onClick={onNavigateToSales}
                  className="text-xs font-bold text-[#0D3B3B] hover:text-[#25bda9] flex items-center gap-1"
                >
                  Ir para Caixa
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {sales.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhuma venda registrada ainda no sistema.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 line-clamp-1">{sale.customer_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {new Date(sale.created_at).toLocaleString('pt-BR')} <span className="text-slate-300">•</span> {sale.items.length} produto(s)
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold font-mono text-slate-800">R$ {sale.total.toFixed(2)}</p>
                        <span className="inline-block text-[9.5px] font-bold text-[#0D3B3B] bg-[#2DD4BF]/20 px-2 py-0.5 rounded uppercase mt-0.5">
                          {sale.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Category distribution and Payment methods breakdown */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Payment method representation list */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-600" />
                Faturamento por Pagamento
              </h3>

              {stats.grossRevenue === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Sem dados de faturamento.</p>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: 'DINHEIRO', label: 'Dinheiro', val: stats.payments.DINHEIRO, color: 'bg-emerald-500' },
                    { key: 'PIX', label: 'Pix / QR Code', val: stats.payments.PIX, color: 'bg-teal-400' },
                    { key: 'CARTAO_CREDITO', label: 'Cartão de Crédito', val: stats.payments.CARTAO_CREDITO, color: 'bg-[#0D3B3B]' },
                    { key: 'CARTAO_DEBITO', label: 'Cartão de Débito', val: stats.payments.CARTAO_DEBITO, color: 'bg-[#2DD4BF]' },
                  ].map(payment => {
                    const pct = stats.grossRevenue > 0 ? (payment.val / stats.grossRevenue) * 100 : 0;
                    return (
                      <div key={payment.key} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                          <span>{payment.label}</span>
                          <span className="font-mono text-slate-800">R$ {payment.val.toFixed(2)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${payment.color} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category breakdown reports */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#0D3B3B]" />
                Destaque por Categorias
              </h3>

              {categoryStats.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhum produto cadastrado por categoria.</p>
              ) : (
                <div className="space-y-4">
                  {categoryStats.map(cat => {
                    const pct = stats.totalInventoryValue > 0 ? (cat.value / stats.totalInventoryValue) * 100 : 0;
                    return (
                      <div key={cat.name} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{cat.name}</p>
                          <p className="text-[10px] text-slate-400">{cat.count} unidades cadastradas</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[#0D3B3B] font-mono">R$ {cat.value.toFixed(2)}</p>
                          <p className="text-[9px] text-[#2DD4BF] font-black">{pct.toFixed(0)}% do estoque</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
