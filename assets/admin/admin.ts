import { esc } from '../utils/dom';
import { showToast } from '../components/toast';

export function initAdmin(qs: any[]) {
  const root = document.getElementById('admin-editor-root');
  if (!root) return;
  let html = `<div style="display:flex; flex-direction:column; gap:20px;">`;
  qs.forEach((q) => {
    let optsHtml = q.options
      .map(
        (o: any, i: number) => `
      <div style="margin-top:5px;">
        <strong>Option ${o.letter} (Correct: ${o.correct}):</strong><br/>
        <textarea id="admin-opt-${q.id}-${i}" style="width:100%; height:40px; padding:4px;">${esc(o.text)}</textarea>
      </div>
    `
      )
      .join('');
    html += `
      <div class="card" style="padding:15px; display:flex; flex-direction:column; gap:10px;">
        <div style="font-weight:bold">${q.id} - ${q.group}</div>
        <textarea id="admin-text-${q.id}" style="width:100%; height:80px; padding:8px;">${esc(q.text)}</textarea>
        ${optsHtml}
        <button class="btn accent small" onclick="window.saveAdminQuestion('${q.id}')">Save Changes</button>
      </div>
    `;
  });
  html += `</div>`;
  root.innerHTML = html;

  window.saveAdminQuestion = async function (id: string) {
    if (!window.sbClient) return showToast('Supabase not connected');
    const txt = (document.getElementById(`admin-text-${id}`) as HTMLTextAreaElement).value;
    const q = qs.find((x) => x.id === id);
    if (q) {
      q.text = txt;
      q.options.forEach((o: any, i: number) => {
        o.text = (document.getElementById(`admin-opt-${id}-${i}`) as HTMLTextAreaElement).value;
      });
      const { error } = await window.sbClient
        .from('questions')
        .update({ text: txt, options: q.options })
        .eq('id', id);
      if (error) showToast('Error saving: ' + error.message);
      else showToast('Saved successfully!');
    }
  };
}
