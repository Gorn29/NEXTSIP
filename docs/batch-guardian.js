import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
let batches=[],auditLogs=[],auditReady=false,auditError="",selectedBatchId=null,currentUser=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate=s=>s?new Date(s+"T00:00:00").toLocaleDateString("th-TH",{year:"numeric",month:"short",day:"numeric"}):"-";
const fmtTime=s=>s?new Date(s).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"}):"-";
function status(t,bad=false){const e=$("#batchCloudStatus");e.textContent=t;e.style.color=bad?"#a34732":"#456447";}
function latest(b,k){const m=(b.measurements||[]).find(x=>x[k]!==null&&x[k]!==undefined&&x[k]!=="");return m?m[k]:null;}
const auditLabels={batch_code:"รหัส Batch",product_name:"ผลิตภัณฑ์",recipe_version:"รุ่นสูตร",start_date:"วันที่เริ่ม",owner_name:"ผู้รับผิดชอบ",status:"สถานะ",flagged:"การแจ้งตรวจสอบ",ph:"pH",brix:"°Brix",temperature:"อุณหภูมิ",note:"หมายเหตุ",measured_at:"เวลาบันทึก"};
function auditValue(v){if(v===null||v===undefined||v==="")return "-";if(typeof v==="boolean")return v?"เปิด":"ปิด";return String(v).length>90?String(v).slice(0,87)+"...":String(v);}
function auditDescription(log){
 const before=log.before_data||{},after=log.after_data||{};
 const source=log.action==="deleted"?before:after;
 if(log.entity_type==="batch"&&log.action==="created")return "สร้าง Batch "+auditValue(source.batch_code)+" · "+auditValue(source.product_name);
 if(log.entity_type==="batch"&&log.action==="deleted")return "ลบ Batch "+auditValue(source.batch_code);
 if(log.entity_type==="measurement"&&log.action==="created"){
  const parts=[["ph","pH"],["brix","°Brix"],["temperature","°C"]].filter(([k])=>after[k]!==null&&after[k]!==undefined).map(([k,l])=>l+" "+auditValue(after[k]));
  if(after.note)parts.push("หมายเหตุ: "+auditValue(after.note));
  return "บันทึกค่าการวัด"+(parts.length?" · "+parts.join(" · "):"");
 }
 if(log.entity_type==="measurement"&&log.action==="deleted")return "ลบรายการค่าการวัด";
 const keys=[...new Set([...Object.keys(before),...Object.keys(after)])];
 const changes=keys.filter(k=>before[k]!==after[k]).map(k=>(auditLabels[k]||k)+": "+auditValue(before[k])+" → "+auditValue(after[k]));
 return (log.entity_type==="batch"?"แก้ไขข้อมูล Batch":"แก้ไขค่าการวัด")+(changes.length?" · "+changes.join(" | "):"");
}
function renderAudit(id){
 const rows=auditLogs.filter(x=>x.batch_id===id);
 if(!auditReady){$("#auditRows").innerHTML='<tr><td colspan="3">ยังเปิดใช้ Audit Log ไม่สำเร็จ: '+esc(auditError||"กรุณารัน SQL Batch Integrity ใน Supabase")+'</td></tr>';return;}
 $("#auditRows").innerHTML=rows.map(log=>'<tr><td>'+fmtTime(log.created_at)+'</td><td>'+({created:"สร้าง",updated:"แก้ไข",deleted:"ลบ"}[log.action]||esc(log.action))+' · '+(log.entity_type==="batch"?"Batch":"ค่าการวัด")+'</td><td>'+esc(auditDescription(log))+'</td></tr>').join("")||'<tr><td colspan="3">ยังไม่มีประวัติการเปลี่ยนแปลงหลังเปิดใช้ระบบ</td></tr>';
}
function render(){
 $("#batchTotal").textContent=batches.length;
 $("#batchActive").textContent=batches.filter(b=>b.status==="active").length;
 $("#batchFlagged").textContent=batches.filter(b=>b.flagged).length;
 const f=$("#batchFilter").value;
 const list=batches.filter(b=>f==="all"||(f==="flagged"?b.flagged:b.status===f));
 $("#rows").innerHTML=list.map(b=>'<tr><td><b>'+esc(b.batch_code)+'</b></td><td>'+esc(b.product_name)+'</td><td>'+fmtDate(b.start_date)+'</td><td>'+(latest(b,"ph")??"-")+'</td><td>'+(latest(b,"brix")??"-")+'</td><td>'+(latest(b,"temperature")??"-")+'</td><td><span class="'+(b.flagged?"warn":"ok")+'">'+(b.flagged?"ต้องตรวจสอบ":b.status==="completed"?"เสร็จสิ้น":"กำลังดำเนินการ")+'</span></td><td><button class="btn alt" type="button" data-open-batch="'+b.id+'">ดู</button></td></tr>').join("");
 $("#emptyBatches").hidden=batches.length>0;
const uniqueActive=new Map();batches.filter(b=>b.status==="active").forEach(b=>{const key=String(b.batch_code||"").replace(/\s+/g,"").toUpperCase();if(key&&!uniqueActive.has(key))uniqueActive.set(key,b);});
 $("#recordBatch").innerHTML=[...uniqueActive.values()].map(b=>'<option value="'+b.id+'">'+esc(b.batch_code)+' — '+esc(b.product_name)+'</option>').join("")||'<option value="">ไม่มี Batch ที่กำลังดำเนินการ</option>';
 if(selectedBatchId&&batches.some(b=>b.id===selectedBatchId))showBatch(selectedBatchId);
}
async function showBatch(id){
 const b=batches.find(x=>x.id===id);if(!b)return;selectedBatchId=id;
 $("#historyTitle").textContent=b.batch_code+" · "+b.product_name;
 $("#historyRows").innerHTML=(b.measurements||[]).map(m=>'<tr><td>'+fmtTime(m.measured_at)+'</td><td>'+(m.ph??"-")+'</td><td>'+(m.brix??"-")+'</td><td>'+(m.temperature??"-")+'</td><td>'+esc(m.note||"-")+'</td></tr>').join("")||'<tr><td colspan="5">ยังไม่มีการบันทึกค่าการวัด</td></tr>';
 renderAudit(id);
 $("#batchDetails").innerHTML='<p><b>Batch ID:</b> '+esc(b.batch_code)+'</p><p><b>ผลิตภัณฑ์:</b> '+esc(b.product_name)+'</p><p><b>สูตร / รุ่นสูตร:</b> '+esc(b.recipe_version||"-")+'</p><p><b>เริ่มผลิต:</b> '+fmtDate(b.start_date)+'</p><p><b>ผู้รับผิดชอบ:</b> '+esc(b.owner_name||"-")+'</p><p><b>จำนวนบันทึก:</b> '+b.measurements.length+'</p><p><b>สถานะ:</b> '+(b.status==="completed"?"เสร็จสิ้น":"กำลังดำเนินการ")+'</p>';
 $("#batchActions").innerHTML=(b.status==="active"?'<button class="btn alt" id="completeBatch" type="button">ทำเครื่องหมายว่าเสร็จสิ้น</button> ':"")+'<button class="btn alt" id="toggleFlag" type="button">'+(b.flagged?"ยกเลิกการแจ้งตรวจสอบ":"ทำเครื่องหมายต้องตรวจสอบ")+'</button>';
 if($("#completeBatch"))$("#completeBatch").onclick=()=>updateBatch(b,{status:"completed"});
 $("#toggleFlag").onclick=()=>updateBatch(b,{flagged:!b.flagged});
 if(b.status==="active")$("#recordBatch").value=id;
 const detailSection=$("#historyTitle").closest(".grid");
 if(detailSection) detailSection.scrollIntoView({behavior:"smooth",block:"start"});
}
async function updateBatch(b,patch){
 const {error}=await supabase.from("production_batches").update(patch).eq("id",b.id);
 if(error)return status("อัปเดต Batch ไม่สำเร็จ: "+error.message,true);
 await load();showBatch(b.id);
}
async function load(){
 const {data:{session},error:authError}=await supabase.auth.getSession();
 if(authError)return status("ตรวจสอบบัญชีไม่สำเร็จ: "+authError.message,true);
 currentUser=session?.user||null;
 if(!currentUser){
  batches=[];selectedBatchId=null;
  $("#batchTotal").textContent="0";$("#batchActive").textContent="0";$("#batchFlagged").textContent="0";
  $("#rows").innerHTML="";$("#emptyBatches").hidden=false;$("#emptyBatches").textContent="กรุณาเข้าสู่ระบบเพื่อใช้งาน Batch Guardian";
  $("#recordBatch").innerHTML='<option value="">กรุณาเข้าสู่ระบบก่อน</option>';
  $("#historyTitle").textContent="เข้าสู่ระบบเพื่อดูประวัติ";$("#historyRows").innerHTML="";$("#auditRows").innerHTML="";
  $("#batchDetails").textContent="ยังไม่ได้เข้าสู่ระบบ";$("#batchActions").innerHTML="";
  $("#showCreateBatch").disabled=true;$("#createBatchForm").querySelectorAll("input,button").forEach(x=>x.disabled=true);
  $("#recordForm").querySelectorAll("input,select,button").forEach(x=>x.disabled=true);
  status("เข้าสู่ระบบก่อน เพื่อบันทึกและดูข้อมูล Batch บน Supabase");return;
 }
 $("#showCreateBatch").disabled=false;
 $("#createBatchForm").querySelectorAll("input,button").forEach(x=>x.disabled=false);
 $("#recordForm").querySelectorAll("input,select,button").forEach(x=>x.disabled=false);
 status("กำลังโหลดข้อมูลจาก Supabase Cloud...");
 const {data:rows,error}=await supabase.from("production_batches").select("id,batch_code,product_name,recipe_version,start_date,owner_name,status,flagged,created_at").order("created_at",{ascending:false});
 if(error)return status("โหลด Batch ไม่สำเร็จ: "+error.message+" — ตรวจสอบ SQL ใน Supabase",true);
 const ids=(rows||[]).map(x=>x.id);let ms=[];
 if(ids.length){const r=await supabase.from("batch_measurements").select("id,batch_id,measured_at,ph,brix,temperature,note").in("batch_id",ids).order("measured_at",{ascending:false});if(r.error)return status("โหลดประวัติการวัดไม่สำเร็จ: "+r.error.message,true);ms=r.data||[];}
 auditLogs=[];auditReady=true;auditError="";
 if(ids.length){
  const a=await supabase.from("batch_audit_logs").select("id,batch_id,entity_type,action,record_id,actor_id,before_data,after_data,created_at").in("batch_id",ids).order("created_at",{ascending:false}).limit(300);
  if(a.error){auditReady=false;auditError=a.error.message;}
  else auditLogs=a.data||[];
 }
 batches=(rows||[]).map(b=>({...b,measurements:ms.filter(m=>m.batch_id===b.id)}));
 status("เชื่อมต่อ Supabase Cloud แล้ว · ข้อมูลแยกตามบัญชีผู้ใช้");
 render();
}
function newCode(date){const d=(date||new Date().toISOString().slice(0,10)).replaceAll("-","");const n=batches.filter(b=>(b.batch_code||"").startsWith("NS-"+d+"-")).length+1;return "NS-"+d+"-"+String(n).padStart(3,"0");}
$("#showCreateBatch").onclick=()=>{$("#createPanel").hidden=false;$("#batchDate").value=new Date().toLocaleDateString("en-CA");$("#batchProduct").focus();};
$("#cancelCreate").onclick=()=>{$("#createPanel").hidden=true;};
$("#createBatchForm").onsubmit=async e=>{
 e.preventDefault();if(!currentUser)return status("กรุณาเข้าสู่ระบบก่อนสร้าง Batch",true);
 const date=$("#batchDate").value,p={user_id:currentUser.id,batch_code:newCode(date),product_name:$("#batchProduct").value.trim(),recipe_version:$("#batchRecipe").value.trim(),start_date:date,owner_name:$("#batchOwner").value.trim(),status:"active",flagged:false};
 if(!p.product_name||!date)return;
 const btn=$("#createBatchForm").querySelector('[type="submit"]');btn.disabled=true;
 const {data,error}=await supabase.from("production_batches").insert(p).select("id").single();btn.disabled=false;
 if(error)return status("สร้าง Batch ไม่สำเร็จ: "+error.message,true);
 $("#createBatchForm").reset();$("#createPanel").hidden=true;selectedBatchId=data.id;await load();showBatch(data.id);status("สร้าง Batch และบันทึกลง Supabase Cloud แล้ว");
};
$("#recordForm").onsubmit=async e=>{
 e.preventDefault();const b=batches.find(x=>x.id===$("#recordBatch").value);if(!b)return status("กรุณาเลือก Batch ที่กำลังดำเนินการ",true);
 const val=id=>$("#"+id).value===""?null:Number($("#"+id).value);
 const p={user_id:currentUser.id,batch_id:b.id,ph:val("recordPH"),brix:val("recordBrix"),temperature:val("recordTemp"),note:$("#recordNote").value.trim()};
 const flag=$("#recordFlag").checked;if(p.ph===null&&p.brix===null&&p.temperature===null&&!p.note&&!flag)return alert("กรอกค่าที่วัดได้หรือหมายเหตุก่อนบันทึกครับ");
 const btn=$("#recordForm").querySelector('[type="submit"]');btn.disabled=true;
 const {error}=await supabase.from("batch_measurements").insert(p);
 if(error){btn.disabled=false;return status("บันทึกค่าการวัดไม่สำเร็จ: "+error.message,true);}
 if(flag&&!b.flagged){const u=await supabase.from("production_batches").update({flagged:true}).eq("id",b.id);if(u.error){btn.disabled=false;await load();return status("บันทึกค่าการวัดแล้ว แต่เปลี่ยนสถานะตรวจสอบไม่สำเร็จ: "+u.error.message,true);}}
 btn.disabled=false;$("#recordForm").reset();selectedBatchId=b.id;await load();showBatch(b.id);status("บันทึกค่าการวัดลง Supabase Cloud แล้ว");
};
document.addEventListener("click",(event)=>{const button=event.target.closest("[data-open-batch]");if(button){showBatch(button.dataset.openBatch);}});
$("#batchFilter").onchange=render;
supabase.auth.onAuthStateChange(()=>window.setTimeout(load,0));
load();
