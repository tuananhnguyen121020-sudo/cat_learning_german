// ==========================================
// LOGIC TRA CỨU TỪ VÀ HIỂN THỊ KẾT QUẢ
// ==========================================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultBox = document.getElementById('search-result');
const searchLoader = document.getElementById('search-loader');

const GITHUB_OWNER = localStorage.getItem("GIT_USERNAME");
const GITHUB_REPO = localStorage.getItem("GIT_REPO");
const FILE_PATH = 'dict.json'; 
const GITHUB_TOKEN = localStorage.getItem("GIT")

let globalDict = {};         // Chứa toàn bộ Object Map từ dict.json
let currentFlashcardData = null; // Dữ liệu của từ đang hiển thị trên card
let flashcardFilter = 'all'; // Bộ lọc từ loại hiện tại: 'all' | 'noun' | 'verb' | 'adjective'
let recentWordsQueue = [];   // Hàng đợi lưu các từ vừa xem để tránh lặp lại ngay lập tức

// Bắt sự kiện khi bấm nút Tìm kiếm hoặc Enter
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// async function handleSearch() {
//     const query = searchInput.value.trim().toLowerCase();
//     if (!query) return;

//     // Ẩn kết quả cũ, hiện loader
//     searchResultBox.style.display = 'none';
//     searchLoader.style.display = 'block';

//     try {
//         // 1. Fetch file dict.json hiện tại
//         // Đổi đường dẫn này thành link raw github nếu ông để dict trên github
//         const response = await fetch('dict.json'); 
//         let dict = [];
//         if (response.ok) {
//             dict = await response.json();
//         }

//         // 2. Tìm từ trong từ điển (tìm không phân biệt hoa thường)
//         const foundWord = dict.find(item => item.word.toLowerCase() === query);

//         if (foundWord) {
//             // Có trong từ điển -> Render luôn
//             renderResult(foundWord);
//         } else {
//             // Không có -> Gọi Gemini tạo data mới và update lên Github
//             console.log(`Từ "${query}" chưa có. Đang gọi Gemini API...`);
//             await fetchFromGeminiAndSave(query, dict);
//         }
//     } catch (error) {
//         console.error("Lỗi quá trình tìm kiếm:", error);
//         alert("Có lỗi xảy ra khi đọc từ điển!");
//         searchLoader.style.display = 'none';
//     }
// }


async function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    searchResultBox.style.display = 'none';
    searchLoader.style.display = 'block';

    try {
        // CÁCH TÌM KIẾM BẤT TỬ (BULLETPROOF): 
        // Quét thẳng vào thuộc tính "word" của tất cả các từ, ép về chữ thường để so sánh.
        // Bất chấp cái key bên ngoài (từ_khóa) ông lưu viết hoa hay thường nó đều mò ra được hết!
        const foundWord = Object.values(globalDict).find(
            item => item && item.word && item.word.toLowerCase() === query
        );

        if (foundWord) {
            console.log(`Đã tìm thấy từ "${query}" trong dữ liệu hiện tại!`);
            renderResult(foundWord);
        } else {
            console.log(`Từ "${query}" thật sự chưa có. Đang gọi Gemini API...`);
            await fetchFromGeminiAndSave(query);
        }
    } catch (error) {
        console.error("Lỗi quá trình tìm kiếm:", error);
        alert("Có lỗi xảy ra khi xử lý tìm kiếm!");
        searchLoader.style.display = 'none';
    }
}

