/* ==========================================================================
   POLYSAFE — shared nav behavior (used on every page)
   Handles the placeholder Login/Sign Up button. Per the project plan, this
   button is visual-only for now — it does not create an account or log in.
   ========================================================================== */

function showToast(msg) {
  let toast = document.getElementById("polysafe-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "polysafe-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

document.addEventListener("DOMContentLoaded", () => {
  const signupBtn = document.getElementById("signup-btn");
  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      showToast("Sign-up is coming soon — this button is a preview for now.");
    });
  }
});
