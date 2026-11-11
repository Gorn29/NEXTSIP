import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const configured = SUPABASE_URL.startsWith("https://")
  && !SUPABASE_URL.includes("YOUR_")
  && SUPABASE_PUBLISHABLE_KEY
  && !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");

const top = document.querySelector(".top");

function renderGuest() {
  const account = document.createElement("div");
  account.className = "account-bar";
  account.innerHTML = '<span class="account-email">เข้าใช้งานเพื่อบันทึกข้อมูลส่วนตัว</span><a class="account-logout" href="./login.html">เข้าสู่ระบบ / สมัครสมาชิก</a>';
  top.append(account);
}

if (!configured) {
  renderGuest();
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data: { session } } = await supabase.auth.getSession();

  function renderAccount(currentSession) {
    document.querySelector(".account-bar")?.remove();

    if (!currentSession) {
      renderGuest();
      return;
    }

    const account = document.createElement("div");
    account.className = "account-bar";
    account.innerHTML = '<span class="account-email"></span><button class="account-logout" type="button">ออกจากระบบ</button>';
    account.querySelector(".account-email").textContent = currentSession.user.email || "ผู้ใช้ NEXT SIP";
    account.querySelector(".account-logout").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const { error } = await supabase.auth.signOut();
      if (error) {
        button.disabled = false;
        alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    });
    top.append(account);
  }

  renderAccount(session);
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    renderAccount(nextSession);
  });
}