// Hàm render dữ liệu JSON ra giao diện
function renderResult(data) {
    searchLoader.style.display = 'none';
    searchResultBox.style.display = 'block';

    // Xử lý Header: Bài viết (Article) + Word
    const articleEl = document.getElementById('res-article');
    const wordEl = document.getElementById('res-word');
    
    if (data.type === 'noun' && data.details.article) {
        articleEl.textContent = data.details.article;
        articleEl.className = `badge fs-6 me-2 article-${data.details.article.toLowerCase()}`;
        articleEl.style.display = 'inline-block';
    } else {
        articleEl.style.display = 'none';
    }
    wordEl.textContent = data.word;

    // Xử lý Type, Phát âm, Nghĩa
    document.getElementById('res-type').textContent = data.type;
    document.getElementById('res-pronunciation').textContent = data.pronunciation;
    document.getElementById('res-meaning').textContent = data.meaning_en;

    // Xử lý HÀM PHÁT ÂM THANH (Dùng link ẩn của Google Translate)
    const audioBtn = document.getElementById('audioBtn');
    
    audioBtn.onclick = () => {
        const textToSpeak = (data.type === 'noun' && data.details.article) 
            ? `${data.details.article} ${data.word}` 
            : data.word;

        // Kiểm tra xem trình duyệt có hỗ trợ Text-to-Speech không
        if ('speechSynthesis' in window) {
            // 1. Hủy các âm thanh đang phát dở trước đó (tránh bị nói đè nếu bấm liên tục)
            window.speechSynthesis.cancel();

            // 2. Tạo đối tượng đọc chuỗi văn bản
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            
            // 3. Thiết lập cấu hình đọc
            utterance.lang = 'de-DE';  // Bắt buộc ép về giọng tiếng Đức chuẩn (German)
            utterance.rate = 0.85;     // Tốc độ đọc (ông có thể chỉnh từ 0.1 đến 10, để 0.85 cho bạn gái nghe chậm rãi, rõ ràng)
            utterance.pitch = 1.0;    // Cao độ của giọng nói (mặc định là 1.0)

            // 4. Ra lệnh cho trình duyệt phát âm thanh
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Trình duyệt này cũ quá rồi, không hỗ trợ tính năng phát âm thanh tự động đâu ông ơi!");
        }
    };

    // Xử lý Details (Thay đổi theo Noun/Verb/Adj)
    const detailsContainer = document.getElementById('res-details-container');
    let detailsHtml = '';

    if (data.type === 'noun') {
        detailsHtml = `
            <div class="row">
                <div class="col-6"><span class="text-white-50">Plural:</span> <br><strong class="text-white">${data.details.plural || 'N/A'}</strong></div>
            </div>`;
    } else if (data.type === 'verb') {
        detailsHtml = `
            <div class="row g-2">
                <div class="col-6"><span class="text-white-50">Infinitive:</span> <br><strong class="text-white">${data.details.infinitive}</strong></div>
                <div class="col-6"><span class="text-white-50">Hilfs:</span> <br><strong class="text-white">${data.details.auxiliary_verb}</strong></div>
                <div class="col-6"><span class="text-white-50">Präteritum:</span> <br><strong class="text-white">${data.details.praeteritum}</strong></div>
                <div class="col-6"><span class="text-white-50">Perfekt:</span> <br><strong class="text-white">${data.details.perfekt}</strong></div>
            </div>`;
    } else {
        detailsHtml = `<div class="text-white-50">Adjective / Adverb (No inflected forms in the detailed table)</div>`;
    }
    detailsContainer.innerHTML = detailsHtml;

    // Xử lý Ví dụ
    document.getElementById('res-example-de').textContent = data.example_de;
    document.getElementById('res-example-en').textContent = data.example_en;
}

