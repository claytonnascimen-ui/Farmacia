import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, SupabaseConfig } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: 'farmacontrol_products',
  SALES: 'farmacontrol_sales',
  CONFIG: 'farmacontrol_supabase_config',
};

// Default setup SQL that the user can run in Supabase
export const SUPABASE_SQL_SCHEMA = `-- Copie e cole este script no editor SQL do Supabase para criar as tabelas necessárias:

-- 1. Tabela de Produtos (Estoque)
CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10, 2) NOT NULL,
  cost_price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 5,
  expiration_date DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar segurança de nível de linha (opcional) ou habilitar leitura/escrita aberta para teste
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso total para todos os usuários" ON produtos
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela de Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  customer_name TEXT,
  customer_cpf TEXT,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  items JSONB NOT NULL
);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso total para todos os usuários" ON vendas
  FOR ALL USING (true) WITH CHECK (true);
`;

// Retrieve Supabase config from env or fallback to localStorage
export function getSupabaseConfig(): SupabaseConfig | null {
  // First check localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.key) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading configuration from localStorage', e);
  }

  // Fallback to process/import.meta.env if defined
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey };
  }

  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig | null) {
  if (config) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
  }
}

// Create a client dynamically so that credentials can be changed at runtime
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  try {
    return createClient(config.url, config.key, {
      auth: { persistSession: false }
    });
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

// Helper to check connection safety
export async function testSupabaseConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const tempClient = createClient(config.url, config.key, {
      auth: { persistSession: false }
    });
    // Try to query produtos or just do a simple select
    const { error } = await tempClient.from('produtos').select('count', { count: 'exact', head: true });
    if (error) {
      // If the table doesn't exist, the api key is still valid, but table is missing
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Conectado! Porém, as tabelas não foram encontradas. Copie e execute o script SQL abaixo no painel do Supabase.' 
        };
      }
      return { success: false, message: `Erro ao consultar: ${error.message}` };
    }
    return { success: true, message: 'Conectado com sucesso ao Supabase!' };
  } catch (error: any) {
    return { success: false, message: `Ocorreu um erro na conexão: ${error.message || error}` };
  }
}

/* =========================================
   PRODUCTS (PRODUTOS) API
   ========================================= */

// Get local products only
export function getLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading products from localStorage', e);
    return [];
  }
}

// Save local products
export function saveLocalProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

// Get all products (tries Supabase, falls back to local)
export async function getProducts(): Promise<{ products: Product[]; source: 'supabase' | 'local'; error?: string }> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        // Sync to local for offline mirror
        saveLocalProducts(data);
        return { products: data, source: 'supabase' };
      } else if (error) {
        console.warn('Supabase query error, fallback to local storage:', error.message);
        return { 
          products: getLocalProducts(), 
          source: 'local', 
          error: `Erro ao obter do Supabase: ${error.message}. Exibindo dados locais.` 
        };
      }
    } catch (e: any) {
      console.error('Supabase fetch products error:', e);
      return { 
        products: getLocalProducts(), 
        source: 'local', 
        error: `Falha na requisição: ${e.message}. Exibindo dados locais.` 
      };
    }
  }

  return { products: getLocalProducts(), source: 'local' };
}

// Save/Update a product
export async function upsertProduct(product: Product): Promise<{ success: boolean; error?: string }> {
  // Always update locally first
  const localProducts = getLocalProducts();
  const existingIndex = localProducts.findIndex(p => p.id === product.id);
  if (existingIndex >= 0) {
    localProducts[existingIndex] = product;
  } else {
    localProducts.push(product);
  }
  saveLocalProducts(localProducts);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('produtos').upsert({
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        cost_price: product.cost_price,
        quantity: product.quantity,
        min_quantity: product.min_quantity,
        expiration_date: product.expiration_date,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { 
          success: false, 
          error: `Item atualizado localmente, mas erro ao salvar no Supabase: ${error.message}` 
        };
      }
    } catch (e: any) {
      return { 
        success: false, 
        error: `Item atualizado localmente, mas erro de conexão com Supabase: ${e.message}` 
      };
    }
  }

  return { success: true };
}

