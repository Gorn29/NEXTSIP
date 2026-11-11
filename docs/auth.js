import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const $ = (selector) => document.querySelector(selector);
const status = $("#auth-status");
const configured = SUPABASE_URL.startsWith("https://")
  && !SUPABASE_URL.includes("YOUR_")
  && SUPABASE_PUBLISHABLE_KEY
  && !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");

function showStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = false;
}
function setBusy(busy) {
  document.querySelectorAll("form button").forEach((button) => {
    button.disabled = busy;
  });
}

if (!configured) {
  showStatus("ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase: กรุณาใส่ Project URL และ Publishable key ในไฟล์ supabase-config.js ก่อน", "warning");
  document.querySelectorAll("form button").forEach((button) => { button.disabled = true; });
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.replace("./index.html");

  $("#show-register").addEventListener("click", () => {
    $("#login-panel").hidden = true;
    $("#register-panel").hidden = false;
    status.hidden = true;
  });
  $("#show-login").addEventListener("click", () => {
    $("#register-panel").hidden = true;
    $("#login-panel").hidden = false;
    status.hidden = true;
  });

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(true);
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return showStatus("เข้าสู่ระบบไม่สำเร็จ: กรุณาตรวจสอบอีเมลและรหัสผ่าน หรือยืนยันอีเมลก่อน", "error");
    window.location.replace("./index.html");
  });

  $("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fullName = $("#register-name").value.trim();
    const email = $("#register-email").value.trim();
    const password = $("#register-password").value;
    const confirmPassword = $("#register-confirm").value;
    if (password.length < 8) return showStatus("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", "error");
    if (password !== confirmPassword) return showStatus("รหัสผ่านทั้งสองช่องไม่ตรงกัน", "error");

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, account_type: "producer" } }
    });
    setBusy(false);

    if (error) return showStatus("สมัครสมาชิกไม่สำเร็จ: " + error.message, "error");
    if (data.session) window.location.replace("./index.html");
    else showStatus("สมัครสมาชิกสำเร็จแล้ว กรุณาเปิดอีเมลเพื่อกดยืนยันบัญชีก่อนเข้าสู่ระบบ", "success");
  });

  $("#reset-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(true);
    const email = $("#reset-email").value.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname.replace(/login\.html$/, "reset-password.html")
    });
    setBusy(false);
    if (error) return showStatus("ส่งคำขอเปลี่ยนรหัสผ่านไม่สำเร็จ: " + error.message, "error");
    showStatus("หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้", "success");
  });
}
