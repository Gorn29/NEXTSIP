import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const id=new URLSearchParams(location.search).get("id");
const $=s=>document.querySelector(s);
const showError=t=>{$("#passportContent").hidden=true;$("#passportError").hidden=false;$("#passportError").textContent=t;};
if(!id){showError("ไม่พบรหัส Passport ในลิงก์นี้");}
else{
 const {data,error}=await supabase.rpc("get_public_passport",{p_passport_id:id});
 const passport=Array.isArray(data)?data[0]:data;
 if(error||!passport)showError("ไม่พบ Passport นี้ หรือเจ้าของยังไม่ได้เผยแพร่ข้อมูล");
 else{
  $("#passportContent").hidden=false;$("#productName").textContent=passport.product_name;$("#origin").textContent=passport.origin||"ไม่ระบุแหล่งผลิต";$("#ingredients").textContent=passport.ingredients||"ไม่ระบุ";$("#batch").textContent=passport.batch_reference||"ไม่ระบุ";$("#story").textContent=passport.story||"ไม่มีเรื่องราวผลิตภัณฑ์";
  $("#batchStartDate").textContent=passport.batch_start_date?new Date(passport.batch_start_date+"T00:00:00").toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric"}):"ไม่มีข้อมูล";
  $("#batchStatus").textContent=passport.batch_status==="completed"?"เสร็จสิ้น":passport.batch_status==="active"?"กำลังดำเนินการ":"ยังไม่ได้เชื่อม Batch";
  $("#updated").textContent="ข้อมูล Passport · "+new Date(passport.created_at).toLocaleDateString("th-TH");
 }
}
