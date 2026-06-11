import { supabase } from "./supabase.js";

// ── Форм элементүүд ──────────────────────────────────────────
const transactionForm = document.getElementById('transaction-form');
const txTypeInput     = document.getElementById('tx-type');
const txCategoryInput = document.getElementById('tx-category');
const txAmountInput   = document.getElementById('tx-amount');
const txDateInput     = document.getElementById('tx-date');
const txDescInput     = document.getElementById('tx-desc');

// ═══════════════════════════════════════════════════════════════
// BADGE ТОХИРГОО
// ═══════════════════════════════════════════════════════════════

// Үндсэн badge-ууд (5 ширхэг)
const MAIN_BADGES = [
    {
        name:      'Анхны бүртгэл',
        icon:      'fa-solid fa-seedling',
        color:     '#22c55e',
        bgColor:   '#f0fdf4',
        border:    '#86efac',
        desc:      'Эхний гүйлгээгээ бүртгэх',
        emoji:     '🌱',
    },
    {
        name:      'Идэвхтэй хэрэглэгч',
        icon:      'fa-solid fa-fire-flame-curved',
        color:     '#f97316',
        bgColor:   '#fff7ed',
        border:    '#fdba74',
        desc:      '3 өөр өдөр гүйлгээ бүртгэх',
        emoji:     '🔥',
    },
    {
        name:      'Тогтмол бүртгэгч',
        icon:      'fa-solid fa-calendar-check',
        color:     '#3b82f6',
        bgColor:   '#eff6ff',
        border:    '#93c5fd',
        desc:      '7 өөр өдөр гүйлгээ бүртгэх',
        emoji:     '📅',
    },
    {
        name:      'Нягт бүртгэгч',
        icon:      'fa-solid fa-database',
        color:     '#8b5cf6',
        bgColor:   '#f5f3ff',
        border:    '#c4b5fd',
        desc:      '30 өөр өдөр гүйлгээ бүртгэх',
        emoji:     '🗄️',
    },
    {
        name:      'Шилдэг хэрэглэгч',
        icon:      'fa-solid fa-crown',
        color:     '#f59e0b',
        bgColor:   '#fffbeb',
        border:    '#fcd34d',
        desc:      '30 өдөр дараалан гүйлгээ бүртгэх',
        emoji:     '👑',
    },
];

// Сарын тусгай badge-ууд (тусдаа харуулна)
const MONTHLY_BADGES = [
    {
        name:    'Ашигтай сар',
        icon:    'fa-solid fa-arrow-trend-up',
        color:   '#10b981',
        bgColor: 'linear-gradient(135deg, #064e3b, #065f46)',
        border:  '#34d399',
        desc:    'Орлого нь зарлагаасаа илүү сар',
        emoji:   '📈',
    },
    {
        name:    'Алдагдалтай сар',
        icon:    'fa-solid fa-arrow-trend-down',
        color:   '#f43f5e',
        bgColor: 'linear-gradient(135deg, #4c0519, #881337)',
        border:  '#fb7185',
        desc:    'Зарлага нь орлогоосоо давсан сар',
        emoji:   '📉',
    },
];

