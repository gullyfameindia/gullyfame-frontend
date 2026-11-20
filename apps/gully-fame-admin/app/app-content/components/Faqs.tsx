'use client';

import { confirmDialog } from '@/components/Feedback';
import { useEffect, useState } from 'react';
import defaults from '@/lib/appDefaultContent.json';
import { deleteFaq, getFaqs, saveFaq, toggleFaq, type Faq } from '@/lib/contentLibraryApi';

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export default function Faqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await getFaqs();
    if (r.success) {
      setFaqs(r.data?.items || []);
      setError(null);
    } else {
      setError(r.message || 'Failed to load FAQs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const [importing, setImporting] = useState(false);

  const importDefaults = async () => {
    if (!(await confirmDialog(`Add the ${defaults.faqs.length} FAQs that are built into the app? Existing FAQs are kept.`))) return;
    setImporting(true);
    setError(null);
    for (const f of defaults.faqs) {
      const r = await saveFaq({ question: f.question, answer: f.answer });
      if (!r.success) {
        setError(r.message || 'Import stopped: failed to save a FAQ.');
        break;
      }
    }
    setImporting(false);
    load();
  };

  const reset = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return setError('Both question and answer are required.');
    setSaving(true);
    setError(null);
    const r = await saveFaq({ question: question.trim(), answer: answer.trim(), faqId: editingId || undefined });
    setSaving(false);
    if (!r.success) return setError(r.message || 'Failed to save FAQ.');
    reset();
    load();
  };

  const run = async (faq: Faq, fn: (id: string) => Promise<{ success: boolean; message?: string }>) => {
    setBusyId(faq.id);
    setError(null);
    const r = await fn(faq.id);
    setBusyId(null);
    if (!r.success) return setError(r.message || 'Action failed.');
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">FAQs</h2>
        <p className="text-xs text-gray-500 mt-1">Shown on the app's FAQ screen and Help & Support. While no FAQ is published here, the app shows its built-in FAQs. Hidden FAQs stay saved but are not shown to users.</p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 p-4">
        <input className={inputCls} placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <textarea className={inputCls} rows={4} placeholder="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <div className="flex justify-end gap-2">
          {editingId && (
            <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          )}
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70">
            {saving ? 'Saving...' : editingId ? 'Update FAQ' : 'Add FAQ'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading FAQs...</div>
        ) : faqs.length === 0 ? (
          <div className="px-4 py-6 text-center space-y-3">
            <p className="text-sm text-gray-500">No FAQs yet. Users currently see the FAQs built into the app.</p>
            <button type="button" onClick={importDefaults} disabled={importing} className="rounded-lg border border-primary-500 px-4 py-2 text-xs font-semibold text-primary-500 hover:bg-primary-50 disabled:opacity-60">
              {importing ? 'Importing...' : `Import the app's ${defaults.faqs.length} default FAQs to edit them`}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {faqs.map((faq) => (
              <div key={faq.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">
                    {faq.question}
                    {!faq.isActive && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">Hidden</span>}
                  </p>
                  <div className="flex flex-shrink-0 items-center gap-3 text-xs font-medium">
                    <button type="button" onClick={() => { setEditingId(faq.id); setQuestion(faq.question); setAnswer(faq.answer); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-primary-600 hover:text-primary-700">Edit</button>
                    <button type="button" disabled={busyId === faq.id} onClick={() => run(faq, toggleFaq)} className="text-gray-600 hover:text-gray-800 disabled:opacity-60">{faq.isActive ? 'Hide' : 'Show'}</button>
                    <button
                      type="button"
                      disabled={busyId === faq.id}
                      onClick={async () => (await confirmDialog('Delete this FAQ?')) && run(faq, deleteFaq)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-line">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
