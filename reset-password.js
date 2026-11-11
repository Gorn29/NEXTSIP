import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const form = document.querySelector("#new-password-form");
const status = document.querySelector("#reset-status");
function show(message, kind) {
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = false;
}

const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  show("ลิงก์ตั้งรหัสผ่านอาจหมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ", "error");
  form.querySelector("button").disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#new-password").value;
  const confirm = document.querySelector("#confirm-password").value;
  if (password.length < 8) return show("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", "error");
  if (password !== confirm) return show("รหัสผ่านทั้งสองช่องไม่ตรงกัน", "error");
  const button = form.querySelector("button");
  button.disabled = true;
  const { error } = await supabase.auth.updateUser({ password });
  button.disabled = false;
  if (error) return show("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์ใหม่แล้วลองอีกครั้ง", "error");
  show("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กำลังกลับไปหน้าเข้าสู่ระบบ...", "success");
  await supabase.auth.signOut();
  window.setTimeout(() => window.location.replace("./login.html"), 1400);
});
