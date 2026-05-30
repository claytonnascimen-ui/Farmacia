import React, { useState, useMemo } from 'react';
import { Product, Sale, SaleItem } from '../types';
import { recordSale } from '../lib/db';
import { 
  Search, ShoppingCart, User, Plus, Minus, Trash2, Tag, 
  CheckCircle2, DollarSign, CreditCard, QrCode, FileText, Pill, AlertCircle, Eye, Printer, X
} from 'lucide-react';

interface SalesProps {
  products: Product[];
  onRefresh: () => void;
}

export default function Sales({ products, onRefresh }: SalesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX'>('DINHEIRO');
  
  // Checkout Result
  const [lastFinishedSale, setLastFinishedSale] = useState<Sale | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Search products available (quantity must be > 0 ideally, or we warn them)
  const productSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.barcode.toLowerCase().includes(lower)
    ).slice(0, 5); // Limit search suggestion view to 5 rows
  }, [products, searchTerm]);

  // Add Item to Cart
  const addToCart = (product: Product) => {
    // Check if product is already in cart
    const existing = cart.find(item => item.product_id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (product.quantity <= currentQtyInCart) {
      alert(`Quantidade insuficiente em estoque para ${product.name}! Disponível: ${product.quantity}`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }]);
    }
    setSearchTerm('');
  };

  // Adjust Quantity
  const updateCartQty = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > product.quantity) {
          alert(`Quantidade máxima em estoque atingida para ${product.name}: ${product.quantity}`);
          return item;
        }
        return {
          ...item,
          quantity: nextQty,
          total: nextQty * item.price
        };
      }
      return item;
    }).filter(Boolean) as SaleItem[]);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  // Finish Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage('O carrinho está vazio.');
      return;
    }

    setIsFinishing(true);
    setErrorMessage('');

    const newSale: Sale = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      customer_name: customerName.trim() || 'Cliente Final',
      customer_cpf: customerCpf.trim() || undefined,
      discount: discount,
      total: total,
      payment_method: paymentMethod,
      items: cart,
    };

    try {
      const result = await recordSale(newSale);
      if (result.success) {
        setLastFinishedSale(newSale);
        // Clear Cart
        setCart([]);
        setCustomerName('');
        setCustomerCpf('');
        setDiscount(0);
        setPaymentMethod('DINHEIRO');
        onRefresh();
      } else {
        setErrorMessage(result.error || 'Erro ao registrar a venda.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao registrar venda.');
    } finally {
      setIsFinishing(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'DINHEIRO': return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'CARTAO_CREDITO':
      case 'CARTAO_DEBITO': return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'PIX': return <QrCode className="w-5 h-5 text-teal-600" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-7 space-y-6">
        {/* Product Search Add panel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Pill className="text-[#0D3B3B] w-5 h-5" />
            Adicionar Medicamentos à Venda
          </h2>
          <div className="relative">
            <input
              id="sales-search-lookup"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do remédio ou bipe o código de barras..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          </div>

          {/* Suggested List */}
          {searchTerm.trim() && (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-lg divide-y divide-slate-100">
              {productSearchResults.length === 0 ? (
                <div className="py-4 px-5 text-center text-xs text-slate-400">
                  Nenhum produto correspondente encontrado no estoque.
                </div>
              ) : (
                productSearchResults.map(product => {
                  const outOfStock = product.quantity <= 0;
                  return (
                    <div 
                      key={product.id}
                      onClick={() => !outOfStock && addToCart(product)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
                        outOfStock 
                          ? 'bg-slate-50/50 opacity-60 cursor-not-allowed' 
                          : 'hover:bg-[#2DD4BF]/10'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{product.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          COD: {product.barcode} <span className="text-slate-300">•</span> Estoque: {product.quantity} un
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-slate-800">
                          R$ {product.price.toFixed(2)}
                        </span>
                        {outOfStock ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md uppercase">
                            Sem Estoque
                          </span>
                        ) : (
                          <button 
                            id={`add-search-prod-${product.id}`}
                            className="bg-[#2DD4BF] hover:bg-[#25bda9] text-[#0D3B3B] rounded-lg p-1.5 font-bold transition-all text-xs cursor-pointer"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Shopping Cart List */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="text-slate-600 w-5 h-5" />
              Carrinho de Venda
            </h3>
            <span className="text-xs text-slate-400 font-semibold uppercase">
              {cart.length} {cart.length === 1 ? 'item' : 'itens'} selecionado(s)
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="py-16 text-center text-slate-400 max-w-xs mx-auto">
              <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm">O carrinho está vazio. Busque por medicamentos no campo superior para iniciar a venda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2">
              {cart.map(item => (
                <div key={item.product_id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{item.product_name}</h4>
                    <span className="text-xs text-slate-400 font-mono">
                      R$ {item.price.toFixed(2)} / un
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`minus-cart-qty-${item.product_id}`}
                      type="button"
                      onClick={() => updateCartQty(item.product_id, -1)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-all border border-slate-200/60"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold font-mono text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      id={`plus-cart-qty-${item.product_id}`}
                      type="button"
                      onClick={() => updateCartQty(item.product_id, 1)}
                      className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-all border border-slate-200/60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-24 text-right shrink-0">
                    <span className="font-bold font-mono text-sm text-slate-800">
                      R$ {item.total.toFixed(2)}
                    </span>
                  </div>

                  <button
                    id={`remove-cart-prod-${item.product_id}`}
                    type="button"
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Sidebar control panel */}
      <div className="lg:col-span-5">
        <form onSubmit={handleCheckout} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-5 sticky top-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Finalizar Venda</h3>
          
          {/* Customer */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Identificação do Cliente (Opcional)
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <input
                id="sales-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome completo do Cliente"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
              />
              <input
                id="sales-customer-cpf"
                type="text"
                value={customerCpf}
                onChange={(e) => setCustomerCpf(e.target.value)}
                placeholder="CPF (apenas números)"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Payment method selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Forma de Pagamento
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'DINHEIRO', label: 'Dinheiro', icon: <DollarSign className="w-4 h-4 text-emerald-600 animate-pulse" /> },
                { key: 'PIX', label: 'Pix / QR Code', icon: <QrCode className="w-4 h-4 text-teal-600" /> },
                { key: 'CARTAO_CREDITO', label: 'C. de Crédito', icon: <CreditCard className="w-4 h-4 text-blue-600" /> },
                { key: 'CARTAO_DEBITO', label: 'C. de Débito', icon: <CreditCard className="w-4 h-4 text-[#0D3B3B]" /> },
              ].map(opt => (
                <button
                  id={`paym-opt-${opt.key}`}
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentMethod(opt.key as any)}
                  className={`flex items-center gap-2 p-3 border rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === opt.key 
                      ? 'border-[#2DD4BF] bg-[#2DD4BF]/10 text-[#0D3B3B] shadow-xs' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Discount and Summary calculation */}
          <div className="space-y-3 font-medium text-sm text-slate-600">
            <div className="flex justify-between items-center">
              <span>Subtotal Itens:</span>
              <span className="font-mono font-semibold">R$ {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4 text-slate-400" />
                Desconto (R$):
              </span>
              <input
                id="sales-discount-input"
                type="number"
                min="0"
                max={subtotal}
                step="0.01"
                value={discount === 0 ? '' : discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="R$ 0.00"
                className="w-28 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-semibold font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B]"
              />
            </div>

            <div className="border-t border-dashed border-slate-100 pt-3 flex justify-between items-center text-slate-800">
              <span className="text-base font-bold">Total a Pagar:</span>
              <span className="text-xl font-bold font-mono text-slate-900">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            id="finalize-checkout-btn"
            type="submit"
            disabled={cart.length === 0 || isFinishing}
            className="w-full py-3.5 bg-[#0D3B3B] hover:bg-[#154e4e] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isFinishing ? 'Registrando Venda...' : 'Confirmar & Receber'}
          </button>
        </form>
      </div>

      {/* Sale Receipts Modal (Popup) */}
      {lastFinishedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100 flex flex-col max-h-[85vh] animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-md flex items-center gap-1.5">
                <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                Venda Confirmada!
              </h3>
              <button
                id="close-receipt-btn"
                onClick={() => setLastFinishedSale(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt layout */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-600 space-y-4">
              <div className="text-center font-bold text-slate-800 space-y-1">
                <p className="tracking-wide">FARMA CONTROL</p>
                <p className="text-[10px] text-slate-400">CUPOM FISCAL SIMPLIFICADO</p>
                <p className="text-[9px] font-normal text-slate-400">
                  Data: {new Date(lastFinishedSale.created_at).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 space-y-0.5">
                <p><strong>Cód. Venda:</strong> {lastFinishedSale.id.substring(0, 8)}...</p>
                <p><strong>Cliente:</strong> {lastFinishedSale.customer_name}</p>
                {lastFinishedSale.customer_cpf && <p><strong>CPF:</strong> {lastFinishedSale.customer_cpf}</p>}
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 space-y-2">
                <div className="font-bold flex justify-between">
                  <span>ITEM / QTD x PREÇO</span>
                  <span>TOTAL</span>
                </div>
                {lastFinishedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between leading-relaxed">
                    <span className="max-w-[70%] truncate">
                      {it.product_name} <br />
                      <span className="text-[10px] text-slate-400">{it.quantity}x R$ {it.price.toFixed(2)}</span>
                    </span>
                    <span>R$ {it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 font-bold text-slate-800">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {(lastFinishedSale.total + lastFinishedSale.discount).toFixed(2)}</span>
                </div>
                {lastFinishedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600 text-[11px]">
                    <span>Desconto:</span>
                    <span>- R$ {lastFinishedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base border-t border-slate-200 pt-1">
                  <span>TOTAL:</span>
                  <span>R$ {lastFinishedSale.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-normal mt-1.5 justify-end">
                  {getPaymentIcon(lastFinishedSale.payment_method)}
                  <span>({lastFinishedSale.payment_method.replace('_', ' ')})</span>
                </div>
              </div>
              <div className="text-center text-[10px] pt-4 text-slate-400">
                Obrigado pela preferência! <br /> Sistema Sincronizado.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-1">
              <button
                id="print-receipt-btn"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Imprimir
              </button>
              <button
                id="finish-and-clear-btn"
                onClick={() => setLastFinishedSale(null)}
                className="px-4 py-2 bg-[#2DD4BF] text-[#0D3B3B] font-bold hover:bg-[#25bda9] text-xs rounded-xl transition-all cursor-pointer"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
