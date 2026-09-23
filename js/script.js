/**
 * Google Rewards - Script Unificado (Quiz + VSL)
 * 
 * Este script gerencia a interatividade da aplicação de pesquisas remuneradas,
 * incluindo navegação entre páginas, sistema de perguntas, animações de saldo,
 * popups de recompensa, efeito de confete e transição para VSL.
 */

// ==================== CONFIGURAÇÃO INICIAL ====================

const surveyData = {
    initialBalance: 17,
    currentBalance: 17,
    currentQuestionIndex: 0,
    questions: [
        {
            text: "Which mobile network do you use in Kenya?",
            options: [
                { text: "Safaricom", emoji: "📶" },
                { text: "Airtel Kenya", emoji: "📱" },
                { text: "Telkom Kenya", emoji: "☎️" }
            ],
            reward: 25
        },
        {
            text: "Which mobile money service do you use most?",
            options: [
                { text: "M-Pesa", emoji: "💸" },
                { text: "Airtel Money", emoji: "💰" },
                { text: "T-Kash", emoji: "💳" }
            ],
            reward: 37
        },
        {
            text: "Which Google service do you use most frequently?",
            options: [
                { text: "Gmail", emoji: "📧" },
                { text: "YouTube", emoji: "📺" },
                { text: "Google Maps", emoji: "🗺️" }
            ],
            reward: 33
        },
        {
            text: "How often do you shop online in Kenya?",
            options: [
                { text: "Frequently (Jumia, Kilimall)", emoji: "🛒" },
                { text: "Occasionally", emoji: "🛍️" },
                { text: "Rarely or never", emoji: "❌" }
            ],
            reward: 48
        },
        {
            text: "What is your main concern about online payments?",
            options: [
                { text: "M-Pesa fraud / scams", emoji: "🔐" },
                { text: "Personal data security", emoji: "👁️" },
                { text: "Transaction fees", emoji: "💳" }
            ],
            reward: 53
        }
    ]
};

// ==================== SELETORES DOM ====================

const quizSection = document.getElementById('quizSection');
const vslSection = document.getElementById('vslSection');

const welcomePage = document.getElementById('welcomePage');
const surveyPage = document.getElementById('surveyPage');
const completionPage = document.getElementById('completionPage');

const balanceElement = document.getElementById('balance');
const balanceIndicator = document.getElementById('balanceIndicator');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const questionValue = document.getElementById('questionValue');
const finalBalance = document.getElementById('finalBalance');

const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');

const rewardPopup = document.getElementById('rewardPopup');
const rewardAmount = document.getElementById('rewardAmount');
const overlay = document.getElementById('overlay');

const startButton = document.getElementById('startButton');
const withdrawButton = document.getElementById('withdrawButton');

const withdrawalFormPage = document.getElementById('withdrawalFormPage');
const withdrawalPage = document.getElementById('withdrawalPage');
const withdrawalForm = document.getElementById('withdrawalForm');
const withdrawalFormBalance = document.getElementById('withdrawalFormBalance');
const withdrawalProgressBar = document.getElementById('withdrawalProgressBar');
const withdrawalProgressText = document.getElementById('withdrawalProgressText');
const withdrawalPending = document.getElementById('withdrawalPending');
const formError = document.getElementById('formError');

const currentYearElement = document.getElementById('currentYear');

let withdrawalData = { name: '', phone: '', provider: '', account: '' };

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    currentYearElement.textContent = new Date().getFullYear();
    startButton.addEventListener('click', startSurvey);
    withdrawButton.addEventListener('click', showWithdrawalForm);

    withdrawalForm.addEventListener('submit', handleWithdrawalSubmit);

    // Only allow numbers in phone/account fields
    ['wdPhone', 'wdAccount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function () {
                this.value = this.value.replace(/\D/g, '');
            });
        }
    });
});

// ==================== SIMULAÇÃO DE SAQUE ====================