// Hàm khung để gọi Gemini và GitHub (Ông tự điền key vào để chạy)
async function fetchFromGeminiAndSave(query, currentDict) {
    const GEMINI_API_KEY = localStorage.getItem("LLM"); // ⚠️ NGUY HIỂM LỘ KEY

    console.log(GEMINI_API_KEY)
    const GITHUB_TOKEN = "ĐIỀN_TOKEN_GITHUB_VÀO_ĐÂY"; // ⚠️ NGUY HIỂM LỘ KEY

    if (!GEMINI_API_KEY || !GITHUB_TOKEN){
        alert("Thiếu Gemini API Key trong localStorage rồi ông ơi!");
        return;
    }

    const modelList = [
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash"
    ];
    
    const geminiPrompt = `Analyze "${query}". Return ONLY raw JSON (no markdown, no text):
    {
    "word": "Capitalized German word",
    "type": "noun|verb|adjective",
    "pronunciation": "/IPA/",
    "meaning_en": "English meaning",
    "details": {
        "article": "der/die/das or ''",
        "plural": "Plural or ''",
        "infinitive": "Inf. or ''",
        "praeteritum": "Prät. or ''",
        "perfekt": "Perfekt or ''",
        "auxiliary_verb": "haben/sein or ''"
    },
    "example_de": "Contextual sentence",
    "example_en": "Translation"
    }

    Rules:
    - noun: fill article, plural. Verb fields = ''.
    - verb: fill infinitive, praeteritum, perfekt, auxiliary_verb. Noun fields = ''.
    - adj: all details fields = ''.
    - STRICT: Return NO formatting, NO explanation, raw JSON ONLY.`;


    for (const model of modelList){
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        try {
            // 1. Thực hiện lệnh gọi API bằng POST

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_API_KEY
                    
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: geminiPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API báo lỗi hệ thống: ${response.status}`);
            }
            const jsonResult = await response.json();
            const rawTextFromGemini = jsonResult.candidates[0].content.parts[0].text;
            const newWordData = JSON.parse(rawTextFromGemini);

            renderResult(newWordData);
            saveGeminiWordToGitHub(newWordData);

            break;
        } catch (error) {
            console.error("Quá trình gọi Gemini bị crash:", error);
            searchLoader.style.display = 'none';
        }
        
    }
}

function switchTab(tabId) {
    const searchTab = document.getElementById('search-tab');
    const flashcardTab = document.getElementById('flashcard-tab');

    // 1. Ẩn tất cả các tab theo cách triệt để nhất
    searchTab.style.setProperty('display', 'none', 'important');
    flashcardTab.style.setProperty('display', 'none', 'important');
    
    // Xóa class layout flex khi ẩn tab flashcard
    flashcardTab.classList.remove('d-flex', 'flex-column', 'align-items-center');

    // Reset trạng thái active của nút Navbar
    document.getElementById('btn-search-tab').classList.remove('active');
    document.getElementById('btn-flashcard-tab').classList.remove('active');

    // 2. Hiện đúng tab được chọn
    if (tabId === 'flashcard-tab') {
        // Khi bật tab flashcard, vừa bật display: flex vừa nạp lại các class căn giữa của Bootstrap
        flashcardTab.style.setProperty('display', 'flex', 'important');
        flashcardTab.classList.add('d-flex', 'flex-column', 'align-items-center');
    } else {
        searchTab.style.setProperty('display', 'block', 'important');
    }

    // Làm sáng nút trên Navbar
    document.getElementById(`btn-${tabId}`).classList.add('active');
}


// ==========================================
// 1. BIẾN TOÀN CỤC (GLOBAL VARIABLES)
// ==========================================


// ==========================================
// 2. KHỞI CHẠY ỨNG DỤG (INIT)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // Tự động tải từ điển khi vừa mở trang
    await loadDictionary();
    
    // Nạp từ đầu tiên cho Flashcard sau khi đã có dữ liệu
    if (Object.keys(globalDict).length > 0) {
        loadNextFlashcard();
    }
});

// Hàm fetch file dict.json từ local server
// async function loadDictionary() {
//     try {
//         const response = await fetch('dict.json');
//         if (!response.ok) {
//             throw new Error("Không thể tải file dict.json");
//         }
//         globalDict = await response.json();
//         console.log("Đã nạp thành công kho từ vựng:", Object.keys(globalDict).length, "từ.");
//     } catch (error) {
//         console.error("Lỗi nạp từ điển:", error);
//         alert("Không tìm thấy hoặc lỗi file dict.json rồi ông ơi!");
//     }
// }


async function loadDictionary() {
    // Đọc thẳng file RAW từ Github để lấy dữ liệu Real-time
    const rawFileUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${FILE_PATH}`;
    
    try {
        const response = await fetch(`${rawFileUrl}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Không thể tải file từ Github");
        
        globalDict = await response.json();

        console.log(globalDict)
        console.log("Đã nạp thành công kho từ vựng từ GitHub:", Object.keys(globalDict).length, "từ.");
    } catch (error) {
        console.error("Lỗi nạp từ Github, đọc local dự phòng:", error);
        const localResponse = await fetch('dict.json');
        globalDict = await localResponse.json();
    }
}

// ==========================================
// 3. LOGIC THUẬT TOÁN FLASHCARD
// ==========================================

// Hàm lọc và bốc một từ ngẫu nhiên trong kho dữ liệu
function pickRandomWord() {
    if (!globalDict || Object.keys(globalDict).length === 0) return false;

    // Bước A: Lọc các từ theo từ loại đang chọn
    let filteredKeys = Object.keys(globalDict).filter(key => {
        if (flashcardFilter === 'all') return true;
        return globalDict[key].type === flashcardFilter;
    });

    if (filteredKeys.length === 0) return false;

    // Bước B: Thuật toán loại trừ các từ vừa mới xem xong (Chống lặp)
    let availableKeys = filteredKeys.filter(key => !recentWordsQueue.includes(key));
    
    // Nếu lọc gắt quá không còn từ nào trống, reset hàng đợi và chấp nhận bốc lại dữ liệu cũ
    if (availableKeys.length === 0) {
        availableKeys = filteredKeys;
        recentWordsQueue = [];
    }

    // Bước C: Bốc ngẫu nhiên 1 key trong danh sách hợp lệ
    const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    currentFlashcardData = globalDict[randomKey];

    // Bước D: Cập nhật hàng đợi chống trùng (Giữ tối đa 3 từ gần nhất)
    recentWordsQueue.push(randomKey);
    if (recentWordsQueue.length > 3) {
        recentWordsQueue.shift(); 
    }
    return true;
}

// Hàm nạp từ đầu tiên hoặc ép nạp từ mới (Ví dụ: khi bấm chọn bộ lọc từ loại)
function loadNextFlashcard() {
    const cardEl = document.getElementById('flashcard');
    if (cardEl) cardEl.classList.remove('flipped'); // Đảm bảo card quay về mặt trước

    if (pickRandomWord()) {
        renderFlashcardContent(currentFlashcardData);
    } else {
        alert(`Kho từ điển của ông chưa có từ nào thuộc loại: ${flashcardFilter}`);
    }
}

// Hàm thay đổi bộ lọc từ loại khi người dùng tương tác với nút bấm (Radio button)
function filterFlashcards(type) {
    flashcardFilter = type;
    recentWordsQueue = []; // Xóa lịch sử trùng từ cũ để tính toán lại từ loại mới
    loadNextFlashcard();
}

// ==========================================
// 4. HIỆU ỨNG LẬT CARD & ĐỔ DỮ LIỆU
// ==========================================

// Hàm xử lý lật qua lật lại và TỰ ĐỘNG đổi từ khi đóng card về mặt trước
function toggleFlipCard() {
    const cardEl = document.getElementById('flashcard');
    if (!cardEl) return;

    const isFlipped = cardEl.classList.contains('flipped');

    if (!isFlipped) {
        // [TỪ MẶT TRƯỚC -> MẶT SAU]: Bạn gái ông lật xem nghĩa -> Giữ nguyên từ
        cardEl.classList.add('flipped');
    } else {
        // [TỪ MẶT SAU -> MẶT TRƯỚC]: Bạn gái ông lật đóng lại -> Đổi luôn từ mới!
        cardEl.classList.remove('flipped');

        // Bốc sẵn dữ liệu từ mới
        if (pickRandomWord()) {
            // Đợi 200ms khi card đang xoay vuông góc nghiêng (giấu chữ cũ đi),
            // Ta âm thầm thay đổi nội dung chữ mới vào, lật ra cái là thấy từ mới luôn!
            setTimeout(() => {
                renderFlashcardContent(currentFlashcardData);
            }, 200);
        }
    }
}

// Hàm bơm dữ liệu từ Object động vào các thẻ HTML tương ứng
function renderFlashcardContent(data) {
    // --- CẬP NHẬT MẶT TRƯỚC ---
    const frontArticle = document.getElementById('fc-front-article');
    const frontWord = document.getElementById('fc-front-word');
    const frontType = document.getElementById('fc-front-type');

    if (data.type === 'noun' && data.details.article) {
        frontArticle.textContent = data.details.article;
        // Đổi class badge màu sắc linh hoạt dựa trên giống der/die/das
        frontArticle.className = `badge fs-6 mb-2 article-${data.details.article.toLowerCase()}`;
        frontArticle.style.display = 'inline-block';
    } else {
        frontArticle.style.display = 'none'; // Giấu phần mạo từ nếu là Động/Tính từ
    }
    
    frontWord.textContent = data.word;
    frontType.textContent = data.type;

    // --- CẬP NHẬT MẶT SAU ---
    document.getElementById('fc-back-word').textContent = data.word;
    document.getElementById('fc-back-pronunciation').textContent = data.pronunciation || '';
    document.getElementById('fc-back-meaning').textContent = data.meaning_en;
    document.getElementById('fc-back-example-de').textContent = data.example_de;
    document.getElementById('fc-back-example-en').textContent = data.example_en;

    // Xử lý vùng chi tiết ngữ pháp thu nhỏ (details)
    const detailsEl = document.getElementById('fc-back-details');
    if (data.type === 'noun') {
        detailsEl.innerHTML = `Plural: <strong class="text-white">${data.details.plural || 'keine'}</strong>`;
    } else if (data.type === 'verb') {
        detailsEl.innerHTML = `
            <div class="row g-1">
                <div class="col-6">Infinitive: <span class="text-white fw-semibold">${data.details.infinitive || data.word}</span></div>
                <div class="col-6">Hilfs: <span class="text-white fw-semibold">${data.details.auxiliary_verb || 'N/A'}</span></div>
                <div class="col-6">Präteritum: <span class="text-white fw-semibold">${data.details.praeteritum || 'N/A'}</span></div>
                <div class="col-6">Perfekt: <span class="text-white fw-semibold">${data.details.perfekt || 'N/A'}</span></div>
            </div>`;
    } else {
        detailsEl.innerHTML = `<span class="fst-italic text-muted">Tính từ / Trạng từ (Adjektiv / Adverb)</span>`;
    }
}

// ==========================================
// 5. TÍNH NĂNG PHÁT ÂM (AUDIO)
// ==========================================
// function speakFlashcard(event) {
//     // CHẶN TUYỆT ĐỐI không cho sự kiện click lan ra ngoài làm lật card khi bấm nút loa
//     event.stopPropagation(); 
    
//     if (!currentFlashcardData) return;

//     if ('speechSynthesis' in window) {
//         window.speechSynthesis.cancel(); // Ngắt các giọng đang đọc dở (nếu có)
        
//         // Nếu là danh từ thì đọc kèm mạo từ cho chuẩn ngữ điệu Đức (Vd: "der Hund")
//         const textToSpeak = (currentFlashcardData.type === 'noun' && currentFlashcardData.details.article) 
//             ? `${currentFlashcardData.details.article} ${currentFlashcardData.word}` 
//             : currentFlashcardData.word;

//         const utterance = new SpeechSynthesisUtterance(textToSpeak);
//         utterance.lang = 'de-DE'; // Thiết lập chuẩn giọng Đức
//         utterance.rate = 0.85;    // Tốc độ đọc chậm một chút cho dễ nghe âm đuôi
        
//         window.speechSynthesis.speak(utterance);
//     } else {
//         alert("Trình duyệt này không hỗ trợ phát âm tự động rồi ông ơi!");
//     }
// }

function speakFlashcard(event) {
    event.stopPropagation(); 
    if (!currentFlashcardData) return;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        
        const textToSpeak = (currentFlashcardData.type === 'noun' && currentFlashcardData.details.article) 
            ? `${currentFlashcardData.details.article} ${currentFlashcardData.word}` 
            : currentFlashcardData.word;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // 1. Lấy danh sách giọng đọc của máy
        const voices = window.speechSynthesis.getVoices();
        
        // 2. Ưu tiên tìm giọng có chứa "Google" hoặc "Microsoft" và có lang là "de-DE"
        // Thường giọng Google (trên Chrome) phát âm chuẩn nhất
        const germanVoice = voices.find(voice => voice.lang === 'de-DE') || 
                            voices.find(voice => voice.lang.includes('de'));

        if (germanVoice) {
            utterance.voice = germanVoice;
        }

        utterance.lang = 'de-DE';
        utterance.rate = 0.85;
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Trình duyệt này không hỗ trợ phát âm!");
    }
}



// Cấu hình thông tin GitHub của ông (Thay bằng thông tin thật nhé)


/**
 * Hàm chính: Nhận dữ liệu từ Gemini, gộp vào bộ nhớ tạm và đẩy lên GitHub
 * @param {Object} newWordData - Object chứa thông tin 1 từ mới do Gemini trả về
 */
async function saveGeminiWordToGitHub(newWordData) {
    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
    if (!newWordData || !newWordData.word) {
        alert("Dữ liệu từ Gemini trả về bị thiếu trường 'word' rồi ông ơi!");
        return;
    }

    if (!GITHUB_TOKEN) {
        alert("Không tìm thấy GitHub Token trong LocalStorage. Hãy đăng nhập lại!");
        return;
    }

    // 2. Chuẩn hóa key (viết thường, xóa khoảng trắng) và gộp vào kho dữ liệu chạy tạm ở máy
    const wordKey = newWordData.word.toLowerCase().trim();
    
    globalDict.push(newWordData); 
    

    console.log("Địa chỉ vùng nhớ của globalDict:", globalDict);
// Kiểm tra xem trong object này có chứa cái wordKey ông vừa thêm không?
    console.log("Kiểm tra sự tồn tại của từ mới:", globalDict.hasOwnProperty(wordKey));

    // 3. Tiến hành luồng gọi API GitHub để ghi đè file dict.json
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

    try {
        // --- BƯỚC A: LẤY MÃ SHA CỦA FILE DICT.JSON HIỆN TẠI ---
        const getResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let currentSha = "";
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            currentSha = fileData.sha; // Lấy mã phiên bản hiện tại
        } else if (getResponse.status !== 404) {
            throw new Error("Không thể kiểm tra file trên GitHub");
        }

        // --- BƯỚC B: MÃ HÓA TOÀN BỘ KHO TỪ ĐIỂN MỚI SANG BASE64 ---
        // Chuyển Object globalDict sau khi đã có từ mới thành chuỗi JSON viết thụt lề cho đẹp
        const jsonString = JSON.stringify(globalDict, null, 2);

        // Mã hóa an toàn UTF-8 để không lỗi font tiếng Đức (ä, ö, ü, ß)
        const base64Content = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode('0x' + p1);
        }));

        // Chuẩn bị nội dung Body gửi đi
        const putBody = {
            message: `cms: add new word "${newWordData.word}" via Gemini`,
            content: base64Content,
            branch: "main" // Ghi thẳng vào nhánh chính
        };

        // Nếu file đã có trên repo (luôn đúng), phải đính kèm SHA để xác thực quyền ghi đè
        if (currentSha) {
            putBody.sha = currentSha;
        }

        // --- BƯỚC C: GỬI REQUEST PUT LÊN GITHUB ---
        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(putBody)
        });

        if (putResponse.ok) {
            //console.log(`Đã đồng bộ thành công từ "${newWordData.word}" lên GitHub!`);
            // alert(`Đã thêm thành công từ "${newWordData.word}" vào từ điển rực rỡ nhé!`);
            
            // (Tùy chọn) Nếu đang mở tab Flashcard, nạp luôn từ mới này ra màn hình để học luôn
            // currentFlashcardData = newWordData;
            // renderFlashcardContent(currentFlashcardData);
        } else {
            const errorData = await putResponse.json();
            console.error("GitHub API Error:", errorData);
            alert("GitHub từ chối cập nhật: " + errorData.message);
        }

    } catch (error) {
        console.error("Lỗi hệ thống:", error);
        alert("Có lỗi xảy ra trong quá trình đồng bộ dữ liệu lên GitHub!");
    }
}