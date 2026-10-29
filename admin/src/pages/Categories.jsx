import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Modal, { Confirm } from '../components/Modal.jsx';
import { Badge, Field, Empty, ErrorBox, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

const blank = { name: '', emoji: '🎂', sortOrder: 0, active: true };

export default function Categories() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api('/categories'), []);
  const [edit, setEdit] = useState(undefined); const [f, setF] = useState(blank); const [err, setErr] = useState({}); const [busy, setBusy] = useState(false); const [del, setDel] = useState(null);
  const open = c => { setErr({}); setF(c ? { name: c.name, emoji: c.emoji, sortOrder: c.sortOrder, active: c.active } : { ...blank, sortOrder: (data?.items.length || 0) + 1 }); setEdit(c); };

  async function save() {
    if (f.name.trim().length < 2) { setErr({ name: 'Enter a category name.' }); return; }
    setBusy(true);
    try { await api(edit ? `/categories/${edit._id}` : '/categories', { method: edit ? 'PUT' : 'POST', body: { ...f, name: f.name.trim(), sortOrder: Number(f.sortOrder) || 0 } }); toast(edit ? 'Category updated' : 'Category added', 'success'); setEdit(undefined); reload(); }
    catch (e) { setErr({ [e.field || 'name']: e.message }); }
    setBusy(false);
  }
  async function remove() {
    setBusy(true);
    try { await api(`/categories/${del._id}`, { method: 'DELETE' }); toast('Category deleted', 'success'); reload(); } catch (e) { toast(e.message, 'error'); }
    setDel(null); setBusy(false);
  }
  return (
    <>
      <PageHead title="Categories" sub="These are the category chips on your home page and shop. The order number decides the order they appear in.">
        <button className="btn btn-primary btn-sm" onClick={() => open(null)}><Icon name="plus" size={14} /> Add category</button>
      </PageHead>
      <div className="card">
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.items.length === 0 ? <Empty icon="category" title="No categories yet" text="Add a category, then put cakes in it." /> : (
          <div className="table-wrap"><table><thead><tr><th>Order</th><th>Category</th><th>Cakes</th><th>Shown on website</th><th /></tr></thead><tbody>
            {data.items.map(c => (
              <tr key={c._id}>
                <td>{c.sortOrder}</td>
                <td><span style={{ fontSize: 20, marginRight: 10 }}>{c.emoji}</span><b>{c.name}</b><div style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 34 }}>/{c.slug}</div></td>
                <td>{c.cakeCount}</td>
                <td><Badge tone={c.active ? 'sage' : 'gray'}>{c.active ? 'Visible' : 'Hidden'}</Badge></td>
                <td><div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn-icon" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><Icon name="edit" size={15} /></button>
                  <button className="btn-icon" aria-label={`Delete ${c.name}`} onClick={() => setDel(c)}><Icon name="trash" size={15} /></button>
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      <Modal open={edit !== undefined} title={edit ? 'Edit category' : 'Add category'} onClose={() => setEdit(undefined)}
        footer={<><button className="btn btn-ghost" onClick={() => setEdit(undefined)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
        <div className="form-row2">
          <Field label="Name" error={err.name}><input value={f.name} maxLength={40} onChange={e => { setF({ ...f, name: e.target.value }); setErr({}); }} placeholder="e.g. Cheesecakes" /></Field>
          <Field label="Emoji"><input value={f.emoji} maxLength={8} onChange={e => setF({ ...f, emoji: e.target.value })} /></Field>
        </div>
        <div className="form-row2">
          <Field label="Order number" hint="Smaller numbers come first."><input type="number" min="0" value={f.sortOrder} onChange={e => setF({ ...f, sortOrder: e.target.value })} /></Field>
          <Field label="Visibility"><label className="checkbox-row" style={{ paddingTop: 10 }}><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Show on the website</label></Field>
        </div>
      </Modal>
      <Confirm open={!!del} danger title="Delete this category?" confirmLabel="Delete" busy={busy} onClose={() => setDel(null)} onConfirm={remove} text={del && `“${del.name}” will be removed. You can't delete a category that still has cakes in it.`} />
    </>
  );
}