function showWithdrawalForm() {
    fadeOut(completionPage, () => {
        withdrawalFormBalance.textContent = surveyData.currentBalance;
        fadeIn(withdrawalFormPage);
    });
}

function handleWithdrawalSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('wdFullName').value.trim();
    let phone = document.getElementById('wdPhone').value.trim();
    const provider = document.getElementById('wdProvider').value;
    let account = document.getElementById('wdAccount').value.trim();

    // Reset error states
    formError.classList.add('hidden');
    document.getElementById('wdPhone').classList.remove('input-error');
    document.getElementById('wdAccount').classList.remove('input-error');

    // Normalize: keep only digits, strip leading 254 or 0 → always end with 9 digits
    const normalize = (v) => {
        let n = v.replace(/\D/g, '');
        if (n.startsWith('254')) n = n.slice(3);
        else if (n.startsWith('0')) n = n.slice(1);
        return n;
    };
    phone = normalize(phone);
    account = normalize(account);

    // Validate phone match
    if (phone !== account) {
        formError.textContent = 'M-Pesa numbers do not match. Please try again.';
        formError.classList.remove('hidden');
        document.getElementById('wdPhone').classList.add('input-error');
        document.getElementById('wdAccount').classList.add('input-error');
        return;
    }

    // Validate length (must be exactly 9 digits after normalization)
    if (phone.length !== 9) {
        formError.textContent = 'Enter a valid M-Pesa number.';
        formError.classList.remove('hidden');
        document.getElementById('wdPhone').classList.add('input-error');
        return;
    }

    withdrawalData = { name, phone, provider, account };
    showWithdrawalProcessing();
}

function showWithdrawalProcessing() {
    const maskedPhone = '+254 ' + withdrawalData.phone.slice(0, 3) + '****' + withdrawalData.phone.slice(-2);
    const firstName = withdrawalData.name.split(' ')[0];

    // Fill receipt
    document.getElementById('receiptName').textContent = withdrawalData.name;
    document.getElementById('receiptBank').textContent = withdrawalData.provider;
    document.getElementById('receiptAccount').textContent = maskedPhone;
    document.getElementById('receiptAmount').textContent = surveyData.currentBalance + ' USD';

    // Personalize steps
    document.getElementById('wStep1Name').textContent = 'Verifying ' + firstName + "'s M-Pesa";
    document.getElementById('wStep2Name').textContent = 'Validating number ' + maskedPhone;
    document.getElementById('wStep3Name').textContent = 'Converting ' + surveyData.currentBalance + ' USD to KES';
    document.getElementById('wStep4Name').textContent = 'Sending to M-Pesa';

    fadeOut(withdrawalFormPage, () => {
        fadeIn(withdrawalPage);
        runWithdrawalSimulation();
    });
}

function runWithdrawalSimulation() {
    const steps = [
        { id: 'wStep1', duration: 2200, statusActive: 'Verifying...', statusDone: 'M-Pesa verified' },
        { id: 'wStep2', duration: 1800, statusActive: 'Validating...', statusDone: 'Number valid' },
        { id: 'wStep3', duration: 2800, statusActive: 'Converting...', statusDone: 'Converted to KES' },
        { id: 'wStep4', duration: 2500, statusActive: 'Sending...', statusDone: 'Transfer pending' }
    ];

    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    function processStep(index) {
        if (index >= steps.length) {
            withdrawalProgressBar.style.width = '100%';
            withdrawalProgressText.textContent = '100%';

            // Show pending message with button
            setTimeout(() => {
                withdrawalPending.classList.remove('hidden');
                document.getElementById('watchVideoBtn').addEventListener('click', showVSL);
            }, 400);
            return;
        }

        const step = steps[index];
        const stepEl = document.getElementById(step.id);
        const statusEl = stepEl.querySelector('.withdrawal-step-status');

        stepEl.classList.add('active');
        statusEl.textContent = step.statusActive;

        const startElapsed = elapsed;
        const stepStart = Date.now();
        const progressInterval = setInterval(() => {
            const stepElapsed = Date.now() - stepStart;
            const currentTotal = startElapsed + Math.min(stepElapsed, step.duration);
            const pct = Math.round((currentTotal / totalDuration) * 100);
            withdrawalProgressBar.style.width = pct + '%';
            withdrawalProgressText.textContent = pct + '%';

            if (stepElapsed >= step.duration) {
                clearInterval(progressInterval);
            }
        }, 50);

        setTimeout(() => {
            elapsed += step.duration;
            stepEl.classList.remove('active');
            stepEl.classList.add('completed');
            statusEl.textContent = step.statusDone;
            processStep(index + 1);
        }, step.duration);
    }

    processStep(0);
}