// Delete a product
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  // Always remove locally first
  const localProducts = getLocalProducts();
  const filtered = localProducts.filter(p => p.id !== id);
  saveLocalProducts(filtered);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) {
        return { 
          success: false, 
          error: `Removido localmente, mas erro ao deletar no Supabase: ${error.message}` 
        };
      }
    } catch (e: any) {
      return { 
        success: false, 
        error: `Removido localmente, mas falha de rede ao conectar ao Supabase: ${e.message}` 
      };
    }
  }

  return { success: true };
}


/* =========================================
   SALES (VENDAS) API
   ========================================= */

// Get local sales
export function getLocalSales(): Sale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading sales from localStorage', e);
    return [];
  }
}

// Save local sales
export function saveLocalSales(sales: Sale[]): void {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
}

// Get all sales
export async function getSales(): Promise<{ sales: Sale[]; source: 'supabase' | 'local'; error?: string }> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map any schema nuances and sync
        saveLocalSales(data);
        return { sales: data, source: 'supabase' };
      } else if (error) {
        console.warn('Supabase query error for sales, fallback to local:', error.message);
        return { 
          sales: getLocalSales(), 
          source: 'local', 
          error: `Erro ao obter vendas do Supabase: ${error.message}. Exibindo dados locais.` 
        };
      }
    } catch (e: any) {
      console.error('Supabase fetch sales error:', e);
      return { 
        sales: getLocalSales(), 
        source: 'local', 
        error: `Falha na query de vendas: ${e.message}. Exibindo dados locais.` 
      };
    }
  }

  return { sales: getLocalSales(), source: 'local' };
}

// Register a Sale
// This:
// 1. Appends the sale to local/remote lists
// 2. Decrements product quantities correspondingly (both local and remote)
export async function recordSale(sale: Sale): Promise<{ success: boolean; error?: string }> {
  // 1. Process locally first
  const localSales = getLocalSales();
  localSales.unshift(sale); // Newest first
  saveLocalSales(localSales);

  // 1b. Decrement stocks locally
  const localProducts = getLocalProducts();
  const updatedLocalProducts = localProducts.map(p => {
    const saleItem = sale.items.find(item => item.product_id === p.id);
    if (saleItem) {
      return {
        ...p,
        quantity: Math.max(0, p.quantity - saleItem.quantity)
      };
    }
    return p;
  });
  saveLocalProducts(updatedLocalProducts);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Create sale in Supabase
      const { error: saleError } = await supabase.from('vendas').insert({
        id: sale.id,
        created_at: sale.created_at,
        customer_name: sale.customer_name,
        customer_cpf: sale.customer_cpf || null,
        discount: sale.discount,
        total: sale.total,
        payment_method: sale.payment_method,
        items: sale.items, // Stored as jsonb
      });

      if (saleError) {
        return { 
          success: false, 
          error: `Venda registrada localmente, mas erro ao sincronizar no Supabase: ${saleError.message}` 
        };
      }

      // Decrement quantities in Supabase.
      // We do this by updating each involved product.
      // This is sturdy and updates correctly.
      for (const item of sale.items) {
        const prod = updatedLocalProducts.find(p => p.id === item.product_id);
        if (prod) {
          // Send updated product detail to supabase
          await supabase.from('produtos').upsert({
            id: prod.id,
            barcode: prod.barcode,
            name: prod.name,
            description: prod.description,
            category: prod.category,
            price: prod.price,
            cost_price: prod.cost_price,
            quantity: prod.quantity, // Already contains subtracted amount
            min_quantity: prod.min_quantity,
            expiration_date: prod.expiration_date,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (e: any) {
      return { 
        success: false, 
        error: `Venda registrada localmente, mas erro de rede ao atualizar o Supabase: ${e.message}` 
      };
    }
  }

  return { success: true };
}
