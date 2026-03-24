// frontend/js/checkin.js

async function handleCheckin(placeId, name) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert("กรุณาเข้าสู่ระบบก่อนเช็คอินครับ");
        window.location.href = 'login.html';
        return;
    }

    // Optional: Get XP earned from backend or set default
    const xpEarned = 350;

    try {
        const response = await CityAPI.createCheckin(userId, placeId, xpEarned);
        if (response.status === "success") {
            // Success alert
            alert(`เช็คอินสำเร็จที่ ${name}! คุณได้รับ ${xpEarned} XP`);

            // If on profile page, refresh data
            if (typeof updateProfileUI === 'function') {
                updateProfileUI();
            }

            // If on map, maybe show a success state
            console.log("Check-in recorded:", response.data);
        } else {
            alert(response.message || "เช็คอินไม่สำเร็จ");
        }
    } catch (error) {
        console.error("Checkin error:", error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
}

window.handleCheckin = handleCheckin;