// ── Гүйлгээ нэмэх ────────────────────────────────────────────
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type        = txTypeInput.value;
    const category    = txCategoryInput.value;
    const amount      = parseFloat(txAmountInput.value);
    const date        = txDateInput.value;
    const description = txDescInput.value;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        alert("Сешн дууссан байна. Дахин нэвтрэнэ үү!");
        window.location.href = 'index.html';
        return;
    }

    // Зарлага бол төсөв шалгана
    if (type === 'expense') {
        const currentMonthYear = date.substring(0, 7);

        const { data: budgetData } = await supabase
            .from('budgets')
            .select('limit_amount')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('month_year', currentMonthYear)
            .maybeSingle();

        if (budgetData) {
            const limitAmount = budgetData.limit_amount;

            const { data: pastExpenses } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .eq('category', category)
                .gte('date', `${currentMonthYear}-01`)
                .lte('date', `${currentMonthYear}-31`);

            let totalPastExpense = 0;
            if (pastExpenses) {
                pastExpenses.forEach(tx => { totalPastExpense += tx.amount; });
            }

            if (totalPastExpense + amount > limitAmount) {
                const currentTotal = totalPastExpense + amount;
                const proceed = confirm(
                    `АНХААРУУЛГА!\n\nТаны ${currentMonthYear} сарын "${category}" ангиллын төсвийн хязгаар: ${limitAmount.toLocaleString()} ₮\nОдоогийн нийт зарцуулалт: ${currentTotal.toLocaleString()} ₮ болох гэж байна.\n\nТөсөв хэтрүүлж гүйлгээг үргэлжлүүлэх үү?`
                );
                if (!proceed) return;
            }
        }
    }

    const { error } = await supabase
        .from('transactions')
        .insert([{
            user_id:     user.id,
            type:        type,
            category:    category,
            amount:      amount,
            date:        date,
            description: description
        }])
        .select();

    if (error) {
        alert("Гүйлгээг хадгалахад алдаа гарлаа: " + error.message);
    } else {
        alert("Гүйлгээ амжилттай нэмэгдлээ!");
        transactionForm.reset();
        fetchTransactions();
    }
});

// ── Гүйлгээ татах & дүн тооцоолох ───────────────────────────
async function fetchTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) {
        console.error("Гүйлгээ уншихад алдаа:", error.message);
        return;
    }

    let totalIncome  = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income')       totalIncome  += tx.amount;
        else if (tx.type === 'expense') totalExpense += tx.amount;
    });

    const totalBalance = totalIncome - totalExpense;

    document.getElementById('total-balance').textContent = `${totalBalance.toLocaleString()} ₮`;
    document.getElementById('total-income').textContent  = `${totalIncome.toLocaleString()} ₮`;
    document.getElementById('total-expense').textContent = `${totalExpense.toLocaleString()} ₮`;

    renderTransactions(transactions);
    checkAndAwardBadges(transactions);
}

// ── Гүйлгээ хүснэгтэд харуулах ───────────────────────────────
function renderTransactions(transactions) {
    const listContainer = document.getElementById('transaction-list');

    if (transactions.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>
                    Одоогоор ямар нэгэн гүйлгээ бүртгэгдээгүй байна.
                </td>
            </tr>
        `;
        return;
    }

    let htmlContent = '';
    transactions.forEach(tx => {
        const isIncome    = tx.type === 'income';
        const badgeColor  = isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
        const typeText    = isIncome ? 'Орлого' : 'Зарлага';
        const amountSign  = isIncome ? '+' : '-';
        const amountColor = isIncome ? 'text-success' : 'text-danger';

        htmlContent += `
            <tr>
                <td>${tx.date}</td>
                <td><span class="badge bg-light text-dark shadow-sm border">${tx.category}</span></td>
                <td class="text-secondary fw-medium">${tx.description}</td>
                <td><span class="badge ${badgeColor}">${typeText}</span></td>
                <td class="text-end fw-bold ${amountColor}">${amountSign}${tx.amount.toLocaleString()} ₮</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteTransaction('${tx.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    listContainer.innerHTML = htmlContent;
}

// ── Гүйлгээ устгах ────────────────────────────────────────────
window.deleteTransaction = async function(id) {
    if (!confirm("Та энэ гүйлгээг устгахдаа итгэлтэй байна уу?")) return;

    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        alert("Гүйлгээ амжилттай устгагдлаа.");
        fetchTransactions();
    } catch (error) {
        alert("Гүйлгээ устгахад алдаа гарлаа: " + error.message);
    }
}

// ── Гарах товч ───────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', async () => {
    if (!confirm("Та системээс гарахдаа итгэлтэй байна уу?")) return;

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        alert("Системээс гарахад алдаа гарлаа: " + error.message);
    }
});

// ── Хуудас ачаалах ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-email').textContent = user.email;

    await fetchTransactions();
    await fetchBudgets();
    await renderBadges();
});

// ═══════════════════════════════════════════════════════════════
// ТӨСӨВ ЛОГИК
// ═══════════════════════════════════════════════════════════════

const budgetForm          = document.getElementById('budget-form');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetAmountInput   = document.getElementById('budget-amount');
const budgetMonthInput    = document.getElementById('budget-month');

budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const category    = budgetCategoryInput.value;
    const limitAmount = parseFloat(budgetAmountInput.value);
    const monthYear   = budgetMonthInput.value;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Сешн дууссан байна!"); return; }

    const { error } = await supabase
        .from('budgets')
        .insert([{ user_id: user.id, category, limit_amount: limitAmount, month_year: monthYear }]);

    if (error) {
        alert("Төсөв тогтооход алдаа гарлаа: " + error.message);
    } else {
        alert(`${monthYear} сарын ${category} ангилалд төсөв амжилттай тогтоогдлоо!`);
        budgetForm.reset();

        const instance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasBudget'));
        if (instance) instance.hide();

        fetchBudgets();
        checkAndAwardBadges();
    }
});

async function fetchBudgets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('month_year', { ascending: false });

    if (error) { console.error("Төсөв уншихад алдаа:", error.message); return; }

    const container = document.getElementById('current-budgets-list');

    if (!budgets || budgets.length === 0) {
        container.innerHTML = `
            <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
            <div class="text-center py-3 text-muted small bg-light rounded">Одоогоор төсөв тогтоогоогүй байна.</div>
        `;
        return;
    }

    let html = `<h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>`;
    budgets.forEach(b => {
        html += `
            <div class="card p-2 mb-2 bg-light border-0 shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-bold small text-dark">${b.category}</span>
                        <span class="text-muted mx-1">•</span>
                        <span class="small text-secondary">${b.month_year}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold text-primary small">${b.limit_amount.toLocaleString()} ₮</span>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteBudget('${b.id}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.deleteBudget = async function(id) {
    if (!confirm("Энэ төсвийг устгахдаа итгэлтэй байна уу?")) return;

    try {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        if (error) throw error;
        alert("Төсөв амжилттай устгагдлаа.");
        fetchBudgets();
    } catch (error) {
        alert("Төсөв устгахад алдаа гарлаа: " + error.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// BADGE СИСТЕМ
// ═══════════════════════════════════════════════════════════════

// 30 өдөр дараалан streak тооцоолох туслах функц
function calcStreak(transactions) {
    if (!transactions || transactions.length === 0) return 0;

    // Бүх өдрүүдийг Set-д хийж давтагдахгүй болгоно
    const daySet = new Set(transactions.map(t => t.date));
    const days   = Array.from(daySet).sort().reverse(); // Хамгийн сүүлийн өдрөөс эхлэнэ

    if (days.length === 0) return 0;

    let streak  = 1;
    let maxStreak = 1;
    let current = new Date(days[0]);

    for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i]);
        const diff = (current - prev) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
            streak++;
            if (streak > maxStreak) maxStreak = streak;
        } else if (diff > 1) {
            streak = 1;
        }
        current = prev;
    }

    return maxStreak;
}

// Badge шалгаж олгох үндсэн функц
async function checkAndAwardBadges(txs) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Гүйлгээнүүд дамжуулаагүй бол шинэ татна
    if (!txs) {
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id);
        txs = data || [];
    }

    // Одоо авсан badge-уудыг татах
    const { data: existingBadges } = await supabase
        .from('badges')
        .select('badge_name')
        .eq('user_id', user.id);

    const earned = new Set((existingBadges || []).map(b => b.badge_name));

    const toAward = [];

    // ── Үндсэн badge шалгалтууд ──────────────────────────────

    // 1. Анхны бүртгэл
    if (!earned.has('Анхны бүртгэл') && txs.length >= 1) {
        toAward.push('Анхны бүртгэл');
    }

    // 2. Идэвхтэй хэрэглэгч — 3 өөр өдөр
    if (!earned.has('Идэвхтэй хэрэглэгч')) {
        const uniqueDays = new Set(txs.map(t => t.date)).size;
        if (uniqueDays >= 3) toAward.push('Идэвхтэй хэрэглэгч');
    }

    // 3. Тогтмол бүртгэгч — 7 өөр өдөр
    if (!earned.has('Тогтмол бүртгэгч')) {
        const uniqueDays = new Set(txs.map(t => t.date)).size;
        if (uniqueDays >= 7) toAward.push('Тогтмол бүртгэгч');
    }

    // 4. Нягт бүртгэгч — 30 өөр өдөр
    if (!earned.has('Нягт бүртгэгч')) {
        const uniqueDays = new Set(txs.map(t => t.date)).size;
        if (uniqueDays >= 30) toAward.push('Нягт бүртгэгч');
    }

    // 5. Шилдэг хэрэглэгч — 30 өдөр дараалан streak
    if (!earned.has('Шилдэг хэрэглэгч')) {
        const streak = calcStreak(txs);
        if (streak >= 30) toAward.push('Шилдэг хэрэглэгч');
    }

    // ── Сарын badge шалгалт (Ашигтай/Алдагдалтай) ───────────
    // Энэ сарын орлого vs зарлагыг харьцуулна
    const now          = new Date();
    const thisMonth    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const thisMonthTxs = txs.filter(t => t.date && t.date.substring(0, 7) === thisMonth);

    let monthIncome  = 0;
    let monthExpense = 0;
    thisMonthTxs.forEach(t => {
        if (t.type === 'income')       monthIncome  += t.amount;
        else if (t.type === 'expense') monthExpense += t.amount;
    });

    // Сарын дүгнэлт badge нь ХАДГАЛАХГҮЙ — зөвхөн UI-д харуулна
    // (сар бүр өөрчлөгдөх учраас DB-д хадгалах шаардлагагүй)
    renderMonthlyBadge(monthIncome, monthExpense, thisMonth);

    // Шинэ badge-уудыг Supabase-д хадгалах
    for (const badgeName of toAward) {
        await supabase.from('badges').insert([{
            user_id:    user.id,
            badge_name: badgeName,
            awarded_at: new Date().toISOString()
        }]);
        showBadgeNotification(badgeName);
    }

    await renderBadges();
}

// Сарын дүгнэлт badge харуулах (DB-д хадгалахгүй, зөвхөн UI)
function renderMonthlyBadge(income, expense, monthStr) {
    const container = document.getElementById('monthly-badge-display');
    if (!container) return;

    if (income === 0 && expense === 0) {
        container.innerHTML = `
            <div style="font-size:2.2rem; margin-bottom:8px;">📊</div>
            <div style="font-size:0.8rem; color:rgba(255,255,255,0.45);">${monthStr} — гүйлгээ байхгүй</div>
        `;
        return;
    }

    const isProfitable = income > expense;
    const badge        = isProfitable ? MONTHLY_BADGES[0] : MONTHLY_BADGES[1];
    const diff         = Math.abs(income - expense).toLocaleString();
    const diffLabel    = isProfitable ? `+${diff} ₮ хэмнэлт` : `-${diff} ₮ алдагдал`;

    container.innerHTML = `
        <div style="
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            background: ${badge.bgColor};
            border: 2px solid ${badge.border};
            border-radius: 16px;
            padding: 16px 24px;
            width: 100%;
        ">
            <i class="${badge.icon}" style="font-size: 2rem; color: ${badge.color};"></i>
            <div style="font-size: 1rem; font-weight: 700; color: white;">${badge.name}</div>
            <div style="font-size: 0.75rem; color: ${badge.color}; font-weight: 600;">${diffLabel}</div>
            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.45);">${monthStr}</div>
        </div>
    `;
}

// Badge авсан үед toast мэдэгдэл
function showBadgeNotification(badgeName) {
    const badge = MAIN_BADGES.find(b => b.name === badgeName);
    if (!badge) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        background: ${badge.bgColor};
        border: 2px solid ${badge.border};
        color: ${badge.color};
        padding: 14px 20px;
        border-radius: 14px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        font-weight: 600;
        font-size: 0.9rem;
        max-width: 280px;
        animation: fadeInUp 0.3s ease;
    `;
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <i class="${badge.icon}" style="font-size:1.6rem;"></i>
            <div>
                <div style="font-size:0.7rem; opacity:0.7; font-weight:400;">Шинэ тэмдэг авлаа! 🎉</div>
                <div>${badge.name}</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

// Badge UI харуулах (preview + offcanvas)
async function renderBadges() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: earnedBadges } = await supabase
        .from('badges')
        .select('badge_name')
        .eq('user_id', user.id);

    const earnedSet = new Set((earnedBadges || []).map(b => b.badge_name));

    // Navbar тоо
    const countEl = document.getElementById('badge-count-num');
    const totalEl = document.getElementById('badge-total-num');
    if (countEl) countEl.textContent = earnedSet.size;
    if (totalEl) totalEl.textContent = MAIN_BADGES.length;

    // ── Preview хэсэг (жижиг pill badge-ууд) ─────────────────
    const preview = document.getElementById('badges-preview');
    const summary = document.getElementById('badges-summary');

    if (preview) {
        preview.innerHTML = MAIN_BADGES.map(badge => {
            const isEarned = earnedSet.has(badge.name);
            return `
                <span
                    title="${badge.name}: ${badge.desc}"
                    style="
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 5px 13px;
                        border-radius: 20px;
                        font-size: 0.78rem;
                        font-weight: 600;
                        cursor: default;
                        transition: all 0.2s;
                        background: ${isEarned ? badge.bgColor  : '#f3f4f6'};
                        border: 1.5px solid ${isEarned ? badge.border : '#e5e7eb'};
                        color: ${isEarned ? badge.color : '#9ca3af'};
                        ${isEarned ? '' : 'filter: grayscale(1); opacity: 0.5;'}
                    "
                >
                    <i class="${badge.icon}"></i>
                    ${badge.name}
                </span>
            `;
        }).join('');
    }

    if (summary) {
        summary.textContent = `${earnedSet.size} / ${MAIN_BADGES.length} тэмдэг`;
    }

    // ── Offcanvas дэлгэрэнгүй жагсаалт ──────────────────────
    const fullList = document.getElementById('badges-full-list');
    if (!fullList) return;

    // Үндсэн badge-ууд
    let html = `<h6 class="fw-bold text-dark mt-2 mb-3" style="font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; color:#6b7280 !important;">Үндсэн амжилтууд</h6>`;

    html += MAIN_BADGES.map(badge => {
        const isEarned = earnedSet.has(badge.name);
        return `
            <div
                class="d-flex align-items-center gap-3 p-3 mb-2 rounded-3"
                style="
                    background: ${isEarned ? badge.bgColor : '#f9fafb'};
                    border: 1.5px solid ${isEarned ? badge.border : '#f3f4f6'};
                    ${isEarned ? '' : 'opacity: 0.5;'}
                    transition: all 0.2s;
                "
            >
                <div style="
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: ${isEarned ? badge.border + '33' : '#e5e7eb'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <i class="${badge.icon}" style="font-size:1.2rem; color:${isEarned ? badge.color : '#9ca3af'};"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold" style="font-size:0.88rem; color:${isEarned ? badge.color : '#9ca3af'};">${badge.name}</div>
                    <div style="font-size:0.73rem; color:#9ca3af;">${badge.desc}</div>
                </div>
                <div>
                    ${isEarned
                        ? `<i class="fa-solid fa-circle-check" style="color:${badge.color}; font-size:1.2rem;"></i>`
                        : `<i class="fa-solid fa-lock" style="color:#d1d5db; font-size:1rem;"></i>`
                    }
                </div>
            </div>
        `;
    }).join('');

    // Сарын тусгай badge-ууд — тусдаа хэсэг
    html += `
        <hr class="my-3">
        <h6 class="fw-bold mb-3" style="font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; color:#6b7280;">Сарын дүгнэлт</h6>
    `;

    html += MONTHLY_BADGES.map(badge => `
        <div
            class="d-flex align-items-center gap-3 p-3 mb-2 rounded-3"
            style="background: #0f172a; border: 1.5px solid ${badge.border}33;"
        >
            <div style="
                width: 42px;
                height: 42px;
                border-radius: 12px;
                background: ${badge.border}22;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            ">
                <i class="${badge.icon}" style="font-size:1.2rem; color:${badge.color};"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-bold" style="font-size:0.88rem; color:${badge.color};">${badge.name}</div>
                <div style="font-size:0.73rem; color:#64748b;">${badge.desc}</div>
            </div>
            <span style="font-size:0.7rem; color:#64748b; background:#1e293b; padding:3px 8px; border-radius:10px;">Авто</span>
        </div>
    `).join('');

    fullList.innerHTML = html;
}