function showVSL() {
    fadeOut(quizSection, () => {
        fadeIn(vslSection);
        updateBalanceDisplay(surveyData.currentBalance, false);
        loadVSLPlayer();
        loadFakeComments();
    });
}

// ==================== FACEBOOK COMMENTS SIMULATION ====================

const LIKE_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#1877F2"><path d="M2 21h2V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 7.59 6.59C7.22 6.95 7 7.45 7 8v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>';

const initialComments = [
    { name: 'Wanjiru Kamau', text: 'Ujumbe wa M-Pesa umeingia sasa hivi!! Asante sana, hii ni ya kweli 🙏', time: 'dakika 2 zilizopita', likes: 24, img: 'imagens/615476926_2129489404548030_2126219030693978855_n.jpg' },
    { name: 'Brian Otieno', text: 'I was skeptical at first but after watching the video I got my money within 24 hours. Mungu ni mwema!', time: '5 min ago', likes: 18, img: 'imagens/51596745_10217669144296586_7676079097461604352_n.jpg' },
    { name: 'Aisha Hassan', text: 'Dada yangu aliniambia kuhusu hili nami sikumwamini. Sasa nami ninawaambia kila mtu 😂💰', time: 'dakika 8 zilizopita', likes: 31, img: 'imagens/411501019_3328888610743598_255394871081213996_n.jpg' },
    { name: 'Kevin Mwangi', text: 'M-Pesa confirmation just entered!! 🔔🔔 This is legit, make sure you watch the full video', time: '12 min ago', likes: 42, img: 'imagens/142736346_3760558347355148_77726020631224977_n.jpg' },
    { name: 'Faith Njeri', text: 'Nilipokea zangu kupitia Safaricom M-Pesa. Tazama video kwa makini, wanaeleza kila kitu', time: 'dakika 15 zilizopita', likes: 15, img: 'imagens/600982890_122108253849137815_7018535041402184155_n.jpg' },
    { name: 'Daniel Kiprono', text: 'Second time doing this survey and second time receiving payment. No scam at all ✅', time: '18 min ago', likes: 27, img: 'imagens/578277050_4316014812052971_516386648091913289_n.jpg' },
    { name: 'Mercy Atieno', text: 'My husband didn\'t believe me until he saw the M-Pesa message on my phone 😂', time: '22 min ago', likes: 36, img: 'imagens/494907600_1047935570533596_5029612415979938840_n.jpg' },
    { name: 'James Kariuki', text: 'The video is very important, don\'t skip it if you want to receive your money fast', time: '25 min ago', likes: 19, img: 'imagens/421824917_1097267101421800_8359154587489251973_n.jpg' },
    { name: 'Grace Wambui', text: 'Nimepokea pesa kupitia M-Pesa sasa hivi! Hii ni ya kushangaza 🎉', time: 'dakika 30 zilizopita', likes: 22, img: 'imagens/464791006_8416946245027554_8107442405029223201_n.jpg' },
    { name: 'Peter Omondi', text: 'I have shared this to all my WhatsApp groups. Everyone deserves to know about this!', time: '35 min ago', likes: 14, img: 'imagens/633993549_122096280315276322_2877511502228987702_n.jpg' },
    { name: 'Linet Chebet', text: 'Nimepokea kupitia M-Pesa. Asante sana Google 🙌', time: 'dakika 40 zilizopita', likes: 33, img: 'imagens/595805277_1544190056906827_3147097758608145524_n.jpg' },
    { name: 'Joseph Mutua', text: 'I was afraid it was a scam but my friend showed me his M-Pesa SMS. Now niko sawa 😅', time: '45 min ago', likes: 28, img: 'imagens/419734167_7456856780992290_1838991367503062927_n.jpg' },
    { name: 'Sharon Achieng', text: 'Watched the video and followed the steps. Money came the next day!', time: '50 min ago', likes: 16, img: 'imagens/633144553_122098465575268562_7909383926405108006_n.jpg' },
    { name: 'Samuel Kibet', text: 'Safaricom M-Pesa credited within hours. Make sure to watch everything', time: '1 hr ago', likes: 20, img: 'imagens/378224010_122096717330047007_8181527711769572442_n.jpg' },
    { name: 'Esther Wanjala', text: 'Hili ni jambo bora zaidi nililopata mtandaoni mwaka huu 🥳', time: 'saa 1 iliyopita', likes: 39, img: 'imagens/136777078_100615718676910_8451200588862452641_n.jpg' },
];

