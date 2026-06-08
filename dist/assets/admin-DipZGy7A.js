import{n as e}from"./rolldown-runtime-1VNLd2iN.js";import{i as t,n,r,t as i}from"./main-DitiFYDH.js";function a(e){let t=document.getElementById(`admin-editor-root`);if(!t)return;let i=`<div style="display:flex; flex-direction:column; gap:20px;">`;e.forEach(e=>{let t=e.options.map((t,n)=>`
      <div style="margin-top:5px;">
        <strong>Option ${t.letter} (Correct: ${t.correct}):</strong><br/>
        <textarea id="admin-opt-${e.id}-${n}" style="width:100%; height:40px; padding:4px;">${r(t.text)}</textarea>
      </div>
    `).join(``);i+=`
      <div class="card" style="padding:15px; display:flex; flex-direction:column; gap:10px;">
        <div style="font-weight:bold">${e.id} - ${e.group}</div>
        <textarea id="admin-text-${e.id}" style="width:100%; height:80px; padding:8px;">${r(e.text)}</textarea>
        ${t}
        <button class="btn accent small" onclick="window.saveAdminQuestion('${e.id}')">Save Changes</button>
      </div>
    `}),i+=`</div>`,t.innerHTML=i,window.saveAdminQuestion=async function(t){if(!window.sbClient)return n(`Supabase not connected`);let r=document.getElementById(`admin-text-${t}`).value,i=e.find(e=>e.id===t);if(i){i.text=r,i.options.forEach((e,n)=>{e.text=document.getElementById(`admin-opt-${t}-${n}`).value});let{error:e}=await window.sbClient.from(`questions`).update({text:r,options:i.options}).eq(`id`,t);n(e?`Error saving: `+e.message:`Saved successfully!`)}}}e((()=>{t(),i()}))();export{a as initAdmin};