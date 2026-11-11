import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const configured = SUPABASE_URL.startsWith("https://")
  && !SUPABASE_URL.includes("YOUR_")
  && SUPABASE_PUBLISHABLE_KEY
  && !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");

if (!configured) {
  window.location.replace("./login.html?setup=1");
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    window.location.replace("./login.html");
  } else {
    const top = document.querySelector(".top");
    const account = document.createElement("div");
    account.className = "account-bar";
    account.innerHTML = `
      <span class="account-email"></span>
      <button class="account-logout" type="button">ออกจากระบบ</button>
    `;
    top.append(account);
    account.querySelector(".account-email").textContent = session.user.email || "ผู้ใช้ NEXT SIP";
    account.querySelector(".account-logout").addEventListener("click", async () => {
      const button = account.querySelector("button");
      button.disabled = true;
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        button.disabled = false;
        alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }
      window.location.replace("./login.html");
    });

    supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" || !nextSession) {
        window.location.replace("./login.html");
      }
    });
    document.body.classList.remove("auth-pending");
  }
}