const autoComments = [
    { name: 'Caroline Nyambura', text: 'Just watched the video now and followed the steps. Waiting for my M-Pesa 🤞', img: 'imagens/275239213_2510801525718851_5388535387086701560_n.jpg' },
    { name: 'Dennis Ouma', text: 'Can confirm this is real! My M-Pesa just got credited 💚', img: 'imagens/506884327_10222915475674346_2978716664044278701_n.jpg' },
    { name: 'Amina Yusuf', text: 'Ni nani mwingine anatazama video hii sasa hivi? 😂 Twende!!', img: 'imagens/177855252_10222750968336285_942216712075499517_n.jpg' },
    { name: 'David Maina', text: 'My third time doing this. Always pays! 🔥', img: 'imagens/651202041_2187323512007533_1314825255999908564_n.jpg' },
    { name: 'Ian Chukwuma', text: 'Ujumbe wa M-Pesa umeingia sasa hivi! Mungu abariki Google 🙏🙏', img: 'imagens/649370546_26170631835923816_5927138448362823552_n.jpg' },
    { name: 'Zipporah Muthoni', text: 'Niliwaambia wenzangu kazini nao wote wakajisajili pia 😄', img: 'imagens/615476926_2129489404548030_2126219030693978855_n.jpg' },
    { name: 'Stephen Kipchirchir', text: 'Airtel Money credited me in less than 2 hours after watching the video!', img: 'imagens/578277050_4316014812052971_516386648091913289_n.jpg' },
    { name: 'Gloria Akinyi', text: 'This is wonderful!! Sharing with my church group right now 🙌', img: 'imagens/464791006_8416946245027554_8107442405029223201_n.jpg' },
    { name: 'Moses Lagat', text: 'M-Pesa alert just came in. No stories, this one is genuine ✅', img: 'imagens/421824917_1097267101421800_8359154587489251973_n.jpg' },
    { name: 'Tabitha Wairimu', text: 'Nilikuwa na mashaka bana, lakini ona pesa kwa M-Pesa sasa 😂💰', img: 'imagens/411501019_3328888610743598_255394871081213996_n.jpg' },
];

let fbCommentCount = 0;
let autoCommentIndex = 0;
let autoCommentInterval = null;

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('');
}

