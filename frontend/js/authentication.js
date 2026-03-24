// frontend/js/authentication.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="text"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            // --- Unified Admin Intercept ---
            if (email === 'admin' && password === 'adminMapnexus2026') {
                localStorage.setItem('isAdmin', 'true');
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userId', 'admin-001');
                localStorage.setItem('username', 'Admin Master');
                window.location.href = 'admin-dashboard.html';
                return;
            }

            const btn = loginForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังเข้าสู่ระบบ...';
            btn.disabled = true;

            try {
                const response = await CityAPI.login(email, password);
                if (response.status === "success") {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userId', response.data.id);
                    localStorage.setItem('username', response.data.username);
                    window.location.href = 'index.html';
                } else {
                    alert(response.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.querySelector('input[type="text"]').value;
            const email = registerForm.querySelector('input[type="email"]').value;
            const password = registerForm.querySelector('input[type="password"]').value;

            const btn = registerForm.querySelector('button');
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังสร้างบัญชี...';
            btn.disabled = true;

            try {
                const response = await CityAPI.register(username, email, password);
                if (response.status === "success") {
                    window.location.href = 'login.html?registered=true';
                } else {
                    alert(response.message || "ไม่สามารถสมัครสมาชิกได้");
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Register error:", error);
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
                btn.disabled = false;
            }
        });
    }
});
