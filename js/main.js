let encryptedLLM = "";
let encryptedGIT = "";

const keyInput = document.getElementById("cryptoKeyInput");
const errorElement = document.getElementById("errorMessage");

// 1. Tự động đọc dữ liệu từ file data.json khi trang load xong
window.addEventListener('DOMContentLoaded', () => {
    fetch('cipher.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Không thể tải file dữ liệu JSON");
            }
            return response.json();
        })
        .then(data => {
            encryptedLLM = data.LLM;
            encryptedGIT = data.GIT;
            encryptedGIT_USERNAME = data.GIT_USERNAME;
            encryptedGIT_REPO = data.GIT_REPO;
            console.log("Đã tải file dữ liệu mã hóa thành công.");
        })
        .catch(err => {
            console.error("Lỗi cấu hình:", err);
            alert("Không tìm thấy file data.json hoặc file bị lỗi cấu trúc!");
        });
});

// 2. Bắt sự kiện người dùng nhấn nút "Enter" trên ô input
if (keyInput) {
    keyInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Tránh reload trang ngoài ý muốn
            handleDecrypt();
        }
    });
}

// 3. Logic giải mã và điều hướng vô hạn nếu sai
function handleDecrypt() {
    const key = keyInput.value.trim();

    if (!encryptedLLM || !encryptedGIT) {
        alert("Dữ liệu mã hóa chưa được tải xong, vui lòng đợi một chút!");
        return;
    }

    if (!key) {
        showError();
        return;
    }

    try {
        // Thực hiện giải mã với key lấy từ ô tìm kiếm
        const parsedKey = CryptoJS.enc.Utf8.parse(key);
        const iv = CryptoJS.enc.Utf8.parse("0000000000000000");

        const bytesLLM = CryptoJS.AES.decrypt(encryptedLLM, parsedKey,{
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const decryptedTextLLM = bytesLLM.toString(CryptoJS.enc.Utf8);


        const bytesGIT = CryptoJS.AES.decrypt(encryptedGIT, parsedKey,{
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const decryptedTextGIT = bytesGIT.toString(CryptoJS.enc.Utf8);


        const bytesGIT_USERNAME = CryptoJS.AES.decrypt(encryptedGIT_USERNAME, parsedKey,{
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const decryptedTextGIT_USERNAME = bytesGIT_USERNAME.toString(CryptoJS.enc.Utf8);


        const bytesGIT_REPO = CryptoJS.AES.decrypt(encryptedGIT_REPO, parsedKey,{
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const decryptedTextGIT_REPO = bytesGIT_REPO.toString(CryptoJS.enc.Utf8);

        // Regex check chỉ chứa các ký tự
        const printableAsciiRegex = /^[ -~]+$/;
        if (decryptedTextLLM && decryptedTextGIT 
            && printableAsciiRegex.test(decryptedTextLLM)
            && printableAsciiRegex.test(decryptedTextGIT)) {
            if (errorElement) errorElement.style.display = "none";
            alert("Xác thực thành công! Đang chuyển hướng...");
            
            // Link page ông muốn chuyển đến sau khi pass
            localStorage.setItem("LLM", decryptedTextLLM);
            localStorage.setItem("GIT", decryptedTextGIT);
            localStorage.setItem("GIT_REPO", decryptedTextGIT_REPO);
            localStorage.setItem("GIT_USERNAME", decryptedTextGIT_USERNAME);

            window.location.href = "index.html"; 
        } else {
            showError();
        }
    } catch (error) {
        // Key sai hoàn toàn hoặc lỗi thư viện -> bắt nhập lại
        showError();
    }
}

// Hàm xử lý khi nhập sai: hiện lỗi, xóa trắng ô nhập, focus lại để nhập tiếp (vô hạn)
function showError() {
    if (errorElement) errorElement.style.display = "block";
    if (keyInput) {
        keyInput.value = ""; 
        keyInput.focus();
    }
}