function createCommentElement(comment, isNew) {
    const el = document.createElement('div');
    el.className = 'fb-comment' + (isNew ? ' fb-comment-new' : '');

    const likesCount = comment.likes || 0;
    const avatarContent = comment.img
        ? `<img src="${comment.img}" alt="${comment.name}">`
        : getInitials(comment.name);
    const avatarStyle = comment.img ? '' : 'style="background:#9CA3AF"';

    el.innerHTML = `
        <div class="fb-comment-avatar" ${avatarStyle}>${avatarContent}</div>
        <div class="fb-comment-body">
            <div class="fb-comment-bubble">
                <div class="fb-comment-name">${comment.name}</div>
                <div class="fb-comment-text">${comment.text}</div>
            </div>
            <div class="fb-comment-actions">
                <span class="fb-comment-action fb-action-like" data-liked="false" data-likes="${likesCount}">Like</span>
                <span class="fb-comment-action fb-action-reply">Reply</span>
                <span class="fb-comment-time">${comment.time || 'Just now'}</span>
                <span class="fb-comment-likes">${likesCount > 0 ? LIKE_SVG + ' ' + likesCount : ''}</span>
            </div>
            <div class="fb-comment-replies"></div>
        </div>
    `;

    // Like toggle
    const likeBtn = el.querySelector('.fb-action-like');
    const likesSpan = el.querySelector('.fb-comment-likes');
    likeBtn.addEventListener('click', function () {
        const isLiked = this.getAttribute('data-liked') === 'true';
        let count = parseInt(this.getAttribute('data-likes'));
        if (isLiked) {
            count--;
            this.setAttribute('data-liked', 'false');
            this.classList.remove('liked');
        } else {
            count++;
            this.setAttribute('data-liked', 'true');
            this.classList.add('liked');
        }
        this.setAttribute('data-likes', count);
        likesSpan.innerHTML = count > 0 ? LIKE_SVG + ' ' + count : '';
    });

    // Reply toggle
    const replyBtn = el.querySelector('.fb-action-reply');
    const repliesContainer = el.querySelector('.fb-comment-replies');
    replyBtn.addEventListener('click', function () {
        if (repliesContainer.querySelector('.fb-reply-input-area')) return;
        const replyArea = document.createElement('div');
        replyArea.className = 'fb-reply-input-area';
        replyArea.innerHTML = `
            <input type="text" class="fb-reply-input" placeholder="Write a reply...">
            <button class="fb-reply-send" type="button">Send</button>
        `;
        repliesContainer.appendChild(replyArea);
        const input = replyArea.querySelector('.fb-reply-input');
        input.focus();

        function submitReply() {
            const text = input.value.trim();
            if (!text) return;
            replyArea.remove();
            const replyEl = document.createElement('div');
            replyEl.className = 'fb-comment fb-comment-new';
            replyEl.innerHTML = `
                <div class="fb-comment-avatar" style="background:#9CA3AF">You</div>
                <div class="fb-comment-body">
                    <div class="fb-comment-bubble">
                        <div class="fb-comment-name">You</div>
                        <div class="fb-comment-text">${text}</div>
                    </div>
                    <div class="fb-comment-actions">
                        <span class="fb-comment-action">Like</span>
                        <span class="fb-comment-time">Just now</span>
                    </div>
                </div>
            `;
            repliesContainer.appendChild(replyEl);
        }

        replyArea.querySelector('.fb-reply-send').addEventListener('click', submitReply);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitReply();
        });
    });

    return el;
}

function updateCommentCounter() {
    document.getElementById('fbCommentsCount').textContent = fbCommentCount + ' comments';
}

function addAutoComment() {
    if (autoCommentIndex >= autoComments.length) autoCommentIndex = 0;
    const comment = autoComments[autoCommentIndex];
    autoCommentIndex++;

    const list = document.getElementById('fbCommentsList');
    const el = createCommentElement({ ...comment, time: 'Just now', likes: Math.floor(Math.random() * 5) }, true);
    list.insertBefore(el, list.firstChild);
    fbCommentCount++;
    updateCommentCounter();

    list.scrollTop = 0;
}

