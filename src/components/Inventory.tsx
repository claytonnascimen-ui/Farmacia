import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { upsertProduct, deleteProduct } from '../lib/db';
import { 
  Plus, Search, Edit2, Trash2, AlertTriangle, Calendar, Tag, Barcode, 
  Layers, Package, ChevronRight, Check, X, Pill, ShieldAlert
} from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onRefresh: () => void;
  isLoading: boolean;
}

const CATEGORIES = [
  'Analgésicos / Antitérmicos',
  'Antibióticos',
  'Dermatológicos',
  'Medicamentos Contínuos',
  'Vitaminas / Suplementos',
  'Higiene & Cosméticos',
  'Primeiros Socorros',
  'Outros'
];

export default function Inventory({ products, onRefresh, isLoading }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'expired'>('all');
  
  // Modals/Forms State
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 1. Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(searchLower) || 
        product.barcode.toLowerCase().includes(searchLower) ||
        (product.description || '').toLowerCase().includes(searchLower);

      // 2. Category Filter
      const matchesCategory = categoryFilter ? product.category === categoryFilter : true;

      // 3. Stock Level / Expirations
      let matchesStatus = true;
      if (stockStatusFilter === 'low') {
        matchesStatus = product.quantity <= product.min_quantity;
      } else if (stockStatusFilter === 'expired') {
        const today = new Date();
        const expDate = new Date(product.expiration_date);
        matchesStatus = expDate <= today;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, stockStatusFilter]);

  // Open Form for Adding
  const handleAddClick = () => {
    setCurrentProduct({
      id: crypto.randomUUID(),
      barcode: '',
      name: '',
      description: '',
      category: CATEGORIES[0],
      price: 0,
      cost_price: 0,
      quantity: 0,
      min_quantity: 5,
      expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ahead def
    });
    setFormError('');
    setIsEditing(true);
  };

  // Open Form for Editing
  const handleEditClick = (product: Product) => {
    setCurrentProduct({ ...product });
    setFormError('');
    setIsEditing(true);
  };

  // Form Submission
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;

    // Direct Validation
    if (!currentProduct.name?.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }
    if (!currentProduct.barcode?.trim()) {
      setFormError('O código de barras / SKU é obrigatório.');
      return;
    }
    if (currentProduct.price === undefined || currentProduct.price <= 0) {
      setFormError('Insira um preço de venda válido maior que zero.');
      return;
    }
    if (currentProduct.cost_price === undefined || currentProduct.cost_price < 0) {
      setFormError('O preço de custo não pode ser negativo.');
      return;
    }
    if (currentProduct.quantity === undefined || currentProduct.quantity < 0) {
      setFormError('A quantidade em estoque não pode ser negativa.');
      return;
    }
    if (!currentProduct.expiration_date) {
      setFormError('Por favor, informe a data de validade.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const result = await upsertProduct(currentProduct as Product);
      if (result.success) {
        setIsEditing(false);
        setCurrentProduct(null);
        onRefresh();
      } else {
        setFormError(result.error || 'Não foi possível salvar o produto.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Action
  const handleDeleteProduct = async (id: string) => {
    try {
      const result = await deleteProduct(id);
      if (result.success) {
        setIsDeletingId(null);
        onRefresh();
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Helper date rendering
  const getExpirationBadge = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(dateStr);
    
    // Within 3 months
    const threeMonthsDiff = 90 * 24 * 60 * 60 * 1000;
    const diff = expDate.getTime() - today.getTime();

    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          Vencido
        </span>
      );
    } else if (diff < threeMonthsDiff) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          Vence logo
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          Regulada
        </span>
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and filter bars */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              id="inventory-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, código ou descrição..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
            />
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
          </div>

          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
          >
            <option value="">Todas as Categorias</option>
            {CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex p-1 bg-slate-100 rounded-lg gap-1 border border-slate-200/50">
            <button
              id="filter-all-btn"
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                stockStatusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              id="filter-low-btn"
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                stockStatusFilter === 'low' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              Estoque Baixo
            </button>
            <button
              id="filter-expired-btn"
              onClick={() => setStockStatusFilter('expired')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                stockStatusFilter === 'expired' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              Vencidos
            </button>
          </div>

          <button
            id="register-product-btn"
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2DD4BF] text-[#0D3B3B] hover:bg-[#25bda9] rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#0D3B3B]" />
            Cadastrar Item
          </button>
        </div>
      </div>

      {/* Main product log list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Package id="loading-package-icon" className="w-12 h-12 animate-bounce text-[#2DD4BF]" />
            <p className="mt-3 text-sm">Carregando itens do estoque...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 max-w-sm mx-auto text-center">
            <div className="p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
              <Pill className="w-12 h-12" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Sem produtos</h3>
            <p className="mt-1 text-sm text-slate-500">
              {products.length === 0 
                ? 'Seu estoque está vazio. Comece a cadastrar os seus produtos para gerenciar a sua farmácia.' 
                : 'Nenhum item do estoque atende aos filtros de pesquisa aplicados.'}
            </p>
            {products.length === 0 && (
              <button
                id="empty-add-btn"
                onClick={handleAddClick}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#2DD4BF] text-[#0D3B3B] font-bold rounded-xl text-sm transition-all shadow-sm hover:bg-[#25bda9] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#0D3B3B]" />
                Cadastrar Primeiro Produto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Produto</th>
                  <th className="py-4 px-6 font-semibold">Categoria</th>
                  <th className="py-4 px-6 font-semibold text-right">Preço Custo</th>
                  <th className="py-4 px-6 font-semibold text-right">Preço Venda</th>
                  <th className="py-4 px-6 font-semibold text-center">Estoque</th>
                  <th className="py-4 px-6 font-semibold text-center">Validade</th>
                  <th className="py-4 px-6 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredProducts.map((product) => {
                  const isLow = product.quantity <= product.min_quantity;
                  const expDate = new Date(product.expiration_date);
                  const isExpired = expDate <= new Date();

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800 line-clamp-1">{product.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          <span>{product.barcode}</span>
                          {product.description && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="line-clamp-1">{product.description}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#0D3B3B] bg-[#2DD4BF]/15 rounded-full border border-[#2DD4BF]/20">
                          <Tag className="w-3 h-3 text-[#0D3B3B]" />
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-slate-500">
                        R$ {product.cost_price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-6 text-right font-semibold font-mono text-slate-800">
                        R$ {product.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col items-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                              product.quantity === 0
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {product.quantity}
                          </span>
                          {isLow && (
                            <span className="text-[10px] text-amber-600 font-semibold mt-1 flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" /> Mín. {product.min_quantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-xs">{new Date(product.expiration_date).toLocaleDateString('pt-BR')}</span>
                          {getExpirationBadge(product.expiration_date)}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`edit-prod-${product.id}`}
                            onClick={() => handleEditClick(product)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#0D3B3B] rounded-lg transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-prod-dialog-${product.id}`}
                            onClick={() => setIsDeletingId(product.id)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="text-rose-500 w-5 h-5 shrink-0" />
              Excluir Produto?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Você tem certeza? Esta ação removerá permanentemente o produto do estoque e não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                id="cancel-delete-btn"
                onClick={() => setIsDeletingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-btn"
                onClick={() => isDeletingId && handleDeleteProduct(isDeletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Product Modal */}
      {isEditing && currentProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-slide-up">
            <div className="px-6 py-4 bg-[#0D3B3B] text-white flex items-center justify-between">
              <h3 className="font-bold tracking-tight text-white font-display">
                {currentProduct.id && products.some(p => p.id === currentProduct.id) 
                  ? 'Editar Produto' 
                  : 'Cadastrar Novo Produto'}
              </h3>
              <button
                id="close-modal-btn"
                onClick={() => setIsEditing(false)}
                className="p-1 hover:bg-white/10 text-teal-100 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nome do Medicamento / Produto *
                </label>
                <input
                  id="form-product-name"
                  type="text"
                  required
                  value={currentProduct.name || ''}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  placeholder="Ex: Paracetamol 750mg"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Código de Barras / SKU *
                  </label>
                  <input
                    id="form-product-barcode"
                    type="text"
                    required
                    value={currentProduct.barcode || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, barcode: e.target.value })}
                    placeholder="Ex: 7891234567890"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Categoria *
                  </label>
                  <select
                    id="form-product-category"
                    value={currentProduct.category || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all text-slate-700"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  id="form-product-desc"
                  rows={2}
                  value={currentProduct.description || ''}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  placeholder="Ex: Caixa com 20 comprimidos de uso adulto"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Preço de Custo (R$) *
                  </label>
                  <input
                    id="form-product-cost"
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={currentProduct.cost_price === undefined ? '' : currentProduct.cost_price}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, cost_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    id="form-product-price"
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={currentProduct.price === undefined ? '' : currentProduct.price}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Estoque Inicial *
                  </label>
                  <input
                    id="form-product-qty"
                    type="number"
                    required
                    min="0"
                    value={currentProduct.quantity === undefined ? '' : currentProduct.quantity}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, quantity: parseInt(e.target.value, 10) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Estoque Mínimo *
                  </label>
                  <input
                    id="form-product-min"
                    type="number"
                    required
                    min="0"
                    value={currentProduct.min_quantity === undefined ? '' : currentProduct.min_quantity}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, min_quantity: parseInt(e.target.value, 10) || 0 })}
                    placeholder="5"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Data de Validade *
                  </label>
                  <input
                    id="form-product-exp"
                    type="date"
                    required
                    value={currentProduct.expiration_date || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, expiration_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  id="cancel-modal-btn"
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs rounded-xl cursor-pointer"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  id="save-modal-btn"
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#2DD4BF] text-[#0D3B3B] hover:bg-[#25bda9] font-bold text-xs rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Salvando...' : 'Salvar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
