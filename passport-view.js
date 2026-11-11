import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const id=new URLSearchParams(location.search).get("id");
const $=s=>document.querySelector(s);
const showError=t=>{$("#passportContent").hidden=true;$("#passportError").hidden=false;$("#passportError").textContent=t;};
if(!id){showError("ไม่พบรหัส Passport ในลิงก์นี้");}
else{
 const {data,error}=await supabase.from("product_passports").select("product_name,origin,ingredients,batch_reference,story,created_at").eq("id",id).eq("is_published",true).maybeSingle();
 if(error||!data)showError("ไม่พบ Passport นี้ หรือเจ้าของยังไม่ได้เผยแพร่ข้อมูล");
 else{
  $("#passportContent").hidden=false;$("#productName").textContent=data.product_name;$("#origin").textContent=data.origin||"ไม่ระบุแหล่งผลิต";$("#ingredients").textContent=data.ingredients||"ไม่ระบุ";$("#batch").textContent=data.batch_reference||"ไม่ระบุ";$("#story").textContent=data.story||"ไม่มีเรื่องราวผลิตภัณฑ์";$("#updated").textContent="ข้อมูล Passport · "+new Date(data.created_at).toLocaleDateString("th-TH");
 }
}