function loadFakeComments() {
    const list = document.getElementById('fbCommentsList');
    list.innerHTML = '';
    fbCommentCount = 0;

    initialComments.forEach((comment, index) => {
        setTimeout(() => {
            const el = createCommentElement(comment, false);
            list.appendChild(el);
            fbCommentCount++;
            updateCommentCounter();
        }, index * 800);
    });

    // User comment input
    const input = document.getElementById('fbCommentInput');
    const sendBtn = document.getElementById('fbCommentSend');

    function postUserComment() {
        const text = input.value.trim();
        if (!text) return;
        const el = createCommentElement({ name: 'You', text: text, time: 'Just now', likes: 0, color: '#9CA3AF' }, true);
        list.insertBefore(el, list.firstChild);
        fbCommentCount++;
        updateCommentCounter();
        input.value = '';
        list.scrollTop = 0;
    }

    sendBtn.addEventListener('click', postUserComment);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') postUserComment();
    });

    // Auto-comment every 2 minutes
    if (autoCommentInterval) clearInterval(autoCommentInterval);
    autoCommentInterval = setInterval(addAutoComment, 120000);
}

function initializeData() {
    surveyData.currentBalance = surveyData.initialBalance;
    updateBalanceDisplay(surveyData.currentBalance, false);
}

// ==================== NAVEGAÇÃO ENTRE PÁGINAS ====================

function startSurvey() {
    surveyData.currentQuestionIndex = 0;
    fadeOut(welcomePage, () => {
        fadeIn(surveyPage);
        showCurrentQuestion();
    });
}

function showCompletionPage() {
    fadeOut(surveyPage, () => {
        finalBalance.textContent = surveyData.currentBalance;
        fadeIn(completionPage);
    });
}

/**
 * Carrega o player VSL apenas quando necessário
 */
function loadVSLPlayer() {
    if (window.vslPlayerLoaded) {
        console.log('Player VSL já foi carregado anteriormente');
        return;
    }
    const playerContainer = document.getElementById('vslPlayerContainer');
    if (!playerContainer) {
        console.error('Container do player não encontrado!');
        return;
    }
    playerContainer.innerHTML = '';

    
// ── PLAYER ATUALIZADO ──
playerContainer.innerHTML = '<vturb-smartplayer id="vid-6ab39b1fc5b42ac79006abb3" style="display: block; margin: 0 auto; width: 100%; max-width: 400px;"><div class="vturb-player-placeholder" style="position: relative; width: 100%; padding: 133.33333333333331% 0 0; z-index: 0; background-color: black;"></div></vturb-smartplayer>';
var s = document.createElement("script");
s.type = "text/javascript";
s.src = "https://scripts.converteai.net/41807d23-9a38-4f49-a717-2c8210bf4152/players/6ab39b1fc5b42ac79006abb3/v4/player.js";
s.async = true;

    s.onload = function () {
        window.vslPlayerLoaded = true;
        console.log('Script do player VSL carregado com sucesso');
    };
    s.onerror = function () {
        console.error('Erro ao carregar o script do player VSL');
    };

    document.head.appendChild(s);
}

const allPages = [
    document.getElementById('welcomePage'),
    document.getElementById('surveyPage'),
    document.getElementById('completionPage'),
    document.getElementById('withdrawalFormPage'),
    document.getElementById('withdrawalPage')
];

function hideAllPages() {
    allPages.forEach(page => {
        if (page) page.classList.add('hidden');
    });
}

function fadeOut(element, callback) {
    element.classList.add('hidden');
    if (callback) callback();
}

function fadeIn(element) {
    hideAllPages();
    element.classList.remove('hidden');
    element.classList.add('fade-in');
    setTimeout(() => {
        element.classList.remove('fade-in');
    }, 500);
}

// ==================== SISTEMA DE PERGUNTAS ====================

