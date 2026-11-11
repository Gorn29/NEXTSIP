import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (s) => document.querySelector(s);

function showError(message) {
  $("#passportContent").hidden = true;
  $("#passportError").hidden = false;
  $("#passportError").textContent = message;
}

function showPassport(passport) {
  $("#passportContent").hidden = false;
  $("#productName").textContent = passport.product_name || "ไม่ระบุชื่อผลิตภัณฑ์";
  $("#origin").textContent = passport.origin || "ไม่ระบุแหล่งผลิต";
  $("#ingredients").textContent = passport.ingredients || "ไม่ระบุ";
  $("#batch").textContent = passport.batch_reference || "ไม่ระบุ";
  $("#story").textContent = passport.story || "ไม่มีเรื่องราวผลิตภัณฑ์";
  $("#batchStartDate").textContent = passport.batch_start_date
    ? new Date(passport.batch_start_date + "T00:00:00").toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
    : "ไม่มีข้อมูล";
  $("#batchStatus").textContent = passport.batch_status === "completed"
    ? "เสร็จสิ้น"
    : passport.batch_status === "active"
      ? "กำลังดำเนินการ"
      : "ยังไม่ได้เชื่อม Batch";
  $("#updated").textContent = "ข้อมูล Passport · " + (passport.created_at
    ? new Date(passport.created_at).toLocaleDateString("th-TH")
    : "");
}

async function loadPassport() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    showError("ไม่พบรหัส Passport ในลิงก์นี้");
    return;
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("เชื่อมต่อ Supabase ใช้เวลานานเกิน 15 วินาที กรุณารีเฟรชหน้าเว็บ")), 15000)
  );

  try {
    const request = supabase.rpc("get_public_passport", { p_passport_id: id });
    const { data, error } = await Promise.race([request, timeout]);
    if (error) throw error;

    const passport = Array.isArray(data) ? data[0] : data;
    if (!passport) {
      showError("ไม่พบ Passport นี้ หรือเจ้าของยังไม่ได้เผยแพร่ข้อมูล");
      return;
    }
    showPassport(passport);
  } catch (error) {
    console.error("Sip Passport loading error:", error);
    showError("โหลดข้อมูลไม่สำเร็จ: " + (error?.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
  }
}

loadPassport();
