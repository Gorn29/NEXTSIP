import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector) => document.querySelector(selector);
const list = $("#savedFlavorList");
const status = $("#flavorCloudStatus");
const message = $("#flavorSaveMessage");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#a34732" : "#456447";
}

function renderRows(rows) {
  if (!rows.length) {
    list.innerHTML = '<p class="muted">ยังไม่มีแนวคิดที่บันทึกไว้ เมื่อสร้าง Concept แล้วกด “บันทึกแนวคิด” เพื่อเก็บไว้ในคลังของคุณ</p>';
    return;
  }
  list.innerHTML = rows.map((row) => `
    <article class="concept">
      <span class="tag">${escapeHTML(row.concept_type || "FLAVOR CONCEPT")}</span>
      <h3>${escapeHTML(row.title)}</h3>
      <p class="muted">${escapeHTML(row.description)}</p>
      <p class="muted"><b>วัตถุดิบ:</b> ${escapeHTML((row.ingredients || []).join(" · "))}</p>
      <p class="muted"><b>ตลาด:</b> ${escapeHTML(row.market || "-")}</p>
      ${(row.flavor_tags || []).length ? `<p class="muted"><b>Flavor Tags:</b> ${escapeHTML(row.flavor_tags.join(" · "))}</p>` : ""}
      <p class="muted">บันทึกเมื่อ ${new Date(row.created_at).toLocaleString("th-TH")}</p>
      <button class="btn alt" type="button" data-delete-flavor="${row.id}">ลบรายการ</button>
    </article>
  `).join("");
  list.querySelectorAll("[data-delete-flavor]").forEach((button) => {
    button.addEventListener("click", () => deleteConcept(button.dataset.deleteFlavor));
  });
}

async function loadConcepts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    status.textContent = "เข้าสู่ระบบเพื่อบันทึก";
    list.innerHTML = '<p class="muted">คุณสามารถทดลองสร้างแนวคิดได้โดยไม่ต้องเข้าสู่ระบบ แต่ต้องเข้าสู่ระบบก่อนบันทึกลง My Flavor Library <a href="./login.html">เข้าสู่ระบบ / สมัครสมาชิก</a></p>';
    return;
  }
  status.textContent = "Supabase Cloud";
  const { data, error } = await supabase
    .from("flavor_concepts")
    .select("id,title,concept_type,description,ingredients,market,goal,flavor_tags,flavor_profile,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    list.textContent = "โหลดข้อมูลไม่สำเร็จ: " + error.message;
    status.textContent = "ต้องตั้งค่าฐานข้อมูล";
    return;
  }
  renderRows(data || []);
}

async function saveConcept(index, button) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    setMessage("กรุณาเข้าสู่ระบบก่อนบันทึกแนวคิดครับ", true);
    return;
  }
  const concept = window.NEXTSIP_FLAVOR_CONCEPTS?.[index];
  if (!concept) {
    setMessage("ไม่พบ Concept กรุณากดสร้างแนวคิดอีกครั้ง", true);
    return;
  }
  const payload = {
    user_id: session.user.id,
    title: concept[0],
    concept_type: concept[1],
    description: concept[2],
    ingredients: window.NEXTSIP_FLAVOR_INGREDIENTS || [],
    market: $("#market")?.value || "",
    goal: "",
    flavor_tags: window.NEXTSIP_SELECTED_FLAVOR_TAGS || [],
    flavor_profile: {
      fruity: concept.score[0], floral: concept.score[1], herbal: concept.score[2],
      sweet: concept.score[3], acidic: concept.score[4], spicy: concept.score[5]
    }
  };
  button.disabled = true;
  button.textContent = "กำลังบันทึก...";
  const { error } = await supabase.from("flavor_concepts").insert(payload);
  button.disabled = false;
  button.textContent = "บันทึกแนวคิด";
  if (error) {
    setMessage("บันทึกไม่สำเร็จ: " + error.message + " — ตรวจสอบว่ารัน SQL ใน Supabase แล้วหรือยัง", true);
    return;
  }
  setMessage("บันทึกแนวคิดลง Supabase Cloud เรียบร้อยแล้ว");
  await loadConcepts();
}

async function deleteConcept(id) {
  if (!confirm("ต้องการลบแนวคิดนี้ใช่ไหม?")) return;
  const { error } = await supabase.from("flavor_concepts").delete().eq("id", id);
  if (error) {
    setMessage("ลบไม่สำเร็จ: " + error.message, true);
    return;
  }
  setMessage("ลบแนวคิดเรียบร้อยแล้ว");
  await loadConcepts();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-concept]");
  if (button) saveConcept(Number(button.dataset.saveConcept), button);
});

supabase.auth.onAuthStateChange(() => {
  window.setTimeout(loadConcepts, 0);
});
loadConcepts();
