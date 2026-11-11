import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const PAGE_URL="https://maxpookayak2-rgb.github.io/NEXTSIP/passport.html";
let currentUser=null,currentId=null,lang="th",batchRealtimeChannel=null;
const batchField=document.createElement("div");
batchField.className="field";
batchField.innerHTML='<label for="passportBatchLink">เชื่อมกับ Batch Guardian (ไม่บังคับ)</label><select id="passportBatchLink"><option value="">ไม่เชื่อม Batch</option></select><small class="muted">เลือก Batch ที่สร้างไว้ ระบบจะนำรหัส Batch มาใส่ใน Passport ให้อัตโนมัติ</small>';
$("#pref").closest(".field").before(batchField);
let autoFilledBatchCode="";
async function loadBatchOptions(){
 const select=$("#passportBatchLink");
 select.innerHTML='<option value="">ไม่เชื่อม Batch</option>';
 if(!currentUser){select.disabled=true;return;}
 select.disabled=false;
 const {data,error}=await supabase.from("production_batches").select("id,batch_code,product_name,status").order("created_at",{ascending:false});
 if(error){select.innerHTML='<option value="">โหลดรายการ Batch ไม่สำเร็จ</option>';select.disabled=true;return;}
 // Show only one option for each batch code (keep the newest record).
 const uniqueBatches=new Map();
 (data||[]).forEach(b=>{
  const key=String(b.batch_code||"").replace(/\s+/g,"").toUpperCase();
  if(key&&!uniqueBatches.has(key))uniqueBatches.set(key,b);
 });
 uniqueBatches.forEach(b=>{
  const o=document.createElement("option");o.value=b.id;o.dataset.code=b.batch_code;
  o.textContent=b.batch_code+" — "+b.product_name+(b.status==="completed"?" (เสร็จสิ้น)":"");
  select.append(o);
 });
}
$("#passportBatchLink").addEventListener("change",()=>{
 const option=$("#passportBatchLink").selectedOptions[0];
 if(option?.value){
  $("#pref").value=option.dataset.code||"";
  autoFilledBatchCode=option.dataset.code||"";
 }else{
  // Clear the reference only when it was filled automatically by the linked Batch.
  if(autoFilledBatchCode && $("#pref").value===autoFilledBatchCode)$("#pref").value="";
  autoFilledBatchCode="";
 }
 preview();
});
const labels={th:["วัตถุดิบ","รหัส Batch"],en:["Ingredients","Batch reference"],zh:["原料","批次编号"],ja:["原材料","バッチ番号"]};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function message(t,bad=false){$("#passportMessage").textContent=t;$("#passportMessage").style.color=bad?"#a34732":"#456447";}
function values(){return {product_name:$("#pname").value.trim(),origin:$("#origin").value.trim(),ingredients:$("#pingredients").value.trim(),batch_reference:$("#pref").value.trim(),batch_id:$("#passportBatchLink").value||null,story:$("#story").value.trim()};}
function preview(d=values()){
 $("#vname").textContent=d.product_name||"Untitled product";$("#vorigin").textContent=d.origin||"-";
 $("#ving").textContent=d.ingredients||"-";$("#vref").textContent=d.batch_reference||"-";$("#vstory").textContent=d.story||"-";
 $("#ilabel").textContent=labels[lang][0];$("#blabel").textContent=labels[lang][1];
}
function qrFor(id){
 const url=PAGE_URL+"?id="+encodeURIComponent(id);
 $("#qr").src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent(url);
 $("#passportPublicLink").innerHTML='<a href="'+url+'" target="_blank" rel="noopener">เปิดหน้า Passport สาธารณะ ↗</a>';
}
function fill(d){currentId=d.id;$("#pname").value=d.product_name||"";$("#origin").value=d.origin||"";$("#pingredients").value=d.ingredients||"";$("#pref").value=d.batch_reference||"";$("#passportBatchLink").value=d.batch_id||"";autoFilledBatchCode=d.batch_id?($("#passportBatchLink").selectedOptions[0]?.dataset.code||d.batch_reference||""):"";$("#story").value=d.story||"";preview(d);qrFor(d.id);}
function renderLibrary(rows){
 const el=$("#passportLibrary");
 if(!rows.length){el.innerHTML='<p class="muted">ยังไม่มี Passport ที่บันทึกไว้ กรอกข้อมูลแล้วกด “บันทึกและเผยแพร่ Passport”</p>';return;}
 el.innerHTML=rows.map(r=>'<article class="concept"><span class="tag">PUBLIC PASSPORT</span><h3>'+esc(r.product_name)+'</h3><p class="muted">Batch: '+esc(r.batch_reference||"-")+'</p><p class="muted">'+new Date(r.created_at).toLocaleString("th-TH")+'</p><button class="btn alt" type="button" data-load-passport="'+r.id+'">เปิด / แก้ไข</button> <a href="'+PAGE_URL+'?id='+encodeURIComponent(r.id)+'" target="_blank" rel="noopener">ดูหน้าสาธารณะ ↗</a></article>').join("");
 el.querySelectorAll("[data-load-passport]").forEach(b=>b.onclick=()=>loadOne(b.dataset.loadPassport));
}
function ensureBatchRealtime(){
 if(!currentUser||batchRealtimeChannel)return;
 batchRealtimeChannel=supabase.channel("passport-batches-"+currentUser.id)
  .on("postgres_changes",{event:"*",schema:"public",table:"production_batches",filter:"user_id=eq."+currentUser.id},()=>loadBatchOptions())
  .subscribe();
}
window.addEventListener("focus",()=>{if(currentUser)loadBatchOptions();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&currentUser)loadBatchOptions();});
async function loadLibrary(){
 const {data:{session}}=await supabase.auth.getSession();currentUser=session?.user||null;
 if(!currentUser){$("#passportCloudStatus").textContent="เข้าสู่ระบบเพื่อบันทึก Passport";$("#passportLibrary").innerHTML='<p class="muted">คุณสามารถดูตัวอย่างได้ แต่ต้องเข้าสู่ระบบก่อนบันทึกและเผยแพร่ <a href="./login.html">เข้าสู่ระบบ</a></p>';$("#savePassport").disabled=true;return;}
 $("#savePassport").disabled=false;$("#passportCloudStatus").textContent="Supabase Cloud";
 await loadBatchOptions();
 ensureBatchRealtime();
 const {data,error}=await supabase.from("product_passports").select("id,product_name,origin,ingredients,batch_reference,story,is_published,created_at,updated_at").eq("user_id",currentUser.id).order("created_at",{ascending:false});
 if(error){$("#passportCloudStatus").textContent="โหลด Passport ไม่สำเร็จ";$("#passportLibrary").textContent=error.message;return;}
 renderLibrary(data||[]);
}
async function loadOne(id){
 const {data,error}=await supabase.from("product_passports").select("*").eq("id",id).single();
 if(error){message("โหลด Passport ไม่สำเร็จ: "+error.message,true);return;}
 fill(data);message("เปิดข้อมูล Passport แล้ว");
}
$("#savePassport").onclick=async()=>{
 if(!currentUser){message("กรุณาเข้าสู่ระบบก่อนบันทึกครับ",true);return;}
 const d=values();if(!d.product_name){message("กรุณากรอกชื่อผลิตภัณฑ์ก่อนครับ",true);return;}
 const btn=$("#savePassport");btn.disabled=true;btn.textContent="กำลังบันทึก...";
 let result;
 if(currentId) result=await supabase.from("product_passports").update({...d,is_published:true,updated_at:new Date().toISOString()}).eq("id",currentId).select("id").single();
 else result=await supabase.from("product_passports").insert({...d,user_id:currentUser.id,is_published:true}).select("id").single();
 btn.disabled=false;btn.textContent="บันทึกและเผยแพร่ Passport";
 if(result.error){message("บันทึกไม่สำเร็จ: "+result.error.message+" — ตรวจสอบว่าได้รัน SQL ใน Supabase แล้วหรือยัง",true);return;}
 currentId=result.data.id;qrFor(currentId);message("บันทึกและเผยแพร่สำเร็จแล้ว QR นี้เปิดหน้า Passport จริงได้");
 await loadLibrary();
};
$("#newPassport").onclick=()=>{currentId=null;$("#pname").value="";$("#origin").value="";$("#pingredients").value="";$("#pref").value="";$("#passportBatchLink").value="";autoFilledBatchCode="";$("#story").value="";$("#qr").removeAttribute("src");$("#passportPublicLink").textContent="บันทึก Passport ก่อนเพื่อสร้าง QR";preview();message("เริ่มสร้าง Passport รายการใหม่");};
["pname","origin","pingredients","pref","story"].forEach(id=>$("#"+id).addEventListener("input",()=>preview()));
document.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{lang=b.dataset.lang;document.querySelectorAll("[data-lang]").forEach(x=>x.classList.toggle("on",x===b));preview();});
$("#check").onclick=()=>{let s=$("#guardText").value.toLowerCase(),hits=["ชวนดื่ม","ดื่มกัน","ดื่มเลย","ดื่มแล้ว","drink now","come drink","สุขภาพดี","รักษาโรค","ป้องกันโรค","ลดน้ำหนัก","cure","health benefit","detox"].filter(x=>s.includes(x));$("#guardResult").className="result "+(hits.length?"bad":"good");$("#guardResult").textContent=hits.length?"ควรตรวจสอบข้อความที่พบ: "+hits.join(", ")+" — ระบบนี้ไม่ใช่คำรับรองทางกฎหมาย":"ไม่พบคำสำคัญตามกฎพื้นฐาน แต่ควรตรวจทานก่อนเผยแพร่";};
supabase.auth.onAuthStateChange((_event,session)=>{
 if(!session&&batchRealtimeChannel){supabase.removeChannel(batchRealtimeChannel);batchRealtimeChannel=null;}
 currentUser=session?.user||null;window.setTimeout(loadLibrary,0);
});
preview();loadLibrary();