function showCurrentQuestion() {
    const currentQuestion = surveyData.questions[surveyData.currentQuestionIndex];

    questionText.textContent = currentQuestion.text;
    questionValue.textContent = `Vale: ${currentQuestion.reward} USD`;

    const progress = ((surveyData.currentQuestionIndex + 1) / surveyData.questions.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Pergunta ${surveyData.currentQuestionIndex + 1} de ${surveyData.questions.length}`;

    optionsContainer.innerHTML = '';

    currentQuestion.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'survey-option';
        optionElement.innerHTML = `
            <span class="survey-option-emoji">${option.emoji}</span>
            <span class="survey-option-text">${option.text}</span>
        `;
        optionElement.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionElement);
    });
}

function selectOption(optionIndex) {
    const currentQuestion = surveyData.questions[surveyData.currentQuestionIndex];
    const reward = currentQuestion.reward;

    addToBalance(reward);
    showRewardPopup(reward);

    setTimeout(() => {
        hideRewardPopup();
        surveyData.currentQuestionIndex++;

        if (surveyData.currentQuestionIndex < surveyData.questions.length) {
            showCurrentQuestion();
        } else {
            showCompletionPage();
        }
    }, 2000);
}

// ==================== GERENCIAMENTO DE SALDO ====================

function addToBalance(amount) {
    surveyData.currentBalance += amount;
    updateBalanceDisplay(surveyData.currentBalance, true);
}

function updateBalanceDisplay(newAmount, animate = false) {
    if (animate) {
        const startValue = parseInt(balanceElement.textContent);
        const endValue = newAmount;
        const duration = 1000;
        const frameRate = 30;
        const increment = Math.ceil((endValue - startValue) / (duration / (1000 / frameRate)));

        let currentValue = startValue;
        const counter = setInterval(() => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= endValue) ||
                (increment < 0 && currentValue <= endValue)) {
                clearInterval(counter);
                currentValue = endValue;
            }
            balanceElement.textContent = currentValue;
        }, 1000 / frameRate);

        balanceIndicator.classList.add('active');
        setTimeout(() => {
            balanceIndicator.classList.remove('active');
        }, 2000);
    } else {
        balanceElement.textContent = newAmount;
    }
}

// ==================== POPUP DE RECOMPENSA ====================

function showRewardPopup(amount) {
    rewardAmount.textContent = `+${amount} USD`;
    overlay.classList.add('active');
    rewardPopup.classList.add('active');
    createConfetti();
    playCashRegisterSound();
}

function hideRewardPopup() {
    overlay.classList.remove('active');
    rewardPopup.classList.remove('active');
}

// ==================== SOM DE CAIXA REGISTRADORA ====================

const cashRegisterSound = new Audio('assets/modestas123123-cash-register-kaching-sound-effect-125042.mp3');

function playCashRegisterSound() {
    try {
        cashRegisterSound.currentTime = 0;
        cashRegisterSound.play();
    } catch (e) {
        // Silently fail if audio not supported
    }
}

// ==================== EFEITO DE CONFETE ====================

function createConfetti() {
    const confettiContainer = document.getElementById('confettiCanvas');
    confettiContainer.innerHTML = '';

    const colors = ['#38B764', '#4BDE7C', '#4D7CFE', '#6D93FF', '#FBBC04'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 4 + 2}px`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `-10px`;
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.opacity = Math.random() + 0.5;
        confetti.style.borderRadius = '2px';

        confettiContainer.appendChild(confetti);

        const duration = Math.random() * 2000 + 1000;
        const delay = Math.random() * 500;

        confetti.animate([
            { transform: `translate(0, 0) rotate(${Math.random() * 360}deg)`, opacity: 1 },
            { transform: `translate(${Math.random() * 100 - 50}px, ${Math.random() * 200 + 200}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: duration,
            delay: delay,
            fill: 'forwards',
            easing: 'cubic-bezier(0.21, 0.98, 0.6, 0.99)'
        });
    }
}
