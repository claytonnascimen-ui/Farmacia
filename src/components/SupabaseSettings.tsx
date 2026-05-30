import React, { useState, useEffect } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SUPABASE_SQL_SCHEMA } from '../lib/db';
import { Check, AlertCircle, Copy, Database, ShieldAlert, Key } from 'lucide-react';

interface SupabaseSettingsProps {
  onConfigChanged: () => void;
}

export default function SupabaseSettings({ onConfigChanged }: SupabaseSettingsProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (config) {
      setUrl(config.url);
      setKey(config.key);
    }
  }, []);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setStatus({
        type: 'error',
        message: 'Por favor, preencha a URL e a Chave Anon.',
      });
      return;
    }

    setIsTesting(true);
    setStatus({ type: 'idle', message: 'Testando conexão...' });

    const newConfig = { url: url.trim(), key: key.trim() };
    const result = await testSupabaseConnection(newConfig);

    if (result.success) {
      saveSupabaseConfig(newConfig);
      setStatus({
        type: 'success',
        message: result.message,
      });
      onConfigChanged();
    } else {
      setStatus({
        type: 'error',
        message: result.message,
      });
    }
    setIsTesting(false);
  };

  const handleClear = () => {
    saveSupabaseConfig(null);
    setUrl('');
    setKey('');
    setStatus({
      type: 'success',
      message: 'Conexão desconectada. O sistema continuará salvando dados localmente.',
    });
    onConfigChanged();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#2DD4BF]/15 text-[#0D3B3B] rounded-xl">
            <Database id="supabase-db-icon" className="w-6 h-6 text-[#0D3B3B]" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Conexão com Banco de Dados Supabase</h2>
            <p className="text-sm text-slate-500">Conecte o FarmaControl ao seu banco Supabase de forma rápida.</p>
          </div>
        </div>

        <form onSubmit={handleSaveAndTest} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">SUPABASE_URL</label>
              <input
                id="supabase-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxxxxx.supabase.co"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">SUPABASE_ANON_KEY</label>
              <div className="relative">
                <input
                  id="supabase-key"
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:border-[#0D3B3B] text-sm transition-all"
                />
                <Key className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              id="save-supabase-btn"
              type="submit"
              disabled={isTesting}
              className="px-5 py-2.5 bg-[#2DD4BF] text-[#0D3B3B] hover:bg-[#25bda9] rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? 'Sincronizando...' : 'Salvar e Conectar'}
            </button>
            {getSupabaseConfig() && (
              <button
                id="clear-supabase-btn"
                type="button"
                onClick={handleClear}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all active:scale-95 cursor-pointer"
              >
                Limpar Conexão
              </button>
            )}
          </div>
        </form>

        {status.type !== 'idle' && (
          <div
            className={`mt-5 p-4 rounded-xl flex gap-3 items-start border ${
              status.type === 'success'
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50/50 border-rose-100 text-rose-800'
            }`}
          >
            {status.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {status.type === 'success' ? 'Sucesso!' : 'Ocorreu um erro'}
              </p>
              <p className="text-xs mt-1 text-slate-600 leading-relaxed">{status.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-800">1. Preparação da Estrutura SQL</h3>
              <p className="text-sm text-slate-500">
                Execute o script de criação no painel do Supabase para ter as tabelas prontas.
              </p>
            </div>
          </div>
          <button
            id="copy-sql-btn"
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-medium text-xs transition-all active:scale-95 shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copiado!' : 'Copiar Script SQL'}
          </button>
        </div>

        <div className="relative">
          <pre className="font-mono text-xs bg-slate-900 text-slate-100 p-5 rounded-2xl overflow-x-auto max-h-[300px] leading-relaxed shadow-inner">
            <code>{SUPABASE_SQL_SCHEMA}</code>
          </pre>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none rounded-b-2xl"></div>
        </div>

        <div className="mt-5 space-y-3 bg-slate-50 p-4 rounded-xl text-xs text-slate-600">
          <h4 className="font-bold text-slate-700 text-sm">Como executar no Supabase:</h4>
          <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
            <li>Abra o seu projeto no <strong>Supabase</strong>.</li>
            <li>No menu lateral esquerdo, clique em <strong>SQL Editor</strong>.</li>
            <li>Clique em <strong>+ New Query</strong> (Nova Query).</li>
            <li>Cole o código SQL fornecido acima e clique no botão verde <strong>Run</strong> (Executar) no canto inferior direito.</li>
            <li>Pronto! As tabelas estar ser criadas e você já pode cadastrar no FarmaControl para salvá-las em tempo real.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
